"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Crosshair, Loader2, TrendingUp, DollarSign, MousePointerClick, ShoppingBag, Tag, BarChart3, ChevronLeft, ChevronRight, Upload, ArrowUpRight, CalendarDays, ChevronDown } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { ProtectedRoute } from "@/components/protected-route";
import { ClickUploadModal } from "@/components/click-upload-modal";
import { UploadTutorial } from "@/components/upload-tutorial";

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

interface DailyGroup {
  date: string;
  totalClicks: number;
  totalOrders: number;
  totalCommission: number;
  tags: TagPerformance[];
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
  const [dailyGroups, setDailyGroups] = useState<DailyGroup[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("7d");
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

      // Fetch clicks from shopee_clicks (Parallel Paginated to bypass 1000 row limit)
      let clickCountQuery = supabase
        .from("shopee_clicks")
        .select('*', { count: 'exact', head: true })
        .eq("user_id", user!.id);
      
      if (dateFilter) clickCountQuery = clickCountQuery.gte("click_time", dateFilter);
      const { count: clickCount } = await clickCountQuery;
      
      let allClicks: any[] = [];
      if (clickCount && clickCount > 0) {
        const pageSize = 1000;
        const promises = [];
        for (let i = 0; i < clickCount; i += pageSize) {
          let query = supabase
            .from("shopee_clicks")
            .select("tag_link, technical_source, click_time")
            .eq("user_id", user!.id)
            .range(i, i + pageSize - 1);
          if (dateFilter) query = query.gte("click_time", dateFilter);
          promises.push(query);
        }
        const results = await Promise.all(promises);
        allClicks = results.flatMap(res => res.data || []);
      }
      const clicks = allClicks;

      // Fetch commissions from daily_records (Parallel Paginated)
      let commCountQuery = supabase
        .from("daily_records")
        .select('*', { count: 'exact', head: true })
        .eq("user_id", user!.id)
        .eq("category", "shopee_comm");
        
      if (dateFilter) commCountQuery = commCountQuery.gte("date", dateFilter);
      const { count: commCount } = await commCountQuery;

      let allComms: any[] = [];
      if (commCount && commCount > 0) {
        const pageSize = 1000;
        const promises = [];
        for (let i = 0; i < commCount; i += pageSize) {
          let query = supabase
            .from("daily_records")
            .select("date, source, commission, orders")
            .eq("user_id", user!.id)
            .eq("category", "shopee_comm")
            .range(i, i + pageSize - 1);
          if (dateFilter) query = query.gte("date", dateFilter);
          promises.push(query);
        }
        const results = await Promise.all(promises);
        allComms = results.flatMap(res => res.data || []);
      }
      const comms = allComms;

      // Aggregate by tag_link
      const tagMap: Record<string, { clicks: number; orders: number; commission: number }> = {};
      const platMap: Record<string, number> = {};
      const dailyMap: Record<string, { clicks: number; orders: number; commission: number }> = {};

      const normalizeTag = (val: string | null): string => {
        if (!val) return "Untagged";
        let str = String(val).trim();
        str = str.replace(/[^a-zA-Z0-9]+$/, '');
        return str.replace(/\s+/g, ' ').trim() || "Untagged";
      };

      (clicks || []).forEach((c: any) => {
        const tag = normalizeTag(c.tag_link);
        if (!tagMap[tag]) tagMap[tag] = { clicks: 0, orders: 0, commission: 0 };
        tagMap[tag].clicks += 1;

        const plat = c.technical_source || "Others";
        platMap[plat] = (platMap[plat] || 0) + 1;

        // Daily aggregation
        const dateStr = c.click_time ? new Date(c.click_time).toISOString().split("T")[0] : "unknown";
        const dailyKey = `${dateStr}|${tag}`;
        if (!dailyMap[dailyKey]) dailyMap[dailyKey] = { clicks: 0, orders: 0, commission: 0 };
        dailyMap[dailyKey].clicks += 1;
      });

      // Process aggregated commission/orders from daily_records
      (comms || []).forEach((c: any) => {
        let tag = "Untagged";
        if (c.source && c.source.includes(" >>> ")) {
          tag = normalizeTag(c.source.split(" >>> ")[1]);
        }

        if (!tagMap[tag]) tagMap[tag] = { clicks: 0, orders: 0, commission: 0 };
        tagMap[tag].orders += c.orders || 0;
        tagMap[tag].commission += Number(c.commission) || 0;

        // Daily orders aggregation
        const dateStr = c.date ? c.date.split("T")[0] : "unknown";
        const dailyKey = `${dateStr}|${tag}`;
        if (!dailyMap[dailyKey]) dailyMap[dailyKey] = { clicks: 0, orders: 0, commission: 0 };
        
        dailyMap[dailyKey].orders += c.orders || 0;
        dailyMap[dailyKey].commission += Number(c.commission) || 0;
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

      // Build daily grouped breakdown
      const groupedByDate: Record<string, DailyGroup> = {};
      Object.entries(dailyMap).forEach(([key, v]) => {
        if (key.startsWith("unknown")) return;
        const [date, tag] = key.split("|");
        if (!groupedByDate[date]) {
          groupedByDate[date] = { date, totalClicks: 0, totalOrders: 0, totalCommission: 0, tags: [] };
        }
        groupedByDate[date].totalClicks += v.clicks;
        groupedByDate[date].totalOrders += v.orders;
        groupedByDate[date].totalCommission += v.commission;
        groupedByDate[date].tags.push({
          tag,
          clicks: v.clicks,
          orders: v.orders,
          commission: v.commission,
          conversionRate: v.clicks > 0 ? (v.orders / v.clicks) * 100 : 0
        });
      });

      const groupedDailyData = Object.values(groupedByDate)
        .sort((a, b) => b.date.localeCompare(a.date)) // Sort descending by date
        .map(group => {
          group.tags.sort((a, b) => b.commission - a.commission || b.clicks - a.clicks); // Sort tags by commission first, then clicks
          return group;
        });

      setTagData(tags);
      setPlatformData(plats);
      setDailyGroups(groupedDailyData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredDailyGroups = useMemo(() => {
    setDailyPage(1);
    if (!search) return dailyGroups;
    return dailyGroups.map(group => ({
      ...group,
      tags: group.tags.filter(t => t.tag.toLowerCase().includes(search.toLowerCase()))
    })).filter(group => group.tags.length > 0);
  }, [dailyGroups, search]);

  const itemsPerPage = 5; // Show 5 days per page
  const totalPages = Math.ceil(filteredDailyGroups.length / itemsPerPage);
  const paginatedDailyData = useMemo(() => {
    const s = (dailyPage - 1) * itemsPerPage;
    return filteredDailyGroups.slice(s, s + itemsPerPage);
  }, [filteredDailyGroups, dailyPage]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const fmt = (v: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-black selection:bg-violet-500/30">
        <TopBar
          title="Click Analytics"
          description="Tag link performance & conversion intelligence."
          action={
            <div className="flex items-center gap-2 md:gap-3">
              <UploadTutorial type="clicks" />
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-violet-500/20 active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Upload Click Data</span><span className="sm:hidden">Upload</span>
              </button>
            </div>
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

              {/* DAY-BY-DAY TAG LINK FEED */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2 pb-2">
                  <CalendarDays className="w-4 h-4 text-violet-500" />
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Daily Traffic Feed</h3>
                </div>

                {paginatedDailyData.length === 0 ? (
                  <div className="py-12 text-center bg-slate-900/20 rounded-xl border border-white/5">
                    <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">No daily data available. Upload click CSV to get started.</p>
                  </div>
                ) : paginatedDailyData.map((dayGroup, idx) => {
                  const isToday = dayGroup.date === new Date().toISOString().split("T")[0];
                  return (
                    <div key={dayGroup.date} className={`flex flex-col bg-slate-900/40 backdrop-blur-2xl border ${isToday ? "border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.1)]" : "border-white/5"} rounded-xl overflow-hidden transition-all duration-300`}>
                      
                      {/* DAY HEADER */}
                      <div 
                        onClick={() => toggleDate(dayGroup.date)}
                        className="p-3 md:p-4 border-b border-white/5 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.03] transition-colors group select-none"
                      >
                        <div className="flex items-center gap-3">
                          {isToday && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />}
                          <span className={`text-base font-black tracking-tight ${isToday ? "text-amber-400" : "text-white"}`}>{dayGroup.date}</span>
                          {isToday && <span className="text-[7px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-widest">Today</span>}
                        </div>
                        
                        <div className="flex items-center gap-5">
                          <div className="flex flex-col items-end">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Clicks</span>
                            <span className="text-xs font-black text-white">{dayGroup.totalClicks.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Orders</span>
                            <span className="text-xs font-black text-blue-400">{dayGroup.totalOrders.toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Commission</span>
                            <span className="text-xs font-black text-emerald-400">{fmt(dayGroup.totalCommission)}</span>
                          </div>
                          <div className="pl-3 border-l border-white/10 flex items-center justify-center">
                            <ChevronDown className={`w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-all duration-300 ${expandedDates.has(dayGroup.date) ? "rotate-180 text-violet-500" : ""}`} />
                          </div>
                        </div>
                      </div>

                      {/* TAG LIST FOR THE DAY */}
                      {expandedDates.has(dayGroup.date) && (
                        <div className="p-0 animate-in slide-in-from-top-2 fade-in duration-300">
                          {/* Desktop Table Header */}
                        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/5 bg-slate-900/50">
                          <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Rank</div>
                          <div className="col-span-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">Tag Link</div>
                          <div className="col-span-3 text-[9px] font-black text-slate-600 uppercase tracking-widest">Traffic Share</div>
                          <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">Orders</div>
                          <div className="col-span-1 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center">CVR</div>
                          <div className="col-span-2 text-[9px] font-black text-slate-600 uppercase tracking-widest text-right pr-4">Commission</div>
                        </div>

                        {/* Tag Rows */}
                        <div className="divide-y divide-white/5">
                          {dayGroup.tags.map((tagObj, tIdx) => {
                            const share = dayGroup.totalClicks > 0 ? (tagObj.clicks / dayGroup.totalClicks) * 100 : 0;
                            return (
                              <div key={`${dayGroup.date}-${tagObj.tag}`} className="group hover:bg-white/[0.02] transition-colors p-4 md:grid md:grid-cols-12 md:gap-4 md:items-center flex flex-col gap-3">
                                
                                {/* Rank & Tag (Mobile + Desktop) */}
                                <div className="md:col-span-5 flex items-center gap-3">
                                  <div className="md:w-full md:grid md:grid-cols-5 md:gap-4 md:items-center flex items-center gap-3 w-full">
                                    <div className="md:col-span-1 flex justify-center shrink-0">
                                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${tIdx === 0 ? "bg-amber-500/20 text-amber-500" : tIdx === 1 ? "bg-slate-300/20 text-slate-300" : tIdx === 2 ? "bg-amber-700/20 text-amber-600" : "bg-slate-800 text-slate-500"}`}>
                                        {tIdx + 1}
                                      </span>
                                    </div>
                                    <div className="md:col-span-4 flex-1 min-w-0">
                                      <span className="text-[11px] font-bold text-white truncate block">{tagObj.tag}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Traffic Share Bar */}
                                <div className="md:col-span-3 flex flex-col justify-center gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-violet-400">{tagObj.clicks.toLocaleString()} clicks</span>
                                    <span className="text-[9px] font-black text-slate-500">{share.toFixed(1)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${share}%` }} />
                                  </div>
                                </div>

                                {/* Metrics Desktop / Mobile Grid */}
                                <div className="md:col-span-4 md:grid md:grid-cols-4 md:gap-4 flex items-center justify-between border-t border-white/5 md:border-t-0 pt-3 md:pt-0 mt-1 md:mt-0">
                                  <div className="md:col-span-1 flex flex-col md:items-center">
                                    <span className="md:hidden text-[7px] font-black text-slate-500 uppercase tracking-widest">Orders</span>
                                    <span className="text-[11px] font-black text-white md:text-blue-400">{tagObj.orders}</span>
                                  </div>
                                  <div className="md:col-span-1 flex flex-col md:items-center">
                                    <span className="md:hidden text-[7px] font-black text-slate-500 uppercase tracking-widest">CVR</span>
                                    <span className={`text-[11px] font-black ${tagObj.conversionRate > 5 ? "text-emerald-400" : tagObj.conversionRate > 0 ? "text-amber-400" : "text-slate-500"}`}>
                                      {tagObj.conversionRate.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="md:col-span-2 flex flex-col items-end md:pr-4">
                                    <span className="md:hidden text-[7px] font-black text-slate-500 uppercase tracking-widest">Comm</span>
                                    <span className="text-[11px] font-black text-emerald-400">{fmt(tagObj.commission)}</span>
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-2 bg-slate-900/40 border border-white/10 py-3 px-6 rounded-xl shadow-xl mt-6 w-fit mx-auto">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setDailyPage(p => Math.max(1, p - 1))} disabled={dailyPage === 1} className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button key={page} onClick={() => setDailyPage(page)} className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all border ${dailyPage === page ? "bg-violet-600 border-transparent text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-500 hover:text-white"}`}>
                              {page}
                            </button>
                          );
                        })}
                        {totalPages > 5 && <span className="text-slate-600 text-[10px] font-black px-1">...{totalPages}</span>}
                      </div>
                      <button onClick={() => setDailyPage(p => Math.min(totalPages, p + 1))} disabled={dailyPage === totalPages} className="p-2 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-all active:scale-95">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
