"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Crosshair, Loader2, TrendingUp, DollarSign, MousePointerClick, ShoppingBag, Tag, BarChart3, ChevronLeft, ChevronRight, Upload, ArrowUpRight, CalendarDays } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ProtectedRoute } from "@/components/protected-route";
import { ClickUploadModal } from "@/components/click-upload-modal";

interface TagPerformance {
  tag: string;
  clicks: number;
  orders: number;
  commission: number;
  conversionRate: number;
}

interface PlatformStat {
  platform: string;
  clicks: number;
  color: string;
}

interface DailyTagStat {
  date: string;
  tag: string;
  clicks: number;
  orders: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  Facebook: "#1877F2",
  Instagram: "#E4405F",
  Threads: "#000000",
  YouTube: "#FF0000",
  TikTok: "#00f2ea",
  Google: "#4285F4",
  Shopee: "#EE4D2D",
  Others: "#64748b",
};

export default function ClickAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tagData, setTagData] = useState<TagPerformance[]>([]);
  const [platformData, setPlatformData] = useState<PlatformStat[]>([]);
  const [dailyData, setDailyData] = useState<DailyTagStat[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("all");
  const [showUpload, setShowUpload] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const totalClicks = useMemo(() => tagData.reduce((a, b) => a + b.clicks, 0), [tagData]);
  const totalOrders = useMemo(() => tagData.reduce((a, b) => a + b.orders, 0), [tagData]);
  const totalComm = useMemo(() => tagData.reduce((a, b) => a + b.commission, 0), [tagData]);

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, [user, dateRange, refreshKey]);

  async function fetchData() {
    setLoading(true);
    try {
      // Build date filter
      let dateFilter: string | null = null;
      if (dateRange === "7d") {
        const d = new Date(); d.setDate(d.getDate() - 7);
        dateFilter = d.toISOString();
      } else if (dateRange === "30d") {
        const d = new Date(); d.setDate(d.getDate() - 30);
        dateFilter = d.toISOString();
      }

      // Fetch clicks from shopee_clicks
      let clickQuery = supabase.from("shopee_clicks").select("tag_link, technical_source, click_time").eq("user_id", user!.id);
      if (dateFilter) clickQuery = clickQuery.gte("click_time", dateFilter);
      const { data: clicks } = await clickQuery;

      // Fetch commissions from shopee_commissions
      let commQuery = supabase.from("shopee_commissions").select("tag_link, commission, order_id, order_time").eq("user_id", user!.id);
      if (dateFilter) commQuery = commQuery.gte("order_time", dateFilter);
      const { data: comms } = await commQuery;

      // Aggregate by tag_link
      const tagMap: Record<string, { clicks: number; orders: number; commission: number }> = {};
      const platMap: Record<string, number> = {};
      const dailyMap: Record<string, { clicks: number; orders: number }> = {};

      (clicks || []).forEach((c: any) => {
        const tag = c.tag_link || "Untagged";
        if (!tagMap[tag]) tagMap[tag] = { clicks: 0, orders: 0, commission: 0 };
        tagMap[tag].clicks += 1;

        const plat = c.technical_source || "Others";
        platMap[plat] = (platMap[plat] || 0) + 1;

        // Daily aggregation
        const dateStr = c.click_time ? new Date(c.click_time).toISOString().split("T")[0] : "unknown";
        const dailyKey = `${dateStr}|${tag}`;
        if (!dailyMap[dailyKey]) dailyMap[dailyKey] = { clicks: 0, orders: 0 };
        dailyMap[dailyKey].clicks += 1;
      });

      // Deduplicate orders by order_id
      const seenOrders = new Set<string>();
      (comms || []).forEach((c: any) => {
        const tag = c.tag_link || "Untagged";
        if (!tagMap[tag]) tagMap[tag] = { clicks: 0, orders: 0, commission: 0 };

        const oid = c.order_id ? String(c.order_id) : "";
        const isNew = oid && !seenOrders.has(oid);
        if (isNew) {
          seenOrders.add(oid);
          tagMap[tag].orders += 1;
        }
        tagMap[tag].commission += Number(c.commission) || 0;

        // Daily orders aggregation
        if (isNew) {
          const dateStr = c.order_time ? new Date(c.order_time).toISOString().split("T")[0] : "unknown";
          const dailyKey = `${dateStr}|${tag}`;
          if (!dailyMap[dailyKey]) dailyMap[dailyKey] = { clicks: 0, orders: 0 };
          dailyMap[dailyKey].orders += 1;
        }
      });

      const tags: TagPerformance[] = Object.entries(tagMap)
        .map(([tag, v]) => ({
          tag,
          clicks: v.clicks,
          orders: v.orders,
          commission: v.commission,
          conversionRate: v.clicks > 0 ? (v.orders / v.clicks) * 100 : 0,
        }))
        .sort((a, b) => b.clicks - a.clicks);

      const plats: PlatformStat[] = Object.entries(platMap)
        .map(([platform, clicks]) => ({ platform, clicks, color: PLATFORM_COLORS[platform] || "#64748b" }))
        .sort((a, b) => b.clicks - a.clicks);

      // Build daily breakdown
      const dailyRows: DailyTagStat[] = Object.entries(dailyMap)
        .filter(([k]) => !k.startsWith("unknown"))
        .map(([key, v]) => {
          const [date, tag] = key.split("|");
          return { date, tag, clicks: v.clicks, orders: v.orders };
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.clicks - a.clicks);

      setTagData(tags);
      setPlatformData(plats);
      setDailyData(dailyRows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredData = useMemo(() => {
    setCurrentPage(1);
    if (!search) return tagData;
    return tagData.filter(d => d.tag.toLowerCase().includes(search.toLowerCase()));
  }, [tagData, search]);

  const itemsPerPage = 8;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const s = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(s, s + itemsPerPage);
  }, [filteredData, currentPage]);

  const fmt = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-black selection:bg-violet-500/30">
        <TopBar
          title="Click Analytics"
          description="Tag link performance & conversion intelligence."
          action={
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Click Data
            </button>
          }
        />

        <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* DATE RANGE + SEARCH */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 border border-white/5 rounded-xl">
              {(["7d", "30d", "all"] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    dateRange === r
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {r === "7d" ? "7 Hari" : r === "30d" ? "30 Hari" : "Semua"}
                </button>
              ))}
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-500 transition-all" />
              <input
                type="text"
                placeholder="Search tag link..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-slate-900/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-[11px] text-white focus:outline-none focus:border-violet-500/50 w-64 transition-all font-bold placeholder:text-slate-600"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 bg-slate-950/20 backdrop-blur-3xl rounded-3xl border border-white/5">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-violet-500" />
                <div className="absolute inset-0 blur-xl bg-violet-500/20 scale-150 animate-pulse" />
              </div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-6">Loading Click Data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "#8b5cf6" },
                  { label: "Total Orders", value: totalOrders.toLocaleString(), icon: ShoppingBag, color: "#f59e0b" },
                  { label: "Net Commission", value: fmt(totalComm), icon: DollarSign, color: "#10b981" },
                  { label: "Active Tags", value: tagData.length.toString(), icon: Tag, color: "#3b82f6" },
                ].map((s, i) => (
                  <div key={i} className="group relative overflow-hidden bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500 hover:border-violet-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <s.icon className="w-12 h-12" />
                    </div>
                    <div className="relative z-10 space-y-3">
                      <div className="p-2 rounded-xl bg-slate-950/40 border border-white/5 w-fit" style={{ color: s.color }}>
                        <s.icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col space-y-1">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{s.label}</span>
                        <div className="text-lg font-black text-white tracking-tighter truncate">{s.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CHARTS + TABLE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PLATFORM CHART */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className="bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl p-5 shadow-2xl h-[380px] flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-500/50 to-transparent opacity-50" />
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Platform Source</h3>
                      </div>
                    </div>
                    <div className="flex-1 w-full">
                      {platformData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={platformData.slice(0, 6)} layout="vertical" margin={{ left: -10, right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="platform" type="category" stroke="#64748b" fontSize={9} fontWeight="bold" width={70} />
                            <Tooltip
                              cursor={{ fill: "rgba(255,255,255,0.03)" }}
                              contentStyle={{ backgroundColor: "rgba(2,6,23,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "8px" }}
                              itemStyle={{ color: "#8b5cf6", fontWeight: "bold", fontSize: "9px", textTransform: "uppercase" }}
                              labelStyle={{ display: "none" }}
                              formatter={(v: any) => `${Number(v).toLocaleString()} clicks`}
                            />
                            <Bar dataKey="clicks" barSize={14} radius={[0, 6, 6, 0]}>
                              {platformData.slice(0, 6).map((e, i) => (
                                <Cell key={i} fill={e.color} fillOpacity={0.8} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">No click data yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONVERSION INSIGHT */}
                  <div className="bg-violet-500/5 border border-violet-500/10 rounded-2xl p-4 flex items-center justify-between group cursor-help transition-all hover:bg-violet-500/10">
                    <div className="flex flex-col">
                      <span className="text-[12px] font-black text-white tracking-tighter">Avg Conversion</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {totalClicks > 0 ? ((totalOrders / totalClicks) * 100).toFixed(2) : "0.00"}% click-to-order
                      </span>
                    </div>
                    <TrendingUp className="w-5 h-5 text-violet-500 animate-pulse" />
                  </div>
                </div>

                {/* TAG LEADERBOARD TABLE */}
                <div className="lg:col-span-2 flex flex-col">
                  {/* DESKTOP TABLE */}
                  <div className="hidden md:flex flex-col bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Crosshair className="w-3.5 h-3.5 text-violet-500" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tag Link Leaderboard</h3>
                      </div>
                      <span className="text-[8px] font-black text-violet-500 bg-violet-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{filteredData.length} tags</span>
                    </div>

                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md">
                          <tr className="border-b border-white/5">
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest pl-6 w-8">#</th>
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">Tag Link</th>
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Clicks</th>
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Orders</th>
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">CVR</th>
                            <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-right pr-6">Commission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {paginatedData.length === 0 ? (
                            <tr><td colSpan={6} className="py-20 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">No data available. Upload click CSV to get started.</td></tr>
                          ) : paginatedData.map((row, idx) => (
                            <tr key={row.tag} className="hover:bg-white/[0.03] transition-all group">
                              <td className="p-4 pl-6 text-[10px] font-black text-slate-600">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-1.5 h-1.5 rounded-full ${row.clicks > (totalClicks / Math.max(tagData.length, 1)) ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "bg-slate-700"}`} />
                                  <span className="font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform">{row.tag}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-slate-400 font-bold bg-violet-500/5 px-2.5 py-1 rounded-lg group-hover:text-violet-400 transition-colors">{row.clicks.toLocaleString()}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className="text-slate-400 font-bold bg-white/5 px-2.5 py-1 rounded-lg group-hover:text-blue-400 transition-colors">{row.orders.toLocaleString()}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`font-black text-[10px] px-2 py-1 rounded-lg ${row.conversionRate > 5 ? "text-emerald-400 bg-emerald-500/10" : row.conversionRate > 0 ? "text-amber-400 bg-amber-500/10" : "text-slate-600 bg-white/5"}`}>
                                  {row.conversionRate.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <span className="font-black text-emerald-400 text-xs tracking-tight">{fmt(row.commission)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* MOBILE CARD VIEW */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center gap-2 px-2 mb-2">
                      <Crosshair className="w-3 h-3 text-violet-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tag Leaderboard</span>
                    </div>
                    {paginatedData.length === 0 ? (
                      <div className="py-16 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest bg-slate-900/20 rounded-2xl border border-white/5">Upload click CSV to get started</div>
                    ) : paginatedData.map((row, idx) => (
                      <div key={row.tag} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3 active:scale-[0.98] transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-violet-500 bg-violet-500/10 w-6 h-6 rounded-lg flex items-center justify-center">{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                            <span className="text-[11px] font-black text-white truncate max-w-[140px]">{row.tag}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-400">{fmt(row.commission)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-white/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Clicks</span>
                            <span className="text-[10px] font-black text-white">{row.clicks.toLocaleString()}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Orders</span>
                            <span className="text-[10px] font-black text-white">{row.orders.toLocaleString()}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">CVR</span>
                            <span className={`text-[10px] font-black ${row.conversionRate > 5 ? "text-emerald-400" : "text-amber-400"}`}>{row.conversionRate.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PAGINATION */}
                  {totalPages > 1 && (
                    <div className="flex flex-col items-center gap-2 bg-slate-900/40 border border-white/10 py-3 px-6 rounded-xl shadow-xl mt-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                            const page = i + 1;
                            return (
                              <button key={page} onClick={() => setCurrentPage(page)} className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all border ${currentPage === page ? "bg-violet-600 border-transparent text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-500 hover:text-white"}`}>
                                {page}
                              </button>
                            );
                          })}
                          {totalPages > 5 && <span className="text-slate-600 text-[10px] font-black px-1">...{totalPages}</span>}
                        </div>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DAILY TAG PERFORMANCE */}
              <div className="bg-slate-900/20 backdrop-blur-2xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-slate-950/20 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Tag Performance</h3>
                  </div>
                  <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest">{dailyData.length} records</span>
                </div>

                {/* DESKTOP DAILY TABLE */}
                <div className="hidden md:block overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md">
                      <tr className="border-b border-white/5">
                        <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest pl-6">Tanggal</th>
                        <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">Tag Link</th>
                        <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Klik Hari Ini</th>
                        <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Pesanan Hari Ini</th>
                        <th className="p-4 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center pr-6">CVR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[11px]">
                      {dailyData.length === 0 ? (
                        <tr><td colSpan={5} className="py-16 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">Belum ada data harian</td></tr>
                      ) : dailyData.slice((dailyPage - 1) * 10, dailyPage * 10).map((row, idx) => {
                        const cvr = row.clicks > 0 ? ((row.orders / row.clicks) * 100) : 0;
                        const isToday = row.date === new Date().toISOString().split("T")[0];
                        return (
                          <tr key={`${row.date}-${row.tag}-${idx}`} className={`hover:bg-white/[0.03] transition-all group ${isToday ? "bg-violet-500/[0.03]" : ""}`}>
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-2">
                                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse" />}
                                <span className={`font-bold tracking-tight ${isToday ? "text-amber-400" : "text-slate-400"}`}>{row.date}</span>
                                {isToday && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest">Today</span>}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-bold text-white tracking-tight group-hover:translate-x-1 transition-transform inline-block">{row.tag}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-slate-300 font-black bg-violet-500/10 px-3 py-1 rounded-lg">{row.clicks.toLocaleString()}</span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`font-black px-3 py-1 rounded-lg ${row.orders > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-slate-600 bg-white/5"}`}>{row.orders.toLocaleString()}</span>
                            </td>
                            <td className="p-4 text-center pr-6">
                              <span className={`font-black text-[10px] ${cvr > 5 ? "text-emerald-400" : cvr > 0 ? "text-amber-400" : "text-slate-600"}`}>{cvr.toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE DAILY CARDS */}
                <div className="md:hidden divide-y divide-white/5">
                  {dailyData.length === 0 ? (
                    <div className="py-16 text-center text-slate-600 text-[10px] font-black uppercase">Belum ada data harian</div>
                  ) : dailyData.slice((dailyPage - 1) * 10, dailyPage * 10).map((row, idx) => {
                    const cvr = row.clicks > 0 ? ((row.orders / row.clicks) * 100) : 0;
                    const isToday = row.date === new Date().toISOString().split("T")[0];
                    return (
                      <div key={`m-${row.date}-${row.tag}-${idx}`} className={`p-4 space-y-3 ${isToday ? "bg-violet-500/[0.03]" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isToday && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                            <span className={`text-[10px] font-black ${isToday ? "text-amber-400" : "text-slate-500"}`}>{row.date}</span>
                            {isToday && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">TODAY</span>}
                          </div>
                          <span className="text-[10px] font-black text-white truncate max-w-[120px]">{row.tag}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-violet-500/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Klik</span>
                            <span className="text-[11px] font-black text-white">{row.clicks.toLocaleString()}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase">Pesanan</span>
                            <span className={`text-[11px] font-black ${row.orders > 0 ? "text-emerald-400" : "text-slate-600"}`}>{row.orders}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2 flex flex-col">
                            <span className="text-[7px] font-black text-slate-500 uppercase">CVR</span>
                            <span className={`text-[11px] font-black ${cvr > 0 ? "text-amber-400" : "text-slate-600"}`}>{cvr.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DAILY PAGINATION */}
                {dailyData.length > 10 && (
                  <div className="p-4 border-t border-white/5 bg-slate-950/40 flex items-center justify-center gap-3">
                    <button onClick={() => setDailyPage(p => Math.max(1, p - 1))} disabled={dailyPage === 1} className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Page {dailyPage} of {Math.ceil(dailyData.length / 10)}</span>
                    <button onClick={() => setDailyPage(p => Math.min(Math.ceil(dailyData.length / 10), p + 1))} disabled={dailyPage === Math.ceil(dailyData.length / 10)} className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        <ClickUploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          onSuccess={() => setRefreshKey(k => k + 1)}
        />
      </div>
    </ProtectedRoute>
  );
}
