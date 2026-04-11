"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DayData {
  date: string;
  spend: number;
  commission: number;
  profit: number;
}

export function ProfitCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<Record<string, DayData>>({});
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  useEffect(() => {
    async function fetchCalendarData() {
      setLoading(true);
      try {
        if (!user?.id) return;
        const startDate = format(calendarStart, "yyyy-MM-dd");
        const endDate = format(calendarEnd, "yyyy-MM-dd");

        const { data: allRecords } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (!allRecords) return;

        const aggregated: Record<string, DayData> = {};

        allRecords.forEach(rec => {
          if (!aggregated[rec.date]) {
            aggregated[rec.date] = { date: rec.date, spend: 0, commission: 0, profit: 0 };
          }
          
          if (rec.category === 'meta') {
            aggregated[rec.date].spend += Number(rec.spend) || 0;
          } else if (rec.category === 'shopee_comm') {
            aggregated[rec.date].commission += Number(rec.commission) || 0;
          }
        });

        // Calculate Profit for each day
        Object.keys(aggregated).forEach(date => {
          aggregated[date].profit = aggregated[date].commission - aggregated[date].spend;
        });

        setCalendarData(aggregated);
      } catch (error) {
        console.error("Calendar fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendarData();
  }, [currentDate, user]);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
 
  const monthlyStats = Object.values(calendarData)
    .filter(curr => isSameMonth(new Date(curr.date), monthStart))
    .reduce((acc, curr) => {
      acc.spend += curr.spend;
      acc.commission += curr.commission;
      acc.profit += curr.profit;
      return acc;
    }, { spend: 0, commission: 0, profit: 0 });

  return (
    <div className="bg-[#02060E]/60 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl relative group min-h-[600px] md:min-h-[750px] flex flex-col transition-all duration-700 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#C50337]/5 via-transparent to-transparent opacity-30 pointer-events-none" />
      
      {/* PREMIUM HEADER - Responsive Padding & Sizing */}
      <div className="px-4 md:px-8 py-5 md:py-10 border-b border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10 transition-all">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:gap-12">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tightest uppercase italic leading-none">{format(currentDate, "MMMM yyyy")}</h2>
            <div className="flex items-center gap-2">
              <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-[#C50337] animate-pulse" />
              <p className="text-[7px] md:text-[10px] text-slate-500 font-black tracking-[0.2em] md:tracking-[0.3em] uppercase opacity-60">Profit Trajectory Ledger</p>
            </div>
          </div>
          
          {!loading && (
            <div className="grid grid-cols-3 gap-3 md:gap-8 md:flex items-center md:pl-12 md:border-l border-white/10 w-full lg:w-auto">
              {[
                { label: "Spend", val: monthlyStats.spend, color: "text-rose-400" },
                { label: "Gross", val: monthlyStats.commission, color: "text-[#C50337]" },
                { label: "Profit", val: monthlyStats.profit, color: monthlyStats.profit >= 0 ? "text-emerald-400" : "text-rose-400" }
              ].map((s, i) => (
                <div key={i} className="flex flex-col gap-0.5 md:gap-2">
                  <span className="text-[6px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none opacity-50">{s.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-[10px] md:text-xl font-black tracking-tighter leading-none", s.color)}>
                      {s.label === "Profit" && s.val > 0 ? "+" : ""}
                      {new Intl.NumberFormat('id-ID', { notation: 'standard', maximumFractionDigits: 0 }).format(s.val)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-5 w-full lg:w-auto">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C50337]" />}
          <div className="flex gap-1 p-0.5 bg-white/[0.03] border border-white/5 rounded-xl shadow-2xl">
            <button onClick={prevMonth} className="p-1.5 md:p-3 hover:bg-[#C50337]/20 transition-all text-slate-500 hover:text-white active:scale-90 group/btn">
              <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:-translate-x-1 transition-transform" />
            </button>
            <button onClick={nextMonth} className="p-1.5 md:p-3 hover:bg-[#C50337]/20 transition-all text-slate-500 hover:text-white active:scale-90 group/btn">
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      
      {/* DAY NAMES ROW */}
      <div className="grid grid-cols-7 border-b border-white/5 bg-slate-950/40 relative z-10">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <div key={day} className="py-2 md:py-4 text-center text-[6px] md:text-[10px] font-black text-slate-600 tracking-[0.1em] md:tracking-[0.5em] uppercase opacity-40">
            {day}
          </div>
        ))}
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-white/[0.01] gap-px relative z-10 overflow-hidden">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const data = calendarData[dateStr];
          const isToday = isSameDay(day, new Date());
          const isMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={dateStr} 
              className={cn(
                "min-h-[85px] md:min-h-[120px] p-1 md:p-5 relative group transition-all duration-700 overflow-hidden flex flex-col justify-between",
                !isMonth ? "opacity-5 grayscale pointer-events-none" : "bg-slate-900/10 hover:bg-white/[0.04] hover:z-20",
                isMonth ? (data && data.profit >= 0 ? "hover:shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]" : "hover:shadow-[inset_0_0_30px_rgba(244,63,94,0.05)]") : ""
              )}
            >
              {isMonth && data && (
                <div className={cn(
                  "absolute left-0 top-0 right-0 h-[2px] md:h-[3px] transition-all duration-1000 opacity-40 group-hover:opacity-100",
                  data.profit >= 0 
                  ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
                  : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                )} />
              )}

              <div className="flex justify-between items-start">
                <span className={cn(
                  "text-[8px] md:text-[14px] font-black transition-all duration-500",
                  isToday 
                    ? "bg-[#C50337] text-white w-4 h-4 md:w-8 md:h-8 flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(197,3,55,0.4)] scale-110" 
                    : "text-slate-800 group-hover:text-slate-400 group-hover:scale-110"
                )}>
                  {format(day, "d")}
                </span>
                
                {isMonth && data && (
                  <div className={cn(
                    "p-0.5 md:p-2 rounded-lg transition-all duration-1000 md:opacity-0 group-hover:opacity-100 bg-white/5 backdrop-blur-md",
                    data.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {data.profit >= 0 
                      ? <TrendingUp className="w-2 md:w-4 h-2 md:h-4 text-emerald-400" /> 
                      : <TrendingDown className="w-2 md:w-4 h-2 md:h-4 text-rose-400" />
                    }
                  </div>
                )}
              </div>

              {isMonth && data && (
                <div className="space-y-1 md:space-y-3">
                  <div className={cn(
                    "font-black tracking-tightest leading-none transition-all duration-700 group-hover:translate-x-1 whitespace-nowrap overflow-hidden",
                    data.profit >= 0 ? "text-emerald-400" : "text-rose-400",
                    "text-[9px] md:text-[16px]"
                  )}>
                    {data.profit >= 0 ? "+" : ""}
                    {/* ULTRA COMPACT MOBILE: +231k, DESKTOP: Rp 231.169 */}
                    <span className="md:hidden">
                      {Math.abs(data.profit) >= 1000 
                        ? `${(data.profit / 1000).toFixed(0)}k` 
                        : data.profit}
                    </span>
                    <span className="hidden md:inline">
                      {new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(data.profit)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 md:gap-2">
                     <span className={cn(
                       "text-[5.5px] md:text-[9px] font-black px-1 md:px-2 py-0.5 md:py-1 rounded border transition-all duration-700 uppercase tracking-widest leading-none",
                       data.spend > 0 && (data.profit / data.spend) * 100 >= 100 
                         ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                         : data.spend > 0 && (data.profit / data.spend) * 100 > 0 
                         ? "bg-white/5 text-slate-300 border-white/10" 
                         : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                     )}>
                       {data.spend > 0 ? `${((data.profit / data.spend) * 100).toFixed(0)}% ROI` : "0% ROI"}
                     </span>
                  </div>
                </div>
              )}
              
              {/* Inner Focus Light */}
              {isMonth && (
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -mr-12 -mb-12 pointer-events-none" />
              )}
            </div>
            );
        })}
      </div>
    </div>
  );
}
