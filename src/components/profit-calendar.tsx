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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="bg-[#02060E]/60 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl relative group min-h-[700px] flex flex-col transition-all duration-700">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#C50337]/5 via-transparent to-transparent opacity-30 pointer-events-none" />
      
      <div className="px-8 py-8 border-b border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-white tracking-tightest uppercase italic leading-none">{format(currentDate, "MMMM yyyy")}</h2>
            <p className="text-[10px] text-slate-500 font-black tracking-[0.3em] uppercase opacity-60">Profit Trajectory Ledger</p>
          </div>
          
          {!loading && (
            <div className="flex items-center gap-4 pl-8 border-l border-white/10">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 grayscale opacity-50">Monthly Spend</span>
                <span className="text-[14px] font-black text-rose-400 tracking-tighter leading-none">{formatCurrency(monthlyStats.spend)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 grayscale opacity-50">Monthly Gross</span>
                <span className="text-[14px] font-black text-[#C50337] tracking-tighter leading-none">{formatCurrency(monthlyStats.commission)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5 grayscale opacity-50">Monthly Profit</span>
                <span className={cn(
                  "text-[14px] font-black tracking-tighter leading-none",
                  monthlyStats.profit >= 0 ? "text-emerald-400" : "text-[#C50337]"
                )}>
                  {monthlyStats.profit >= 0 ? "+" : ""}{formatCurrency(monthlyStats.profit)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#C50337]" />}
          <div className="flex gap-1 p-1 bg-white/[0.02] border border-white/5 rounded-lg shadow-inner">
            <button onClick={prevMonth} className="px-3 py-2 hover:bg-[#C50337]/20 border border-transparent hover:border-[#C50337]/30 transition-all text-slate-500 hover:text-white active:scale-95 group/btn">
              <ChevronLeft className="w-4 h-4 group-hover/btn:-translate-x-0.5 transition-transform" />
            </button>
            <button onClick={nextMonth} className="px-3 py-2 hover:bg-[#C50337]/20 border border-transparent hover:border-[#C50337]/30 transition-all text-slate-500 hover:text-white active:scale-95 group/btn">
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-white/5 bg-slate-950/40 relative z-10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-3 text-center text-[9px] font-black text-slate-600 tracking-[0.4em] uppercase opacity-40">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-white/[0.01] gap-px relative z-10">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const data = calendarData[dateStr];
          const isToday = isSameDay(day, new Date());
          const isMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={dateStr} 
              className={cn(
                "min-h-[110px] p-4 relative group transition-all duration-500 overflow-hidden",
                !isMonth ? "opacity-5 grayscale pointer-events-none" : "bg-slate-900/10 hover:bg-white/[0.03] hover:z-20",
                isMonth ? (data && data.profit >= 0 ? "hover:shadow-[inset_0_0_20px_rgba(16,185,129,0.03)]" : "hover:shadow-[inset_0_0_20px_rgba(244,63,94,0.03)]") : ""
              )}
            >
              {/* Top Boundary Status Glow */}
              {isMonth && data && (
                <div className={cn(
                  "absolute left-0 top-0 right-0 h-[3px] transition-all duration-700 opacity-60 group-hover:opacity-100",
                  data.profit >= 0 
                  ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]" 
                  : "bg-[#C50337] shadow-[0_0_15px_rgba(197,3,55,0.6)]"
                )} />
              )}

              <div className="flex justify-between items-start mb-3">
                <span className={cn(
                  "text-[12px] font-black transition-all duration-500",
                  isToday 
                    ? "bg-[#C50337] text-white w-6 h-6 flex items-center justify-center rounded-lg shadow-[0_0_15px_rgba(197,3,55,0.4)]" 
                    : "text-slate-700 group-hover:text-slate-400 group-hover:scale-110"
                )}>
                  {format(day, "d")}
                </span>
                {isMonth && data && (
                  <div className={cn(
                    "p-1.5 rounded-lg transition-all duration-700 opacity-20 group-hover:opacity-100 group-hover:rotate-12",
                    data.profit >= 0 ? "bg-emerald-500/10" : "bg-[#C50337]/10"
                  )}>
                    {data.profit >= 0 
                      ? <TrendingUp className="w-3 h-3 text-emerald-400" /> 
                      : <TrendingDown className="w-3 h-3 text-[#C50337]" />
                    }
                  </div>
                )}
              </div>

              {isMonth && data && (
                <div className="space-y-2.5">
                  <div className={cn(
                    "text-[14px] font-black tracking-tightest leading-none transition-all duration-500 group-hover:translate-x-1",
                    data.profit >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {data.profit >= 0 ? "+" : ""}
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.profit)}
                  </div>

                  <div className="flex flex-col gap-1 items-start">
                    <div className="flex items-center gap-1.5 leading-none">
                       <span className={cn(
                         "text-[8px] font-black px-1.5 py-0.5 border transition-all duration-500 uppercase tracking-widest",
                         data.spend > 0 && (data.profit / data.spend) * 100 >= 100 
                           ? "bg-emerald-500 text-slate-950 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                           : data.spend > 0 && (data.profit / data.spend) * 100 > 0 
                           ? "bg-[#C50337]/10 text-white border-white/10" 
                           : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                       )}>
                         {data.spend > 0 ? `${((data.profit / data.spend) * 100).toFixed(0)}% ROI` : "0% ROI"}
                       </span>
                       <span className="text-[9px] font-black text-slate-500 tracking-tighter opacity-100 group-hover:text-blue-400 transition-colors">
                         {data.spend > 0 ? (data.commission / data.spend).toFixed(2) : "0.00"}x 
                       </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.03] flex items-center justify-between opacity-30 group-hover:opacity-100 transition-all duration-700">
                    <span className="text-[7px] font-black text-slate-500 tracking-widest uppercase truncate max-w-[70%]">
                      {new Intl.NumberFormat('id-ID', { currency: 'IDR', maximumFractionDigits: 0 }).format(data.commission)}
                    </span>
                    <div className={cn(
                      "w-1 h-1 rounded-full",
                      data.profit >= 0 ? "bg-emerald-500/40" : "bg-rose-500/40"
                    )} />
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
