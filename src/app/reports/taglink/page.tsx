"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Tag, Loader2, TrendingUp, DollarSign, MousePointerClick, ShoppingBag, ArrowUpRight, BarChart3, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from "recharts";
import { ProtectedRoute } from "@/components/protected-route";

interface TagMetric {
  tag: string;
  clicks: number;
  orders: number;
  commission: number;
}

export default function TaglinkReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TagMetric[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchTagMetrics() {
      setLoading(true);
      try {
        if (!user?.id) return;

        // Fetch daily_records
        let commCountQuery = supabase.from("daily_records").select('*', { count: 'exact', head: true }).eq("user_id", user.id).in("category", ["shopee_click", "shopee_comm"]);
        const { count: commCount } = await commCountQuery;
        let allRecords: any[] = [];
        if (commCount && commCount > 0) {
          const promises = [];
          for (let i = 0; i < commCount; i += 1000) {
            promises.push(supabase.from("daily_records").select("source, clicks, commission, orders, category").eq("user_id", user.id).in("category", ["shopee_click", "shopee_comm"]).range(i, i + 999));
          }
          const results = await Promise.all(promises);
          allRecords = results.flatMap(res => res.data || []);
        }

        // Fetch shopee_clicks table
        let clickCountQuery = supabase.from("shopee_clicks").select('*', { count: 'exact', head: true }).eq("user_id", user.id);
        const { count: clickCount } = await clickCountQuery;
        let allShopeeClicks: any[] = [];
        if (clickCount && clickCount > 0) {
          const promises = [];
          for (let i = 0; i < clickCount; i += 1000) {
            promises.push(supabase.from("shopee_clicks").select("tag_link").eq("user_id", user.id).range(i, i + 999));
          }
          const results = await Promise.all(promises);
          allShopeeClicks = results.flatMap(res => res.data || []);
        }

        const map: Record<string, TagMetric> = {};

        const normalizeTag = (val: string | null): string => {
          if (!val) return "Untagged";
          let str = String(val).trim();
          str = str.replace(/[^a-zA-Z0-9]+$/, '');
          return str.replace(/\s+/g, ' ').trim() || "Untagged";
        };

        allRecords.forEach(r => {
          const parts = (r.source || "").split(" >>> ");
          const tag = parts.length > 1 ? parts[1] : (parts[0] || "Untagged");
          const normTag = normalizeTag(tag);

          if (!map[normTag]) map[normTag] = { tag: normTag, clicks: 0, orders: 0, commission: 0 };
          if (r.category === "shopee_click") map[normTag].clicks += (Number(r.clicks) || 0);
          if (r.category === "shopee_comm") {
            map[normTag].commission += (Number(r.commission) || 0);
            map[normTag].orders += (Number(r.orders) || 0);
          }
        });

        allShopeeClicks.forEach(c => {
          const normTag = normalizeTag(c.tag_link);
          if (!map[normTag]) map[normTag] = { tag: normTag, clicks: 0, orders: 0, commission: 0 };
          map[normTag].clicks += 1;
        });

        const formatted = Object.values(map)
          .sort((a, b) => b.commission - a.commission);

        setData(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTagMetrics();
  }, [user]);

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    if (!search) return data;
    return data.filter(d => d.tag.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalComm = useMemo(() => data.reduce((acc, curr) => acc + curr.commission, 0), [data]);
  const totalOrders = useMemo(() => data.reduce((a, b) => a + b.orders, 0), [data]);
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-black selection:bg-[#C50337]/30">
        <TopBar 
          title="Taglink Financial Analysis"
          description="Shopee performance audit & attribution intelligence."
          action={
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#C50337] transition-all duration-300" />
                <input 
                  type="text" 
                  placeholder="Search Campaigns..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[11px] text-white focus:outline-none focus:border-[#C50337]/50 w-64 transition-all font-bold placeholder:text-slate-600 shadow-2xl"
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
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-6 opacity-80">Synchronizing Shopee Node...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 space-y-6 md:space-y-8">
              
              {/* KPI ROW - EXEC DASHBOARD */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                 {[
                   { label: "Net Commission", value: formatCurrency(totalComm), icon: DollarSign, color: "#10b981", trend: "7.2%" },
                   { label: "Top Product Tag", value: data[0]?.tag || "N/A", icon: Target, color: "#C50337", trend: "Hot" },
                   { label: "Shopee Orders", value: totalOrders.toLocaleString(), icon: ShoppingBag, color: "#f59e0b", trend: "Volume" },
                   { label: "Active Tags", value: data.length, icon: Tag, color: "#3b82f6", trend: "Live" },
                 ].map((stat, i) => (
                   <div key={i} className="group relative overflow-hidden bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#C50337]/40">
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

              {/* CHARTS + TABLE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                 
                 {/* CHART SIDEBAR */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl h-[350px] md:h-[400px] flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C50337]/50 to-transparent opacity-50" />
                       
                       <div className="flex items-center justify-between mb-6 md:mb-8">
                          <div className="flex items-center gap-3">
                             <BarChart3 className="w-4 h-4 text-emerald-500" />
                             <h3 className="text-[10px] font-black text-white uppercase tracking-widest opacity-80">Campaign Strength</h3>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
                       </div>

                       <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={filteredData.slice(0,6)} layout="vertical" margin={{ left: -30, right: 30 }}>
                                <defs>
                                   <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#10b981" />
                                      <stop offset="100%" stopColor="#3b82f6" />
                                   </linearGradient>
                                </defs>
                                <XAxis type="number" hide />
                                <YAxis 
                                   dataKey="tag" 
                                   type="category" 
                                   stroke="#64748b" 
                                   fontSize={8} 
                                   fontWeight="black" 
                                   width={70}
                                   tickFormatter={(v) => v.length > 10 ? v.substring(0, 8) + '..' : v}
                                />
                                <Tooltip 
                                   cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                                   contentStyle={{ 
                                      backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                      backdropFilter: 'blur(16px)',
                                      border: '1px solid rgba(255,255,255,0.05)', 
                                      borderRadius: '16px',
                                      boxShadow: '0 10px 40px -10px rgba(0,0,0,1)',
                                      padding: '8px'
                                   }}
                                   itemStyle={{ color: '#10b981', fontWeight: 'black', fontSize: '9px', textTransform: 'uppercase' }}
                                   labelStyle={{ display: 'none' }}
                                   formatter={(v: any) => formatCurrency(v)}
                                />
                                <Bar dataKey="commission" fill="url(#barGradient)" barSize={12} radius={[0, 6, 6, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* MINI INSIGHT */}
                    <div className="bg-[#C50337]/5 border border-[#C50337]/10 rounded-2xl p-4 md:p-5 flex items-center justify-between group cursor-help transition-all hover:bg-[#C50337]/10">
                       <div className="flex flex-col">
                          <span className="text-[11px] md:text-[13px] font-black text-white tracking-tighter">Profitability Optimization</span>
                          <span className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">High-conversion performance node</span>
                       </div>
                       <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#C50337] animate-pulse" />
                    </div>
                 </div>

                 {/* MAIN DATA FEED */}
                 <div className="lg:col-span-2 flex flex-col">
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:flex flex-col bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden h-[480px]">
                       <div className="px-6 py-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                             <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Detailed ROI Attribution</h3>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">Growth Engine</span>
                          </div>
                       </div>
                       
                       <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
                          <table className="w-full text-left">
                             <thead className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md">
                                <tr className="border-b border-white/5">
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest pl-6">Campaign Tag</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Clicks</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Volume</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right pr-6">Profit Node</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5 text-[11px]">
                                {paginatedData.map((row) => (
                                   <tr key={row.tag} className="hover:bg-white/[0.03] transition-all duration-300 group cursor-default">
                                      <td className="p-4 pl-6">
                                         <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${row.commission > (totalComm / data.length) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                            <span className="font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform">{row.tag}</span>
                                         </div>
                                      </td>
                                      <td className="p-4 text-center">
                                         <span className="text-slate-400 font-bold bg-[#C50337]/5 px-2.5 py-1 rounded-lg group-hover:text-[#C50337] transition-colors">{row.clicks.toLocaleString()}</span>
                                      </td>
                                      <td className="p-4 text-center">
                                         <span className="text-slate-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg group-hover:text-blue-400 transition-colors">{row.orders.toLocaleString()}</span>
                                      </td>
                                      <td className="p-4 text-right pr-6">
                                         <div className="flex flex-col items-end">
                                            <span className="font-black text-emerald-400 text-xs tracking-tight">{formatCurrency(row.commission)}</span>
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Settled</span>
                                         </div>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                       <div className="p-4 border-t border-white/5 bg-slate-950/40 text-center">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Advanced Pure Shopee Financial Layer</p>
                       </div>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden space-y-4">
                       <div className="flex items-center justify-between px-2 mb-2">
                          <div className="flex items-center gap-2">
                             <TrendingUp className="w-3 h-3 text-blue-500" />
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">ROI Attribution</span>
                          </div>
                          <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Pure Shopee Node</span>
                       </div>
                       {paginatedData.map((row) => (
                          <div key={row.tag} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 space-y-4 group active:scale-[0.98] transition-all">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <div className={`w-1.5 h-1.5 rounded-full ${row.commission > (totalComm / data.length) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                                   <span className="text-[11px] font-black text-white tracking-tight truncate max-w-[140px]">{row.tag}</span>
                                </div>
                                <div className="text-right">
                                   <span className="text-xs font-black text-emerald-400 tracking-tighter block">{formatCurrency(row.commission)}</span>
                                   <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Total Com</span>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3 pt-1">
                                <div className="bg-white/5 rounded-xl p-2.5 flex flex-col">
                                   <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Clicks</span>
                                   <span className="text-[10px] font-black text-white">{row.clicks.toLocaleString()}</span>
                                </div>
                                <div className="bg-white/5 rounded-xl p-2.5 flex flex-col">
                                   <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Orders</span>
                                   <span className="text-[10px] font-black text-white">{row.orders.toLocaleString()}</span>
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

                          <div className="flex items-center gap-2 opacity-40">
                             <div className="w-1 h-1 rounded-full bg-[#C50337]/50 animate-pulse" />
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">ROI Attribution Node</span>
                          </div>
                       </div>
                    )}
                 </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
