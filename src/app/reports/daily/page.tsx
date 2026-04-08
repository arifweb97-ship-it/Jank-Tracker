"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Calendar as CalendarIcon,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";
import { format } from "date-fns";
import { TopBar } from "@/components/top-bar";
import { ProtectedRoute } from "@/components/protected-route";
import { ExportModal } from "@/components/export-modal";

interface DailyRecord {
  date: string;
  spend: number;
  commission: number;
  profit: number;
  meta_clicks: number;
  shopee_clicks: number;
  roas: number;
  roi: number;
}

const ROWS_PER_PAGE = 10;

export default function DailyReportPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDailyData() {
      if (!user?.id) return;
      setLoading(true);
      try {
        const { data: allRecords } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false });

        if (!allRecords) return;

        const dateGroups: Record<string, DailyRecord> = {};

        allRecords.forEach(rec => {
          if (!dateGroups[rec.date]) {
            dateGroups[rec.date] = { 
              date: rec.date, spend: 0, commission: 0, profit: 0, 
              meta_clicks: 0, shopee_clicks: 0, roas: 0, roi: 0 
            };
          }
          
          if (rec.category === 'meta') {
            dateGroups[rec.date].spend += Number(rec.spend) || 0;
            dateGroups[rec.date].meta_clicks += Number(rec.clicks) || 0;
          } else if (rec.category === 'shopee_comm') {
            dateGroups[rec.date].commission += Number(rec.commission) || 0;
          } else if (rec.category === 'shopee_click') {
            dateGroups[rec.date].shopee_clicks += Number(rec.clicks) || 0;
          }
        });

        // Finalize calculations
        const finalizedRecords = Object.values(dateGroups).map(record => {
          const profit = record.commission - record.spend;
          const roas = record.spend > 0 ? record.commission / record.spend : 0;
          const roi = record.spend > 0 ? (profit / record.spend) * 100 : 0;
          return { ...record, profit, roas, roi };
        }).sort((a, b) => b.date.localeCompare(a.date));

        setRecords(finalizedRecords);
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDailyData();
  }, [user]);

  // Pagination Logic
  const totalPages = Math.ceil(records.length / ROWS_PER_PAGE);
  const currentRecords = records.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <TopBar 
          title="Daily Performance Reports"
          description="Granular historical data analysis and profitability tracking."
          action={
            <div className="flex items-center gap-2">
               <button 
                onClick={() => setIsExportModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[12px] tracking-tight transition-all shadow-lg shadow-emerald-900/40 active:scale-95"
               >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          }
        />

        <div className="py-8 px-4 md:px-12 max-w-7xl mx-auto w-full space-y-6">
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-[#C50337]" />
              <p className="text-[12px] font-bold text-slate-400">Compiling Analytical Records...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <div className="overflow-x-auto overflow-y-auto max-h-[700px] scrollbar-hide">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 z-30 bg-[#02060E]/95 backdrop-blur-xl border-b border-white/10">
                      <tr className="bg-slate-950/40">
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 sticky top-0 bg-[#02060E] z-30">Date Reported</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-right sticky top-0 bg-[#02060E] z-30">Ad Spend</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-right sticky top-0 bg-[#02060E] z-30">Gross Comm</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-right sticky top-0 bg-[#02060E] z-30">Net Profit</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">ROAS</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">ROI</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">Meta Click</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">Shopee Click</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">Balance</th>
                        <th className="px-3 py-4 text-[11px] font-bold text-slate-500 text-center sticky top-0 bg-[#02060E] z-30">Efficiency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {currentRecords.map((row) => {
                        const balance = row.shopee_clicks - row.meta_clicks;
                        const efficiency = row.meta_clicks > 0 ? (row.shopee_clicks / row.meta_clicks) * 100 : 0;
                        const isBoncos = row.profit < 0;

                        return (
                          <tr key={row.date} className="hover:bg-white/5 transition-colors group">
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-slate-950 rounded overflow-hidden group-hover:bg-[#C50337]/10 transition-colors">
                                  <CalendarIcon className="w-2.5 h-2.5 text-slate-500 group-hover:text-[#C50337]" />
                                </div>
                                <span className="text-[10px] font-black text-white whitespace-nowrap">{format(new Date(row.date), "dd MMM yy")}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-right font-bold text-[10px] text-rose-400">{formatCurrency(row.spend)}</td>
                            <td className="px-3 py-4 text-right font-bold text-[10px] text-[#C50337]">{formatCurrency(row.commission)}</td>
                            <td className={`px-3 py-4 text-right font-black text-[10px] ${isBoncos ? 'bg-rose-500/10 text-rose-500' : 'text-emerald-400'}`}>
                              {formatCurrency(row.profit)}
                            </td>
                            <td className="px-3 py-4 text-center">
                              <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 ${row.roas < 1 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-blue-500/10 border-blue-500/20'} border rounded-md`}>
                                <TrendingUp className={`w-2 h-2 ${row.roas < 1 ? 'text-rose-400' : 'text-blue-400'}`} />
                                <span className={`text-[9px] font-black ${row.roas < 1 ? 'text-rose-400' : 'text-blue-400'}`}>{row.roas.toFixed(2)}x</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                row.roi >= 100 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                row.roi > 0 ? 'bg-[#C50337]/10 text-[#C50337] border border-[#C50337]/20' : 
                                'bg-rose-600 text-white shadow-lg shadow-rose-600/20' // Aggressive Boncos Alert
                              } border`}>
                                {row.roi.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-3 py-4 text-center text-[9px] font-bold text-slate-300">{row.meta_clicks.toLocaleString()}</td>
                            <td className="px-3 py-4 text-center text-[9px] font-bold text-slate-300">{row.shopee_clicks.toLocaleString()}</td>
                            <td className="px-3 py-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-0">
                                <span className={`text-[10px] font-black ${balance < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                  {balance.toLocaleString()}
                                </span>
                                <span className="text-[7px] font-bold text-slate-600">Balance</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-center whitespace-nowrap">
                              <div className="flex flex-col items-center gap-0">
                                <span className={`text-[11px] font-black ${efficiency < 70 ? 'text-rose-500' : 'text-blue-400'}`}>
                                  {efficiency.toFixed(1)}%
                                </span>
                                <span className="text-[7px] font-bold text-slate-600">Success Rate</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION UI */}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-white/10 py-3 px-6 rounded-xl shadow-xl">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex items-center gap-2">
                      {(() => {
                        const pages = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (currentPage > 4) pages.push("...");
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          if (currentPage <= 4) {
                            for (let i = 2; i <= 5; i++) pages.push(i);
                          } else if (currentPage >= totalPages - 3) {
                            for (let i = totalPages - 4; i <= totalPages - 1; i++) pages.push(i);
                          } else {
                            for (let i = start; i <= end; i++) pages.push(i);
                          }
                          if (currentPage < totalPages - 3) pages.push("...");
                          pages.push(totalPages);
                        }
                        return pages.map((p, i) => (
                          p === "..." ? (
                            <span key={`sep-${i}`} className="px-1 text-slate-700 font-black text-[10px]">...</span>
                          ) : (
                            <button
                              key={`page-${p}`}
                              onClick={() => setCurrentPage(p as number)}
                              className={`w-7 h-7 rounded-lg text-[9px] font-black transition-all border ${
                                currentPage === p 
                                  ? "bg-[#C50337] border-transparent text-white shadow-lg shadow-[#C50337]/20" 
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
                      className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 disabled:hover:border-white/5 transition-all"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-white px-2 py-0.5 bg-white/5 rounded-md border border-white/5">Page {currentPage} of {totalPages}</span>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-[10px] font-bold text-slate-600">Analytical Registry Node</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ExportModal 
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          data={records}
        />
      </div>
    </ProtectedRoute>
  );
}
