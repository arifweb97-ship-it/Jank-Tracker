"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, CheckCircle2, AlertCircle, Loader2, RefreshCw, Trash2, ShoppingCart } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { parse, format, isValid } from "date-fns";
import { useAuth } from "@/context/auth-context";

interface FileEntry {
  file: File;
}

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OrderImportModal({ isOpen, onClose, onSuccess }: OrderImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newEntries: FileEntry[] = files.map(file => ({ file }));
    setQueue(prev => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const cleanNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let str = String(val).trim();
    
    if (str.includes(',') && str.includes('.')) {
      const dotIndex = str.lastIndexOf('.');
      const commaIndex = str.lastIndexOf(',');
      if (commaIndex > dotIndex) {
        str = str.replace(/\./g, '').replace(/,/g, '.');
      } else {
        str = str.replace(/,/g, '');
      }
    } else if (str.includes(',')) {
      const parts = str.split(',');
      if (parts[1] && parts[1].length <= 2) {
        str = str.replace(/,/g, '.');
      } else {
        str = str.replace(/,/g, '');
      }
    }
    
    const cleanStr = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const cleanDate = (val: any): string | null => {
    if (!val) return null;
    let str = String(val).trim();
    
    // If it looks like a standard ISO timestamp (e.g. 2026-04-17 14:30:00), split by space
    if (str.match(/^\d{4}-\d{2}-\d{2}\s/)) {
      str = str.split(' ')[0];
    } else if (str.match(/^\d{2}\/\d{2}\/\d{4}\s/)) {
      str = str.split(' ')[0];
    }

    const formats = [
      "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd", "dd-MM-yyyy", 
      "MMM dd, yyyy", "dd MMM yyyy", "dd-MMM-yyyy", "yyyyMMdd", "MMMM dd, yyyy"
    ];
    
    for (const f of formats) {
      const d = parse(str, f, new Date());
      if (isValid(d)) return format(d, "yyyy-MM-dd");
    }
    
    // Fallback try standard JS Date parsing if date-fns formats missed it
    const jsDate = new Date(str);
    if (!isNaN(jsDate.getTime())) {
       return format(jsDate, "yyyy-MM-dd");
    }

    return null;
  };

  const getAliasValue = (row: any, aliases: string[]): any => {
    const keys = Object.keys(row);
    // 1st Pass: Exact Match
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase().trim());
      if (match) return row[match];
    }
    // 2nd Pass: Fuzzy Match
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()) || alias.toLowerCase().includes(k.toLowerCase()));
      if (match) return row[match];
    }
    return null;
  };

  const handleSync = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);
    setStatus(null);
    setCurrentProgress(0);

    const MASTER_ORDERS: Record<string, { created: number, createdComm: number, completed: number, completedComm: number, cancelled: number, cancelledComm: number, d: string }> = {};

    const DATE_ALIASES = ["Order Time", "Waktu Pesanan", "Date", "Tanggal"];
    const ORDER_ALIASES = ["Order ID", "Order id", "ID Pesanan", "Order No"];
    const STATUS_ALIASES = ["Order Status", "Status Pesanan", "Status"];
    const COMM_ALIASES = ["Affiliate Net Commission", "Total Order Commission", "Total Order Commission(Rp)", "Affiliate Net Commission(Rp)", "Komisi", "Estimated Commission", "Estimasi Komisi", "Net Commission", "Komisi Bersih", "Commission", "Net Sale"];
    const ITEM_COMM_ALIASES = ["Item Total Commission(Rp)", "Item Total Commission", "Estimasi Komisi Item"];

    const shopeeOrderFingerprints = new Set<string>();

    try {
      for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];
        await new Promise((resolve, reject) => {
          Papa.parse(entry.file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
              try {
                const data = results.data;
                if (data.length === 0) return resolve(true);

                // Detect if CSV has per-item commission column
                const hasItemComm = getAliasValue(data[0] || {}, ITEM_COMM_ALIASES) !== null;

                data.forEach((row: any) => {
                  const d = cleanDate(getAliasValue(row, DATE_ALIASES));
                  const orderId = getAliasValue(row, ORDER_ALIASES);
                  
                  if (d && orderId) {
                    const isNewOrder = !shopeeOrderFingerprints.has(String(orderId));
                    if (isNewOrder) {
                      shopeeOrderFingerprints.add(String(orderId));
                    }

                    const rawStatus = getAliasValue(row, STATUS_ALIASES);
                    // Use per-item commission for every row, or order-level only for the first row
                    let comm = 0;
                    if (hasItemComm) {
                      comm = cleanNumber(getAliasValue(row, ITEM_COMM_ALIASES));
                    } else if (isNewOrder) {
                      comm = cleanNumber(getAliasValue(row, COMM_ALIASES));
                    }

                    let mappedStatus = 'unpaid';
                    if (rawStatus) {
                      const s = String(rawStatus).toLowerCase();
                      if (s.includes('completed') || s.includes('selesai')) mappedStatus = 'completed';
                      else if (s.includes('cancelled') || s.includes('batal')) mappedStatus = 'cancelled';
                    }
                    MASTER_ORDERS[d] = MASTER_ORDERS[d] || { d, created: 0, createdComm: 0, completed: 0, completedComm: 0, cancelled: 0, cancelledComm: 0 };
                    if (isNewOrder) MASTER_ORDERS[d].created += 1;
                    MASTER_ORDERS[d].createdComm += comm;
                    
                    if (mappedStatus === 'completed') {
                      if (isNewOrder) MASTER_ORDERS[d].completed += 1;
                      MASTER_ORDERS[d].completedComm += comm;
                    }
                    if (mappedStatus === 'cancelled') {
                      if (isNewOrder) MASTER_ORDERS[d].cancelled += 1;
                      MASTER_ORDERS[d].cancelledComm += comm;
                    }
                  }
                });
                
                resolve(true);
              } catch (innerErr) {
                reject(innerErr);
              }
            },
            error: (err) => reject(err)
          });
        });
        setCurrentProgress(((i + 1) / queue.length) * 100);
      }

      const totalParsedDates = Object.keys(MASTER_ORDERS).length;
      if (totalParsedDates === 0) {
        throw new Error("No order data matched. Please check your CSV headers (e.g., 'Order Status', 'Order Time').");
      }

      if (Object.keys(MASTER_ORDERS).length > 0) {
        const orderRows: any[] = [];
        Object.values(MASTER_ORDERS).forEach(val => {
          if (val.created > 0) {
            orderRows.push({
               date: val.d, category: "shopee_orders", source: "Status >>> Dipesan", orders: val.created, commission: Number(val.createdComm.toFixed(2)), updated_at: new Date().toISOString(), user_id: user?.id
            });
            orderRows.push({
               date: val.d, category: "shopee_orders", source: "Status >>> Selesai", orders: val.completed, commission: Number(val.completedComm.toFixed(2)), updated_at: new Date().toISOString(), user_id: user?.id
            });
            orderRows.push({
               date: val.d, category: "shopee_orders", source: "Status >>> Dibatalkan", orders: val.cancelled, commission: Number(val.cancelledComm.toFixed(2)), updated_at: new Date().toISOString(), user_id: user?.id
            });
          }
        });
        
        // Only delete orders for the dates present in the uploaded files
        const { error: delErr } = await supabase.from("daily_records").delete().in("date", Object.keys(MASTER_ORDERS)).eq("category", "shopee_orders").eq("user_id", user?.id);
        if (delErr) throw new Error(`Orders Delete Error: ${delErr.message}`);
        
        if (orderRows.length > 0) {
          const { error: insErr } = await supabase.from("daily_records").insert(orderRows);
          if (insErr) throw new Error(`Orders Insert Error: ${insErr.message}`);
        }
      }
      
      // Cleanup zero metric rows specifically for shopee_orders
      await supabase.from("daily_records").delete()
        .in("date", Object.keys(MASTER_ORDERS))
        .eq("category", "shopee_orders")
        .eq("orders", 0)
        .eq("user_id", user?.id);
      
      setStatus({ type: "success", message: `Fulfillment Sync Completed: Processed ${totalParsedDates} days of data.` });
      setQueue([]);
      
      if (onSuccess) onSuccess();
      setTimeout(() => { onClose(); setStatus(null); }, 2000);
    } catch (e: any) {
      console.error(e);
      setStatus({ type: "error", message: e.message || "Unknown error during sync." });
    } finally {
      setIsUploading(false);
      setCurrentProgress(100);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
      <div className="bg-slate-900 border border-t-[#C50337]/30 border-x-white/5 border-b-white/5 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className={`w-4 h-4 text-[#C50337] ${isUploading ? 'animate-pulse' : ''}`} />
            <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Order Status Isolator</h2>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4 text-slate-500 hover:text-[#C50337]" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
          <div className="group border-2 border-dashed border-white/5 rounded-2xl p-6 flex items-center justify-center gap-4 bg-slate-950/30 relative hover:border-[#C50337]/50 transition-all cursor-pointer">
            <input type="file" multiple accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-[#C50337]" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Upload Shopee Order CSV</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Strictly updates Order metrics</p>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Order Queue ({queue.length})</span>
                 <span className="text-[8px] font-black text-rose-500 uppercase cursor-pointer hover:underline" onClick={() => setQueue([])}>Clear Queue</span>
              </div>
              
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-2 scrollbar-hide">
                {queue.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col min-w-0 pr-4">
                          <span className="text-[10px] font-bold text-white truncate">{entry.file.name}</span>
                          <span className="text-[7px] font-black uppercase text-slate-500 mt-1">Pending Parsing</span>
                       </div>
                       <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-rose-500/20 rounded-lg group transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-rose-800 group-hover:text-rose-500" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2 py-4">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-[#C50337] transition-all duration-300" style={{ width: `${currentProgress}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Mapping Orders...</p>
                <p className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{Math.round(currentProgress)}%</p>
              </div>
            </div>
          )}

          {status && (
            <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
              status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />}
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{status.type === 'success' ? 'Success' : 'Error'}</p>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{status.message}</p>
              </div>
            </div>
          )}

          <button 
            disabled={isUploading || queue.length === 0}
            onClick={handleSync}
            className="w-full h-12 bg-[#C50337] hover:bg-[#a00028] disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#C50337]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <RefreshCw className="w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500" />
            )}
            <span>{isUploading ? 'Parsing Orders...' : 'Sync Orders'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
