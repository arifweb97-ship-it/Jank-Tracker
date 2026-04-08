"use client";

import { ProfitCalendar } from "@/components/profit-calendar";
import { TopBar } from "@/components/top-bar";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <TopBar 
          title="Profit calendar"
          description="Visualize your historical profitability trends in an intuitive calendar view."
          action={
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border border-white/5 active:scale-95">
              <Download className="w-3 h-3" />
              Snapshot
            </button>
          }
        />

        <div className="p-8 max-w-7xl mx-auto w-full">
          <ProfitCalendar />
        </div>
      </div>
    </ProtectedRoute>
  );
}
