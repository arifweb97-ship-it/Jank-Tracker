"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Tag, Loader2, TrendingUp, DollarSign, MousePointerClick, ShoppingBag, ArrowUpRight, BarChart3, Target } from "lucide-react";
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

  useEffect(() => {
    async function fetchTagMetrics() {
      setLoading(true);
      try {
        if (!user?.id) return;
        const { data: records } = await supabase
          .from("daily_records")
          .select("source, clicks, commission, orders, category")
          .eq("user_id", user.id)
          .in("category", ["shopee_click", "shopee_comm"]); // Pure Shopee Only

        if (records) {
          const map: Record<string, TagMetric> = {};

          records.forEach(r => {
            const parts = (r.source || "").split(" >>> ");
            const tag = parts.length > 1 ? parts[1] : (parts[0] || "Untagged");

            if (!map[tag]) {
              map[tag] = { tag, clicks: 0, orders: 0, commission: 0 };
            }

            if (r.category === "shopee_click") map[tag].clicks += (Number(r.clicks) || 0);
            if (r.category === "shopee_comm") {
              map[tag].commission += (Number(r.commission) || 0);
              map[tag].orders += (Number(r.orders) || 0);
            }
          });

          const formatted = Object.values(map)
            .sort((a, b) => b.commission - a.commission);

          setData(formatted);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchTagMetrics();
  }, [user]);

  const filteredData = useMemo(() => {
    if (!search) return data;
    return data.filter(d => d.tag.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

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

        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 bg-slate-950/20 backdrop-blur-3xl rounded-3xl border border-white/5 shadow-2xl">
              <div className="relative">
                 <Loader2 className="w-12 h-12 animate-spin text-[#C50337]" />
                 <div className="absolute inset-0 blur-xl bg-[#C50337]/20 scale-150 animate-pulse" />
              </div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-6 opacity-80">Synchronizing Shopee Node...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 space-y-8">
              
              {/* KPI ROW - EXEC DASHBOARD */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                   { label: "Net Commission", value: formatCurrency(totalComm), icon: DollarSign, color: "#10b981", trend: "7.2%" },
                   { label: "Top Product Tag", value: data[0]?.tag || "N/A", icon: Target, color: "#C50337", trend: "Hot" },
                   { label: "Shopee Orders", value: totalOrders.toLocaleString(), icon: ShoppingBag, color: "#f59e0b", trend: "Volume" },
                   { label: "Active Tags", value: data.length, icon: Tag, color: "#3b82f6", trend: "Live" },
                 ].map((stat, i) => (
                   <div key={i} className="group relative overflow-hidden bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-5 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-[#C50337]/40 hover:scale-[1.02] active:scale-[0.98]">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <stat.icon className="w-16 h-16" />
                      </div>
                       <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 group-hover:bg-[#C50337]/10 transition-colors" style={{ color: stat.color }}>
                                <stat.icon className="w-4 h-4" />
                             </div>
                             <div className="text-[8px] bg-white/5 px-2 py-1 rounded font-black uppercase text-slate-500 tracking-widest">{stat.trend}</div>
                          </div>
                          <div className="flex flex-col space-y-2">
                             <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] opacity-60 leading-none">{stat.label}</span>
                             <div className="text-xl font-black text-white tracking-tighter leading-none whitespace-nowrap overflow-hidden">
                                {stat.value}
                             </div>
                          </div>
                       </div>
                   </div>
                 ))}
              </div>

              {/* CHARTS + TABLE GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 
                 {/* CHART SIDEBAR */}
                 <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 shadow-2xl h-[400px] flex flex-col group relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C50337]/50 to-transparent opacity-50" />
                       
                       <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                             <BarChart3 className="w-4 h-4 text-emerald-500" />
                             <h3 className="text-[10px] font-black text-white uppercase tracking-widest opacity-80">Campaign Strength</h3>
                          </div>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-colors" />
                       </div>

                       <div className="flex-1 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={filteredData.slice(0,6)} layout="vertical" margin={{ left: -20, right: 30 }}>
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
                                   fontSize={9} 
                                   fontWeight="black" 
                                   width={85}
                                   tickFormatter={(v) => v.length > 12 ? v.substring(0, 10) + '..' : v}
                                />
                                <Tooltip 
                                   cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                                   contentStyle={{ 
                                      backgroundColor: 'rgba(2, 6, 23, 0.95)', 
                                      backdropFilter: 'blur(16px)',
                                      border: '1px solid rgba(255,255,255,0.05)', 
                                      borderRadius: '16px',
                                      boxShadow: '0 10px 40px -10px rgba(0,0,0,1)'
                                   }}
                                   itemStyle={{ color: '#10b981', fontWeight: 'black', fontSize: '11px', textTransform: 'uppercase' }}
                                   labelStyle={{ display: 'none' }}
                                   formatter={(v: any) => formatCurrency(v)}
                                />
                                <Bar dataKey="commission" fill="url(#barGradient)" barSize={14} radius={[0, 6, 6, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    {/* MINI INSIGHT */}
                    <div className="bg-[#C50337]/5 border border-[#C50337]/10 rounded-2xl p-5 flex items-center justify-between group cursor-help transition-all hover:bg-[#C50337]/10">
                       <div className="flex flex-col">
                          <span className="text-[13px] font-black text-white tracking-tighter">Profitability Optimization</span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Focusing on high-conversion tags</span>
                       </div>
                       <TrendingUp className="w-5 h-5 text-[#C50337] animate-pulse" />
                    </div>
                 </div>

                 {/* MAIN DATA FEED */}
                 <div className="lg:col-span-2 bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[480px]">
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
                             {filteredData.map((row) => (
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

              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
