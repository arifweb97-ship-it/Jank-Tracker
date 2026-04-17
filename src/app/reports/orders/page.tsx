"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Loader2, ShoppingCart, ShoppingBag, XCircle, CheckCircle2, ChevronLeft, ChevronRight, PieChart, UploadCloud, DollarSign, Clock } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { OrderImportModal } from "@/components/order-import-modal";

interface OrderMetric {
  date: string;
  created: number;
  completed: number;
  cancelled: number;
  createdComm: number;
  completedComm: number;
  cancelledComm: number;
  metaSpend: number;
}

export default function OrderReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OrderMetric[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchOrderMetrics = async () => {
    setLoading(true);
      try {
        if (!user?.id) return;
        const { data: records } = await supabase
          .from("daily_records")
          .select("date, source, category, orders, commission, spend")
          .eq("user_id", user.id)
          .in("category", ["shopee_orders", "meta"]);

        if (records) {
          const map: Record<string, OrderMetric> = {};

          records.forEach(r => {
            if (!map[r.date]) {
              map[r.date] = { date: r.date, created: 0, completed: 0, cancelled: 0, createdComm: 0, completedComm: 0, cancelledComm: 0, metaSpend: 0 };
            }

            if (r.category === "meta") {
              map[r.date].metaSpend += (Number(r.spend) || 0);
            } else if (r.category === "shopee_orders") {
               const c = Number(r.commission) || 0;
               if (r.source.includes("Dipesan")) { map[r.date].created += (Number(r.orders) || 0); map[r.date].createdComm += c; }
               else if (r.source.includes("Selesai")) { map[r.date].completed += (Number(r.orders) || 0); map[r.date].completedComm += c; }
               else if (r.source.includes("Dibatalkan")) { map[r.date].cancelled += (Number(r.orders) || 0); map[r.date].cancelledComm += c; }
            }
          });

          const formatted = Object.values(map)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          setData(formatted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchOrderMetrics();
  }, [user]);

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    if (!search) return data;
    return data.filter(d => d.date.includes(search));
  }, [data, search]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalCreated = useMemo(() => data.reduce((acc, curr) => acc + curr.created, 0), [data]);
  const totalCompleted = useMemo(() => data.reduce((acc, curr) => acc + curr.completed, 0), [data]);
  const totalCancelled = useMemo(() => data.reduce((acc, curr) => acc + curr.cancelled, 0), [data]);
  const totalPending = totalCreated - totalCompleted - totalCancelled;

  const totalCreatedComm = useMemo(() => data.reduce((acc, curr) => acc + curr.createdComm, 0), [data]);
  const totalCompletedComm = useMemo(() => data.reduce((acc, curr) => acc + curr.completedComm, 0), [data]);
  const totalCancelledComm = useMemo(() => data.reduce((acc, curr) => acc + curr.cancelledComm, 0), [data]);
  const totalPendingComm = totalCreatedComm - totalCompletedComm - totalCancelledComm;

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  const getCompletionRate = () => {
    if (totalCreated === 0) return 0;
    return ((totalCompleted / totalCreated) * 100).toFixed(1);
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-black selection:bg-[#C50337]/30">
        <TopBar 
          title="Shopee Order Tracking"
          description="Detailed order status analytics & fulfillment monitoring."
          action={
            <div className="flex items-center gap-2 md:gap-3">
              <button 
                onClick={() => setIsUploadOpen(true)}
                className="bg-[#C50337] hover:bg-[#a00028] text-white px-3 md:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#C50337]/20 flex items-center gap-2 transition-all active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Sync</span>
              </button>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#C50337] transition-all duration-300" />
                <input 
                  type="text" 
                  placeholder="Search Date..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl pl-9 md:pl-10 pr-3 md:pr-4 py-2 text-[10px] md:text-[11px] text-white focus:outline-none focus:border-[#C50337]/50 w-32 sm:w-48 md:w-64 transition-all font-bold placeholder:text-slate-600 shadow-2xl"
                />
              </div>
            </div>
          }
        />

        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 bg-slate-950/20 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl">
              <div className="relative">
                 <Loader2 className="w-12 h-12 animate-spin text-[#C50337]" />
                 <div className="absolute inset-0 blur-xl bg-[#C50337]/20 scale-150 animate-pulse" />
              </div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-6 opacity-80">Synchronizing Order Node...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 space-y-6 md:space-y-8">
              
              {/* KPI ROW - EXEC DASHBOARD */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                 {[
                   { label: "Total Dipesan", value: totalCreated.toLocaleString(), icon: ShoppingBag, color: "#3b82f6", trend: "Volume" },
                   { label: "Pesanan Selesai", value: totalCompleted.toLocaleString(), icon: CheckCircle2, color: "#10b981", trend: "Settled" },
                   { label: "Pesanan Pending", value: totalPending.toLocaleString(), icon: Clock, color: "#f59e0b", trend: "Waiting" },
                   { label: "Dibatalkan", value: totalCancelled.toLocaleString(), icon: XCircle, color: "#f43f5e", trend: "Failed" },
                   { label: "Completion Rate", value: `${getCompletionRate()}%`, icon: PieChart, color: "#eab308", trend: "Success Info" },
                 ].map((stat, i) => (
                   <div key={i} className={`group relative overflow-hidden bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#C50337]/40 ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <stat.icon className="w-12 h-12 md:w-16 md:h-16" />
                      </div>
                       <div className="relative z-10 space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="p-2 rounded-lg md:rounded-xl bg-slate-950/40 border border-white/5 group-hover:bg-[#C50337]/10 transition-colors" style={{ color: stat.color }}>
                                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                             </div>
                             <div className="text-[7px] md:text-[8px] bg-white/5 px-1.5 md:px-2 py-0.5 md:py-1 rounded font-black uppercase text-slate-500 tracking-widest">{stat.trend}</div>
                          </div>
                          <div className="flex flex-col space-y-1 md:space-y-2">
                             <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-60 leading-none">{stat.label}</span>
                             <div className="text-sm md:text-xl font-black text-white tracking-tighter leading-none truncate pr-2">
                                {stat.value}
                             </div>
                          </div>
                       </div>
                   </div>
                 ))}
              </div>

              {/* COMMISSION ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                 {[
                   { label: "Potensi Komisi (Dipesan)", value: formatCurrency(totalCreatedComm), icon: DollarSign, color: "#3b82f6", trend: "Estimated" },
                   { label: "Komisi Selesai (Settled)", value: formatCurrency(totalCompletedComm), icon: DollarSign, color: "#10b981", trend: "Secured" },
                   { label: "Komisi Pending (Waiting)", value: formatCurrency(totalPendingComm), icon: Clock, color: "#f59e0b", trend: "Pending" },
                   { label: "Komisi Dibatalkan (Failed)", value: formatCurrency(totalCancelledComm), icon: DollarSign, color: "#f43f5e", trend: "Lost" },
                 ].map((stat, i) => (
                   <div key={i} className="group relative overflow-hidden bg-[#C50337]/5 backdrop-blur-2xl border border-[#C50337]/10 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(197,3,55,0.05)] transition-all duration-500 hover:border-[#C50337]/40 hover:bg-[#C50337]/10">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity text-[#C50337]">
                         <stat.icon className="w-12 h-12 md:w-16 md:h-16" />
                      </div>
                       <div className="relative z-10 space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="p-2 rounded-lg md:rounded-xl bg-slate-950/40 border border-white/5" style={{ color: stat.color }}>
                                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                             </div>
                             <div className="text-[7px] md:text-[8px] bg-[#C50337]/20 text-[#C50337] px-1.5 md:px-2 py-0.5 md:py-1 rounded font-black uppercase tracking-widest">{stat.trend}</div>
                          </div>
                          <div className="flex flex-col space-y-1 md:space-y-2">
                             <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-80 leading-none">{stat.label}</span>
                             <div className="text-xl md:text-2xl font-black text-white tracking-tighter leading-none truncate pr-2">
                                {stat.value}
                             </div>
                          </div>
                       </div>
                   </div>
                 ))}
              </div>

              {/* MAIN DATA FEED */}
              <div className="grid grid-cols-1">
                 {/* DESKTOP TABLE */}
                 <div className="hidden md:flex flex-col bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden h-auto pb-4">
                    <div className="px-6 py-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center group">
                       <div className="flex items-center gap-3">
                          <ShoppingCart className="w-3.5 h-3.5 text-[#C50337]" />
                          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Daily Fulfillment Matrix</h3>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-[#C50337] bg-[#C50337]/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Order Ledger</span>
                       </div>
                    </div>
                    
                    <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide min-h-[400px]">
                       <table className="w-full text-left">
                          <thead className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md">
                             <tr className="border-b border-white/5">
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest pl-4 whitespace-nowrap">Tanggal</th>
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap">Dipesan</th>
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap">Tertunda</th>
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap">Selesai</th>
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center whitespace-nowrap">Dibatalkan</th>
                                <th className="p-3 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right pr-4 whitespace-nowrap">Net Profit Cair</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-[11px]">
                             {paginatedData.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-20 text-center text-slate-500 font-black tracking-widest text-[10px] uppercase">
                                    No data found. Sync Shopee Affiliate CSV to populate.
                                  </td>
                                </tr>
                             ) : paginatedData.map((row) => (
                                <tr key={row.date} className="hover:bg-white/[0.03] transition-all duration-300 group cursor-default">
                                   <td className="p-3 pl-4">
                                      <div className="flex items-center gap-2">
                                         <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-[#C50337] transition-all" />
                                         <span className="font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform whitespace-nowrap">{row.date}</span>
                                      </div>
                                   </td>
                                   <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                         <span className="text-white font-bold bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 whitespace-nowrap min-w-[2.5rem] text-center">{row.created.toLocaleString()}</span>
                                         <span className="text-[11px] text-blue-400 font-black tracking-wider w-20 text-left whitespace-nowrap">{formatCurrency(row.createdComm)}</span>
                                      </div>
                                   </td>
                                   <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                         <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap min-w-[2.5rem] text-center">{(row.created - row.completed - row.cancelled).toLocaleString()}</span>
                                         <span className="text-[11px] text-amber-400 font-black tracking-wider w-20 text-left whitespace-nowrap">{formatCurrency(row.createdComm - row.completedComm - row.cancelledComm)}</span>
                                      </div>
                                   </td>
                                   <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                         <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 whitespace-nowrap min-w-[2.5rem] text-center">{row.completed.toLocaleString()}</span>
                                         <span className="text-[11px] text-emerald-400 font-black tracking-wider w-20 text-left whitespace-nowrap">{formatCurrency(row.completedComm)}</span>
                                      </div>
                                   </td>
                                   <td className="p-3">
                                      <div className="flex items-center justify-center gap-2">
                                         <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 whitespace-nowrap min-w-[2.5rem] text-center">{row.cancelled.toLocaleString()}</span>
                                         <span className="text-[11px] text-rose-400 font-black tracking-wider w-20 text-left whitespace-nowrap">{formatCurrency(row.cancelledComm)}</span>
                                      </div>
                                   </td>
                                   <td className="p-3 pr-4">
                                      <div className="flex flex-col items-end gap-1">
                                         {(() => {
                                           const netProfit = row.completedComm - row.metaSpend;
                                           return (
                                              <>
                                                <span className={`text-[12px] font-black tracking-wider whitespace-nowrap ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                   {netProfit > 0 ? "+" : ""}{formatCurrency(netProfit)}
                                                </span>
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                   Spend: {formatCurrency(row.metaSpend)}
                                                </span>
                                              </>
                                           );
                                         })()}
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 {/* MOBILE CARD VIEW */}
                 <div className="md:hidden space-y-4">
                    <div className="flex items-center justify-between px-2 mb-2">
                       <div className="flex items-center gap-2">
                          <ShoppingCart className="w-3 h-3 text-[#C50337]" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fulfillment List</span>
                       </div>
                       <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Records</span>
                    </div>
                    {paginatedData.map((row) => (
                       <div key={row.date} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 space-y-4 group active:scale-[0.98] transition-all">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-white tracking-tight truncate">{row.date}</span>
                             </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 mt-2">
                             <div className="flex flex-col items-center p-2 bg-blue-500/5 rounded-xl border border-blue-500/10">
                                <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Dipesan</span>
                                <span className="text-[10px] font-black text-white">{row.created.toLocaleString()}</span>
                                <span className="text-[7px] font-bold text-blue-400 mt-1">{formatCurrency(row.createdComm)}</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                <span className="text-[7px] font-black text-amber-500 uppercase tracking-widest mb-0.5">Tertunda</span>
                                <span className="text-[10px] font-black text-white">{(row.created - row.completed - row.cancelled).toLocaleString()}</span>
                                <span className="text-[7px] font-bold text-amber-400 mt-1">{formatCurrency(row.createdComm - row.completedComm - row.cancelledComm)}</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Selesai</span>
                                <span className="text-[10px] font-black text-white">{row.completed.toLocaleString()}</span>
                                <span className="text-[7px] font-bold text-emerald-400 mt-1">{formatCurrency(row.completedComm)}</span>
                             </div>
                             <div className="flex flex-col items-center p-2 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Batal</span>
                                <span className="text-[10px] font-black text-white">{row.cancelled.toLocaleString()}</span>
                                <span className="text-[7px] font-bold text-rose-400 mt-1">{formatCurrency(row.cancelledComm)}</span>
                             </div>
                          </div>
                          
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex items-center justify-between mt-3">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net Profit Cair:</span>
                             <div className="flex flex-col items-end">
                                {(() => {
                                  const netProfit = row.completedComm - row.metaSpend;
                                  return (
                                     <>
                                       <span className={`text-[12px] font-black tracking-tight ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                          {netProfit > 0 ? "+" : ""}{formatCurrency(netProfit)}
                                       </span>
                                       <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">
                                          Spend: {formatCurrency(row.metaSpend)}
                                       </span>
                                     </>
                                  );
                                })()}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>

                 {/* PAGINATION UI */}
                 {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-white/10 py-3 px-6 rounded-xl shadow-xl mt-4">
                       <div className="flex items-center gap-3">
                          <button 
                             onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                             disabled={currentPage === 1}
                             className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all shadow-lg active:scale-95"
                          >
                             <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-1.5">
                             {(() => {
                                const pages = [];
                                const maxVisible = 3;
                                
                                if (totalPages <= maxVisible) {
                                   for (let i = 1; i <= totalPages; i++) pages.push(i);
                                } else {
                                   let start = Math.max(1, currentPage - 1);
                                   let end = Math.min(totalPages, currentPage + 1);

                                   if (currentPage === 1) {
                                      end = 3;
                                   } else if (currentPage === totalPages) {
                                      start = totalPages - 2;
                                   }

                                   for (let i = start; i <= end; i++) {
                                      pages.push(i);
                                   }
                                   
                                   if (start > 1) {
                                      if (start > 2) pages.unshift("...");
                                      pages.unshift(1);
                                   }
                                   if (end < totalPages) {
                                      if (end < totalPages - 1) pages.push("...");
                                      pages.push(totalPages);
                                   }
                                }

                                return pages.map((p, i) => (
                                   p === "..." ? (
                                      <span key={`sep-${i}`} className="px-0.5 text-slate-700 font-black text-[10px]">...</span>
                                   ) : (
                                      <button
                                         key={`page-${p}`}
                                         onClick={() => setCurrentPage(p as number)}
                                         className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all border ${
                                            currentPage === p 
                                               ? "bg-[#C50337] border-transparent text-white shadow-lg shadow-[#C50337]/30" 
                                               : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                                         }`}
                                      >
                                         {p}
                                      </button>
                                   )
                                ));
                             })()}
                          </div>

                          <button 
                             onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                             disabled={currentPage === totalPages}
                             className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all shadow-lg active:scale-95"
                          >
                             <ChevronRight className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 )}
              </div>

            </div>
          )}
        </div>
      </div>
      
      <OrderImportModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={fetchOrderMetrics} 
      />
    </ProtectedRoute>
  );
}
