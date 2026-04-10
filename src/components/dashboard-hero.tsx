"use client";

import { useEffect, useState } from "react";
import { 
  BarChart3, 
  Calendar, 
  LayoutDashboard, 
  TrendingUp, 
  Sparkles, 
  MousePointer2, 
  Target,
  DollarSign,
  Loader2,
  Clock,
  Activity,
  History,
  Plus,
  TrendingDown,
  Activity as ActivityIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { format, subDays } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from "recharts";
import { ImportModal } from "./import-modal";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-4 shadow-2xl space-y-3 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</p>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-bold text-emerald-500/50 uppercase tracking-tighter">Live</span>
          </div>
        </div>
        <div className="space-y-2">
          {payload.map((item: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 group">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.name}</span>
              </div>
              <span className="text-xs font-black text-white tracking-tighter">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DashboardHero({ refreshKey }: { refreshKey?: number }) {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const [cumulativeStats, setCumulativeStats] = useState({
    spend: 0,
    commission: 0,
    profit: 0,
    roas: 0
  });
  const [balance, setBalance] = useState<number>(0);
  const [dailyStats, setDailyStats] = useState({
    spend: 0,
    commission: 0,
    profit: 0,
    roas: 0,
    metaClicks: 0,
    shopeeClicks: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [visibleLines, setVisibleLines] = useState({
    profit: true,
    commission: true,
    spend: true
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: allRecords, error: fetchErr } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", user?.id)
          .order("date", { ascending: true });

        if (fetchErr) {
          throw fetchErr;
        }

        if (!allRecords || allRecords.length === 0) {
          setLoading(false);
          return;
        }

        // Group by date to consolidate multiple sources
        const consolidated: Record<string, any> = {};
        allRecords.forEach(rec => {
          const d = rec.date;
          if (!consolidated[d]) {
            consolidated[d] = { 
              date: d, spend: 0, commission: 0, meta_clicks: 0, shopee_clicks: 0, orders: 0 
            };
          }
          consolidated[d].spend += Number(rec.spend) || 0;
          consolidated[d].commission += Number(rec.commission) || 0;
          if (rec.category === 'meta') consolidated[d].meta_clicks += Number(rec.clicks) || 0;
          if (rec.category === 'shopee_click') consolidated[d].shopee_clicks += Number(rec.clicks) || 0;
          consolidated[d].orders += Number(rec.orders) || 0;
        });

        const dailyList = Object.values(consolidated).sort((a: any, b: any) => a.date.localeCompare(b.date));

        const totalSpend = dailyList.reduce((sum, row) => sum + row.spend, 0);
        const totalCommission = dailyList.reduce((sum, row) => sum + row.commission, 0);

        setCumulativeStats({
          spend: totalSpend,
          commission: totalCommission,
          profit: totalCommission - totalSpend,
          roas: totalSpend > 0 ? totalCommission / totalSpend : 0
        });

        const latest: any = dailyList[dailyList.length - 1];
        setLatestDate(latest.date);

        setDailyStats({
          spend: latest.spend,
          commission: latest.commission,
          profit: latest.commission - latest.spend,
          roas: latest.spend > 0 ? latest.commission / latest.spend : 0,
          metaClicks: latest.meta_clicks,
          shopeeClicks: latest.shopee_clicks
        });

        // Ensure 30 days of data even if days are missing
        const last30Days = [];
        const endDateObj = latestDate || dailyList.length > 0 
          ? new Date(dailyList[dailyList.length - 1].date) 
          : new Date();
        
        for (let i = 29; i >= 0; i--) {
          const d = subDays(endDateObj, i);
          const dateStr = format(d, "yyyy-MM-dd");
          const record = consolidated[dateStr] || { spend: 0, commission: 0 };
          last30Days.push({
            date: dateStr,
            spend: record.spend,
            commission: record.commission,
            profit: record.commission - record.spend,
            formattedDate: format(d, "dd MMM")
          });
        }
        
        setChartData(last30Days);

        // Fetch Deposits
        const { data: deposits, error: depErr } = await supabase
          .from("deposits")
          .select("amount")
          .eq("user_id", user?.id);
        
        if (!depErr && deposits) {
          const totalDeposits = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
          setBalance(totalDeposits - totalSpend);
        }

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user?.id, refreshKey]);

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#C50337]" />
        <p className="text-[10px] font-black tracking-widest uppercase">Aggregating Global Metrics</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <section className="flex flex-wrap justify-center xl:grid xl:grid-cols-5 gap-3">
        {[
          { label: "Total Spend", value: formatCurrency(cumulativeStats.spend), icon: TrendingUp, color: "text-[#C50337]", bg: "bg-[#C50337]/5" },
          { label: "Ad Balance", value: formatCurrency(balance), icon: DollarSign, 
            color: balance < 0 ? "text-rose-500 animate-pulse" : balance < 300000 ? "text-amber-400" : "text-emerald-400", 
            bg: balance < 0 ? "bg-rose-500/10 border-rose-500/50" : "bg-emerald-500/5",
            isLow: balance < 300000
          },
          { label: "Total Commission", value: formatCurrency(cumulativeStats.commission), icon: Sparkles, color: "text-[#C50337]", bg: "bg-[#C50337]/5" },
          { label: "Net Profit", value: formatCurrency(cumulativeStats.profit), icon: LayoutDashboard, color: cumulativeStats.profit >= 0 ? "text-emerald-400" : "text-rose-400", bg: cumulativeStats.profit >= 0 ? "bg-emerald-500/5" : "bg-rose-500/5" },
          { label: "Total ROAS", value: `${cumulativeStats.roas.toFixed(2)}x`, icon: Target, color: "text-blue-400", bg: "bg-blue-500/5" },
        ].map((stat, i) => (
          <div key={i} className={`flex-1 min-w-[180px] p-4 border ${stat.label === 'Ad Balance' && balance < 0 ? 'border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5'} bg-slate-900/40 backdrop-blur-md rounded-xl relative overflow-hidden group hover:border-[#C50337]/20 transition-all`}>
            <div className={`absolute top-0 right-0 w-20 h-20 ${stat.bg} blur-3xl -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className="flex items-center justify-between mb-4">
              <div className={`p-1.5 ${stat.bg} border border-white/5 shrink-0 shadow-inner rounded-lg`}>
                <stat.icon className={`w-3 h-3 ${stat.color}`} />
              </div>
              <div className="w-1 h-1 rounded-full bg-white/10" />
            </div>
            <div className="space-y-1 relative z-10">
              <span className="text-[7px] font-black text-slate-500 tracking-[0.2em] uppercase block leading-none">
                {stat.label}
              </span>
              <div className={`text-[15px] font-black tracking-tighter leading-none truncate ${stat.label === 'Net Profit' && cumulativeStats.profit < 0 ? 'text-rose-400' : 'text-white'}`}>
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* LATEST DAY SNAPSHOT */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-1">
          <div className="p-1.5 bg-[#C50337]/10 border border-[#C50337]/20 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-[#C50337]" />
          </div>
          <div className="flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Latest Activity Snapshot</p>
            <p className="text-xs font-bold text-white mt-1 capitalize">{latestDate ? format(new Date(latestDate), "EEEE, d MMMM yyyy") : "No Activity Detected"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Daily Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             {[
               { label: "Day Spend", value: formatCurrency(dailyStats.spend), icon: TrendingUp, color: "text-[#C50337]" },
               { label: "Day Commission", value: formatCurrency(dailyStats.commission), icon: Sparkles, color: "text-[#C50337]" },
               { label: "Day Profit", value: formatCurrency(dailyStats.profit), icon: LayoutDashboard, color: "text-emerald-400" },
               { label: "Meta Clicks", value: dailyStats.metaClicks.toLocaleString(), icon: MousePointer2, color: "text-blue-400" },
               { label: "Shopee Clicks", value: dailyStats.shopeeClicks.toLocaleString(), icon: Target, color: "text-orange-400" },
               { label: "Click Loss", value: (dailyStats.shopeeClicks - dailyStats.metaClicks).toLocaleString(), icon: ActivityIcon, color: "text-rose-400" },
               { label: "Day ROAS", value: `${dailyStats.roas.toFixed(2)}x`, icon: Calendar, color: "text-blue-400" },
               { label: "Day ROI", value: `${dailyStats.spend > 0 ? ((dailyStats.profit / dailyStats.spend) * 100).toFixed(1) : 0}%`, icon: DollarSign, color: "text-emerald-400" },
             ].map((stat, i) => (
                <div key={i} className={`p-4 border border-white/5 bg-slate-900/20 rounded-xl flex flex-col justify-between group hover:bg-white/5 transition-all border-l-2 border-l-transparent hover:border-l-[#C50337]`}>
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-[8px] font-black text-slate-600 tracking-widest leading-none uppercase">{stat.label}</span>
                   <stat.icon className={`w-3 h-3 ${stat.color} opacity-40`} />
                 </div>
                 <div className={`text-sm font-black leading-none ${
                   (stat.label === 'Day Profit' && dailyStats.profit < 0) || 
                   (stat.label === 'Day ROI' && dailyStats.profit < 0) ? 'text-rose-400' : 'text-white'
                 }`}>
                   {stat.value}
                 </div>
               </div>
             ))}
          </div>

          {/* Performance Trajectory Chart */}
          <div className="lg:col-span-2 p-1 border border-white/5 bg-slate-900/40 backdrop-blur-md rounded-xl shadow-xl relative overflow-hidden group flex flex-col h-full">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-900/20">
              <div className="space-y-0.5">
                <h3 className="text-[10px] font-black text-slate-300 tracking-widest uppercase">Performance Trajectory</h3>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Rolling 30-Day Analysis</p>
                </div>
              </div>
              <div className="flex gap-4">
                 {[
                   { id: 'profit' as const, label: "Profit", color: "bg-emerald-500" },
                   { id: 'commission' as const, label: "Comm", color: "bg-blue-500" },
                   { id: 'spend' as const, label: "Spend", color: "bg-[#C50337]" }
                 ].map((item) => (
                   <button 
                     key={item.id} 
                     onClick={() => setVisibleLines(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                     className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                       visibleLines[item.id] ? 'bg-white/[0.05] border-white/10 opacity-100' : 'bg-transparent border-transparent opacity-30 hover:opacity-50'
                     } border shadow-inner`}
                   >
                     <div className={`w-1.5 h-1.5 rounded-full ${item.color} ${visibleLines[item.id] ? 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' : ''}`} />
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{item.label}</span>
                   </button>
                 ))}
              </div>
            </div>
            <div className="flex-1 w-full p-6 pb-2 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={1} barCategoryGap="25%">
                  <defs>
                    <linearGradient id="barProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="barComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    </linearGradient>
                    <linearGradient id="barSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C50337" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#C50337" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis 
                    dataKey="formattedDate" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#475569', fontSize: 8, fontWeight: 800}}
                    dy={10}
                    interval={Math.ceil(chartData.length / 8)}
                  />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
                  <Bar 
                    name="Net Profit" 
                    dataKey="profit" 
                    fill="url(#barProfit)" 
                    radius={[2, 2, 0, 0]}
                    hide={!visibleLines.profit}
                  />
                  <Bar 
                    name="Commission" 
                    dataKey="commission" 
                    fill="url(#barComm)" 
                    radius={[2, 2, 0, 0]}
                    hide={!visibleLines.commission}
                  />
                  <Bar 
                    name="Ad Spend" 
                    dataKey="spend" 
                    fill="url(#barSpend)" 
                    radius={[2, 2, 0, 0]}
                    hide={!visibleLines.spend}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
