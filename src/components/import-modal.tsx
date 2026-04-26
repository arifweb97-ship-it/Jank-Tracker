"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, CheckCircle2, AlertCircle, Loader2, RefreshCw, Trash2, ShieldCheck, Zap } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { parse, format, isValid } from "date-fns";
import { useAuth } from "@/context/auth-context";

interface FileEntry {
  file: File;
  type: "meta" | "shopee";
  fee: number;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
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

  const detectType = (filename: string, headers?: string): "meta" | "shopee" => {
    const name = filename.toLowerCase();
    const h = headers?.toLowerCase() || "";
    
    // 🛡️ Aggressive Meta Detection
    const metaMarkers = ["facebook", "ads", "meta", "spent", "reseller", "campaign", "hans", "arief", "pengeluaran", "biaya"];
    const isMeta = metaMarkers.some(m => name.includes(m)) || h.includes("spent") || h.includes("pengeluaran") || h.includes("clicks");
    
    if (isMeta) return "meta";
    return "shopee";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newEntries: FileEntry[] = files.map(file => {
      const type = detectType(file.name);
      return { file, type, fee: type === "meta" ? 5 : 0 };
    });
    setQueue(prev => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const toggleType = (index: number) => {
    setQueue(prev => {
      const next = [...prev];
      const newType = next[index].type === "meta" ? "shopee" : "meta";
      next[index].type = newType;
      next[index].fee = newType === "meta" ? 5 : 0;
      return next;
    });
  };

  const updateFee = (index: number, fee: number) => {
    setQueue(prev => {
      const next = [...prev];
      next[index].fee = fee;
      return next;
    });
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
    // 1st Pass: Exact Match (Best Practice)
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase().trim());
      if (match) return row[match];
    }
    // 2nd Pass: Fuzzy Match (Partial)
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()) || alias.toLowerCase().includes(k.toLowerCase()));
      if (match) return row[match];
    }
    return null;
  };

  const normalizeTag = (val: any): string => {
    if (!val) return "Other";
    let str = String(val).trim();
    str = str.replace(/[^a-zA-Z0-9]+$/, '');
    return str.replace(/\s+/g, ' ').trim() || "Other";
  };

  const handleSync = async () => {
    if (queue.length === 0) return;
    setIsUploading(true);
    setStatus(null);
    setCurrentProgress(0);

    const MASTER_META: Record<string, { s: number, c: number, d: string, camp: string }> = {};
    const MASTER_COMM: Record<string, { amount: number, orders: number, d: string, tag: string, source: string }[]> = {};
    const MASTER_CLICKS: Record<string, { source: string, tag: string, count: number }[]> = {};

    const DATE_ALIASES = ["Order Time", "Waktu Pesanan", "Click Time", "Waktu Klik", "Tanggal Klik", "Date", "Tanggal", "Reporting Start", "Reporting start", "Day", "Waktu", "Day of Week", "Reporting period"];
    const CLICK_ALIASES = ["Click id", "Clicks", "Klik", "Jumlah Klik", "Total Clicks", "Total Klik", "Measured Clicks", "Results", "Link clicks", "Click", "Klik Link", "Outbound clicks", "Inbound clicks", "Unique Clicks"];
    const COMM_ALIASES = ["Affiliate Net Commission", "Total Order Commission", "Total Order Commission(Rp)", "Affiliate Net Commission(Rp)", "Komisi", "Estimated Commission", "Estimasi Komisi", "Net Commission", "Komisi Bersih", "Commission", "Net Sale"];
    const ORDER_ALIASES = ["Click id", "Order ID", "Order id", "ID Pesanan", "Conversion id", "Order No", "Click ID", "ID Klik", "ID Konversi", "Reference ID"];
    const TAG_ALIASES = ["Tag_link", "Tag_link1", "Link Name", "Tag Link", "Custom Link", "Sub ID", "Sub_id1", "Tag", "Search term", "Ad Name", "Ad set Name", "Nama Link", "Subid", "Sub_id"];
    const PLATFORM_ALIASES = ["Referrer", "Channel", "Saluran", "Placement", "Site Source Name", "Site", "Sumber", "Platform", "Device"];
    const SPENT_ALIASES = ["Amount spent", "Spent", "Pengeluaran", "Biaya", "Cost", "Total Spent", "Meta Spent"];
    const CAMP_ALIASES = ["Campaign Name", "Campaign", "Kampanye", "Ad Name", "Campaign name", "Kampanye Meta"];

    const shopeeCommFingerprints = new Set<string>();
    const shopeeClickFingerprints = new Set<string>();

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
                const headers = Object.keys(data[0] || {});
                const h = headers.join(",").toLowerCase();

                let actualType = entry.type;
                if (actualType === "shopee" && (h.includes("spent") || h.includes("pengeluaran") || h.includes("biaya"))) {
                  actualType = "meta";
                }

                if (actualType === "meta") {
                  const fact = 1 + (entry.fee / 100);
                  data.forEach((row: any) => {
                    const d = cleanDate(getAliasValue(row, DATE_ALIASES));
                    const campaign = normalizeTag(getAliasValue(row, CAMP_ALIASES) || "Default");
                    const sRaw = cleanNumber(getAliasValue(row, SPENT_ALIASES));
                    const cRaw = cleanNumber(getAliasValue(row, CLICK_ALIASES));
                    if (d) {
                      const key = `${d}|${campaign}`;
                      const current = MASTER_META[key] || { s: -1, c: 0, d: d, camp: campaign };
                      const finalSpend = sRaw * fact;
                      if (finalSpend > current.s) {
                        MASTER_META[key] = { s: finalSpend, c: Math.round(cRaw), d: d, camp: campaign };
                      }
                    }
                  });
                } else {
                  // 🛡️ Skip Order Status CSVs to prevent them from inflating commissions.
                  // Order CSVs must be uploaded in the dedicated Order Reports page.
                  const isOrderReport = (h.includes("order status") || h.includes("status pesanan") || h.includes("waktu pesanan")) && !(h.includes("commission") || h.includes("komisi"));
                  
                  if (!isOrderReport) {
                    const isComm = h.includes("order") || h.includes("commission") || h.includes("komisi") || h.includes("estimasi");
                    if (isComm) {
                    const hasItemComm = getAliasValue(data[0] || {}, ["Item Total Commission(Rp)", "Item Total Commission", "Estimasi Komisi", "Estimated Commission"]) !== null;
                    data.forEach((row: any) => {
                      const d = cleanDate(getAliasValue(row, DATE_ALIASES));
                      const orderId = getAliasValue(row, ORDER_ALIASES);
                      
                      let technical = getAliasValue(row, PLATFORM_ALIASES) || "Others";
                      let tag = normalizeTag(getAliasValue(row, TAG_ALIASES) || "Shopee");
                      
                      if (["facebook", "fb", "instagram", "ig", "threads", "google", "youtube", "yt", "tiktok", "shopee", "untagged", "default", "others", "other"].includes(tag.toLowerCase())) {
                        tag = "Other";
                      }
                      
                      if (d && orderId) {
                        const isNewOrder = !shopeeCommFingerprints.has(String(orderId));
                        if (isNewOrder) {
                          shopeeCommFingerprints.add(String(orderId));
                        }
                        
                        let rowComm = 0;
                        if (hasItemComm) {
                          rowComm = cleanNumber(getAliasValue(row, ["Item Total Commission(Rp)", "Item Total Commission", "Estimasi Komisi", "Estimated Commission"]));
                        } else {
                          if (isNewOrder) {
                            rowComm = cleanNumber(getAliasValue(row, COMM_ALIASES));
                          }
                        }

                        MASTER_COMM[d] = MASTER_COMM[d] || [];
                        const existing = MASTER_COMM[d].find(x => x.tag === tag && x.source === technical);
                        
                        if (existing) { 
                          existing.amount += rowComm; 
                          if (isNewOrder) existing.orders += 1; 
                        } else { 
                          MASTER_COMM[d].push({ amount: rowComm, orders: isNewOrder ? 1 : 0, d, tag, source: technical }); 
                        }
                      }
                    });
                  }
                  
                  const hasClickId = getAliasValue(data[0] || {}, ["Click id", "Click ID"]) !== null;
                  const hasClickCol = getAliasValue(data[0] || {}, CLICK_ALIASES) !== null;
                  if (hasClickCol || hasClickId) {
                    data.forEach((row: any) => {
                      const d = cleanDate(getAliasValue(row, DATE_ALIASES));
                      if (!d) return;
                      let technical = getAliasValue(row, PLATFORM_ALIASES) || "Others";
                      const lowerTech = technical.toLowerCase();
                      if (lowerTech.includes("threads")) technical = "Threads";
                      else if (lowerTech.includes("fb") || lowerTech.includes("facebook")) technical = "Facebook";
                      else if (lowerTech.includes("ig") || lowerTech.includes("instagram")) technical = "Instagram";
                      else if (lowerTech.includes("yt") || lowerTech.includes("youtube")) technical = "YouTube";
                      else if (lowerTech.includes("tiktok")) technical = "TikTok";
                      else if (lowerTech.includes("google")) technical = "Google";

                      let businessTag = normalizeTag(getAliasValue(row, TAG_ALIASES));
                      if (!businessTag || businessTag === "Other") businessTag = "Other";

                      const clickCount = 1; 
                      const clickId = getAliasValue(row, ORDER_ALIASES);
                      
                      if (clickId && shopeeClickFingerprints.has(String(clickId))) return;
                      if (clickId) shopeeClickFingerprints.add(String(clickId));
                      
                      MASTER_CLICKS[d] = MASTER_CLICKS[d] || [];
                      const existing = MASTER_CLICKS[d].find(x => x.source === technical && x.tag === businessTag);
                      if (existing) {
                        existing.count += clickCount;
                      } else {
                        MASTER_CLICKS[d].push({ source: technical, tag: businessTag, count: clickCount });
                      }
                    });
                  }
                } // End of if (!isOrderReport)
                }
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

      const allDates = Array.from(new Set([
        ...Object.keys(MASTER_COMM), 
        ...Object.keys(MASTER_CLICKS), 
        ...Object.values(MASTER_META).map(v => v.d)
      ]));
      
      const totalParsed = Object.keys(MASTER_META).length + Object.keys(MASTER_COMM).length + Object.keys(MASTER_CLICKS).length;
      if (totalParsed === 0) {
        throw new Error("No data matched. Please check your CSV headers (e.g., 'Spent', 'Date', 'Commission').");
      }

      if (Object.keys(MASTER_META).length > 0) {
        const { error: delErr } = await supabase.from("daily_records").delete().in("date", Object.values(MASTER_META).map(v => v.d)).eq("category", "meta").eq("user_id", user?.id);
        if (delErr) throw new Error(`Meta Delete Error: ${delErr.message}`);
        
        const metaBatch = Object.values(MASTER_META)
          .filter(val => val.s > 0 || val.c > 0) // 🛡️ Filter Zero Metrics
          .map(val => ({
            date: val.d, category: "meta", source: `Meta Ads >>> ${val.camp}`, spend: Number(val.s.toFixed(2)), clicks: val.c, updated_at: new Date().toISOString(), user_id: user?.id
          }));
        
        if (metaBatch.length > 0) {
          const { error: insErr } = await supabase.from("daily_records").insert(metaBatch);
          if (insErr) throw new Error(`Meta Insert Error: ${insErr.message}`);
        }
      }

      if (Object.keys(MASTER_COMM).length > 0) {
        const commRows: any[] = [];
        Object.values(MASTER_COMM).forEach(group => group.forEach(val => {
          if (val.amount > 0 || val.orders > 0) { // 🛡️ Filter Zero Metrics
            commRows.push({
              date: val.d, category: "shopee_comm", source: `${val.source} >>> ${val.tag}`, commission: Number(val.amount.toFixed(2)), orders: val.orders, updated_at: new Date().toISOString(), user_id: user?.id
            });
          }
        }));
        const { error: delErr } = await supabase.from("daily_records").delete().in("date", Object.keys(MASTER_COMM)).eq("category", "shopee_comm").eq("user_id", user?.id);
        if (delErr) throw new Error(`Comm Delete Error: ${delErr.message}`);
        
        if (commRows.length > 0) {
          const { error: insErr } = await supabase.from("daily_records").insert(commRows);
          if (insErr) throw new Error(`Comm Insert Error: ${insErr.message}`);
        }
      }

      if (Object.keys(MASTER_CLICKS).length > 0) {
        const clickRows: any[] = [];
        Object.entries(MASTER_CLICKS).forEach(([d, list]) => list.forEach(val => {
          if (val.count > 0) { // 🛡️ Filter Zero Metrics
            clickRows.push({
              date: d, category: "shopee_click", source: `${val.source} >>> ${val.tag}`, clicks: val.count, updated_at: new Date().toISOString(), user_id: user?.id
            });
          }
        }));
        const { error: delErr } = await supabase.from("daily_records").delete().in("date", Object.keys(MASTER_CLICKS)).eq("category", "shopee_click").eq("user_id", user?.id);
        if (delErr) throw new Error(`Click Delete Error: ${delErr.message}`);

        if (clickRows.length > 0) {
          const { error: insErr } = await supabase.from("daily_records").insert(clickRows);
          if (insErr) throw new Error(`Click Insert Error: ${insErr.message}`);
        }
      }
      
      // 💿 FINAL HOUSEKEEPING: Purge any remnants of zero-metric rows for the sync dates
      await supabase.from("daily_records").delete()
        .in("date", allDates)
        .eq("spend", 0)
        .eq("commission", 0)
        .eq("clicks", 0)
        .eq("orders", 0)
        .eq("user_id", user?.id);
      
      setStatus({ type: "success", message: `Integrity Sync Completed: ${totalParsed} data clusters processed.` });
      setQueue([]);
      
      // Notify parent to refresh data
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
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 text-emerald-500 ${isUploading ? 'animate-spin' : ''}`} />
            <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Universal Power Sync v42</h2>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
          <div className="group border-2 border-dashed border-white/5 rounded-2xl p-6 flex items-center justify-center gap-4 bg-slate-950/30 relative hover:border-blue-500/50 transition-all cursor-pointer">
            <input type="file" multiple accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Drop All CSV Sources Here</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Automated Bulk Data Integration</p>
            </div>
          </div>

          {queue.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Processing Queue ({queue.length})</span>
                <span className="text-[8px] font-black text-rose-500 uppercase cursor-pointer hover:underline" onClick={() => setQueue([])}>Clear Queue</span>
              </div>
              
              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-2 scrollbar-hide">
                {queue.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3 hover:bg-white/[0.02] transition-colors">
                    <div className="grid grid-cols-12 items-center gap-4">
                      <div className="col-span-5 flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-white truncate">{entry.file.name}</span>
                        <button 
                          onClick={() => toggleType(idx)}
                          className={`w-fit mt-1 text-[7px] font-black uppercase px-2 py-0.5 rounded border transition-all ${
                            entry.type === 'meta' 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                              : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }`}
                        >
                          {entry.type === 'meta' ? 'META ADS' : 'SHOPEE AFFILIATE'}
                        </button>
                      </div>

                      <div className="col-span-6">
                        {entry.type === "meta" ? (
                          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-lg border border-white/5 w-fit ml-auto">
                            {[0, 5, 11].map((f) => (
                              <button
                                key={f}
                                onClick={() => updateFee(idx, f)}
                                className={`px-2.5 py-1 rounded text-[9px] font-black transition-all ${
                                  entry.fee === f 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                    : 'text-slate-600 hover:text-slate-300'
                                }`}
                              >
                                {f}%
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex justify-end pr-4">
                             <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Automatic Mapping...</span>
                          </div>
                        )}
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-rose-500/20 rounded-lg group transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-rose-800 group-hover:text-rose-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="space-y-2 py-4">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${currentProgress}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Syncing Integrity...</p>
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
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing Bulk Sync...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                <span>Commit {queue.length} Files to Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
