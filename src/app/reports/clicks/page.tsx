"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Loader2, TrendingUp, MousePointerClick, BarChart3, Target, ShoppingBag, DollarSign, ArrowUpRight, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { ProtectedRoute } from "@/components/protected-route";

interface PlacementMetric {
  source: string;
  clicks: number;
  orders: number;
  commission: number;
}

interface TrendRecord {
  date: string;
  clicks: number;
  comm: number;
}

export default function ClicksReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PlacementMetric[]>([]);
  const [trendData, setTrendData] = useState<TrendRecord[]>([]);
  const [metaClicks, setMetaClicks] = useState(0);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const normalizePlatform = (sourceStr: string): string => {
    const low = sourceStr.toLowerCase();
    if (low.includes("facebook") || low.includes("fb")) return "Facebook";
    if (low.includes("instagram") || low.includes("ig")) return "Instagram";
    if (low.includes("threads")) return "Threads";
    if (low.includes("youtube") || low.includes("yt")) return "YouTube";
    if (low.includes("tiktok") || low.includes("tt")) return "TikTok";
    if (low.includes("google") || low.includes("gg")) return "Google";
    return "Others";
  };

  useEffect(() => {
    async function fetchPlacementAnalytics() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const { data: records } = await supabase
          .from("daily_records")
          .select("source, clicks, commission, orders, date, category")
          .eq("user_id", user.id)
          .in("category", ["shopee_click", "shopee_comm", "meta"]);

        if (records) {
          const platformMap: Record<string, PlacementMetric> = {};
          const dailyMap: Record<string, { c: number, v: number }> = {};
          let totalMeta = 0;

          records.forEach(r => {
            const rawSource = r.source || "Others";
            const platform = normalizePlatform(rawSource);
            
            if (!platformMap[platform]) {
              platformMap[platform] = { source: platform, clicks: 0, orders: 0, commission: 0 };
            }

            const d = r.date || "Unknown";
            if (!dailyMap[d]) dailyMap[d] = { c: 0, v: 0 };

            if (r.category === "shopee_click") {
              platformMap[platform].clicks += (Number(r.clicks) || 0);
              dailyMap[d].c += (Number(r.clicks) || 0);
            } else if (r.category === "shopee_comm") {
              platformMap[platform].commission += (Number(r.commission) || 0);
              platformMap[platform].orders += (Number(r.orders) || 0);
              dailyMap[d].v += (Number(r.commission) || 0);
            } else if (r.category === "meta") {
              totalMeta += (Number(r.clicks) || 0);
            }
          });

          const formattedSources = Object.values(platformMap)
            .sort((a, b) => b.commission - a.commission);

          const formattedTrend = Object.entries(dailyMap)
            .map(([date, val]) => ({ date, clicks: val.c, comm: val.v }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          setData(formattedSources);
          setTrendData(formattedTrend);
          setMetaClicks(totalMeta);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlacementAnalytics();
  }, [user]);

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    if (!search) return data;
    return data.filter(d => d.source.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  const totalComm = useMemo(() => data.reduce((acc, curr) => acc + curr.commission, 0), [data]);
  const totalOrders = useMemo(() => data.reduce((a, b) => a + b.orders, 0), [data]);
  const totalClicks = useMemo(() => data.reduce((a, b) => a + b.clicks, 0), [data]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-black selection:bg-[#C50337]/30">
        <TopBar 
          title="Placement Intelligence"
          description="Performance distribution and platform-level profitability."
          action={
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-all duration-300" />
                <input 
                  type="text" 
                  placeholder="Search Platforms..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500/50 w-32 md:w-64 transition-all font-bold placeholder:text-slate-600 shadow-2xl"
                />
              </div>
            </div>
          }
        />

        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 bg-slate-950/20 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl">
              <div className="relative">
                 <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                 <div className="absolute inset-0 blur-xl bg-blue-500/20 scale-150 animate-pulse" />
              </div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-6 opacity-80">Calculating Global Performance Node...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 space-y-6 md:space-y-8">
              
              {/* KPI ROW - GLASSMOPHISM */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                 {[
                   { label: "Acquisition Vol", value: totalOrders.toLocaleString(), icon: ShoppingBag, color: "#3b82f6", trend: "Orders" },
                   { label: "Placement Revenue", value: formatCurrency(totalComm), icon: DollarSign, color: "#10b981", trend: "Profit" },
                   { label: "Traffic Feed", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "#f59e0b", trend: "Clicks" },
                   { label: "Platform Count", value: data.length, icon: Globe, color: "#8b5cf6", trend: "Live" },
                 ].map((stat, i) => (
                   <div key={i} className="group relative overflow-hidden bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 md:p-5 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-blue-500/40">
                       <div className="relative z-10 space-y-3 md:space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="p-2 rounded-lg md:rounded-xl bg-slate-950/40 border border-white/5 group-hover:bg-blue-500/10 transition-colors" style={{ color: stat.color }}>
                                <stat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                             </div>
                             <div className="text-[7px] md:text-[8px] bg-white/5 px-1.5 md:px-2 py-0.5 md:py-1 rounded font-black uppercase text-slate-500 tracking-widest">{stat.trend}</div>
                          </div>
                          <div className="flex flex-col space-y-1 md:space-y-2">
                             <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-60 leading-none">{stat.label}</span>
                             <div className="text-sm md:text-xl font-black text-white tracking-tighter leading-none truncate pr-1">
                                {stat.value}
                             </div>
                          </div>
                       </div>
                   </div>
                 ))}
              </div>

              {/* CHARTS + TABLE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                 
                 {/* CHART SIDEBAR - LIFT DISTRIBUTION */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-5 md:p-6 shadow-2xl h-[350px] md:h-[450px] flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
                       
                       <div className="flex items-center justify-between mb-6 md:mb-8">
                          <div className="flex items-center gap-3">
                             <BarChart3 className="w-4 h-4 text-emerald-500" />
                             <h3 className="text-[10px] font-black text-white uppercase tracking-widest opacity-80">Source Revenue Mix</h3>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
                       </div>

                       <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={filteredData} layout="vertical" margin={{ left: -30, right: 30 }}>
                                <defs>
                                   <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                                      <stop offset="0%" stopColor="#3b82f6" />
                                      <stop offset="100%" stopColor="#10b981" />
                                   </linearGradient>
                                </defs>
                                <XAxis type="number" hide />
                                <YAxis 
                                   dataKey="source" 
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
                                   itemStyle={{ color: '#3b82f6', fontWeight: 'black', fontSize: '9px', textTransform: 'uppercase' }}
                                   labelStyle={{ display: 'none' }}
                                   formatter={(v: any) => formatCurrency(v)}
                                />
                                <Bar dataKey="commission" fill="url(#blueGradient)" barSize={12} radius={[0, 8, 8, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>

                 {/* MAIN PLACEMENT FEED */}
                 <div className="lg:col-span-2 flex flex-col">
                    {/* DESKTOP TABLE */}
                    <div className="hidden md:flex flex-col bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden h-[450px]">
                       <div className="px-6 py-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                             <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-white transition-colors">Placement Performance Flow</h3>
                          </div>
                          <span className="text-[8px] font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest leading-none">Market Share Live</span>
                       </div>
                       
                       <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
                          <table className="w-full text-left">
                             <thead className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md">
                                <tr className="border-b border-white/5">
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest pl-6">Source / Placement</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Clicks</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Orders</th>
                                   <th className="p-4 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right pr-6">Net Rev</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5 text-[11px]">
                                {paginatedData.map((row) => (
                                   <tr key={row.source} className="hover:bg-white/[0.03] transition-all duration-300 group cursor-default">
                                      <td className="p-4 pl-6">
                                         <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${row.commission > 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                                            <span className="font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform">{row.source}</span>
                                         </div>
                                      </td>
                                      <td className="p-4 text-center text-slate-500 font-bold">{row.clicks.toLocaleString()}</td>
                                      <td className="p-4 text-center">
                                         <span className="text-white font-bold bg-white/5 px-2 py-1 rounded-lg group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-all">{row.orders.toLocaleString()}</span>
                                      </td>
                                      <td className="p-4 text-right pr-6">
                                         <div className="flex flex-col items-end">
                                            <span className="font-black text-emerald-400 text-xs tracking-tight">{formatCurrency(row.commission)}</span>
                                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Platform Net</span>
                                         </div>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                       <div className="p-4 border-t border-white/5 bg-slate-950/40 text-center">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] leading-none">Unified Shopee-Centric Platform Analytics</p>
                       </div>
                    </div>

                    {/* MOBILE CARD VIEW */}
                    <div className="md:hidden space-y-4">
                       <div className="flex items-center justify-between px-2 mb-2">
                          <div className="flex items-center gap-2">
                             <TrendingUp className="w-3 h-3 text-emerald-500" />
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Performance Flow</span>
                          </div>
                          <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Market Share Node</span>
                       </div>

                       {paginatedData.map((row) => (
                          <div key={row.source} className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-4 space-y-4 group active:scale-[0.98] transition-all">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <div className={`w-1.5 h-1.5 rounded-full ${row.commission > 0 ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                                   <span className="text-[11px] font-black text-white tracking-tight">{row.source}</span>
                                </div>
                                <div className="text-right">
                                   <span className="text-xs font-black text-emerald-400 tracking-tighter block">{formatCurrency(row.commission)}</span>
                                   <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Net Revenue</span>
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
                                className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-blue-500/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all shadow-lg active:scale-95"
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
                                                  ? "bg-blue-600 border-transparent text-white shadow-lg shadow-blue-600/30" 
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
                                className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-blue-500/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all shadow-lg active:scale-95"
                             >
                                <ChevronRight className="w-4 h-4" />
                             </button>
                          </div>

                          <div className="flex items-center gap-2 opacity-40">
                             <div className="w-1 h-1 rounded-full bg-blue-500/50 animate-pulse" />
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Placement Intelligence Flow</span>
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
