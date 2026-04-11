"use client";

import { useRef, useState } from "react";
import { ProfitCalendar } from "@/components/profit-calendar";
import { TopBar } from "@/components/top-bar";
import { Download, Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";
import { toPng } from "html-to-image";
import { format } from "date-fns";

export default function CalendarPage() {
  const [isCapturing, setIsCapturing] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const handleSnapshot = async () => {
    if (!calendarRef.current) return;
    
    setIsCapturing(true);
    try {
      // Small delay to ensure any hover states or transitions are settled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const dataUrl = await toPng(calendarRef.current, {
        cacheBust: true,
        backgroundColor: '#020617', // Match the background
        style: {
          borderRadius: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `JanK-Calendar-Snapshot-${format(new Date(), "yyyy-MM-dd-HHmm")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Snapshot failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <TopBar 
          title="Profit calendar"
          description="Visualize your historical profitability trends in an intuitive calendar view."
          action={
            <button 
              onClick={handleSnapshot}
              disabled={isCapturing}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all border border-white/5 active:scale-95 shadow-lg shadow-black/20"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-[#C50337]" />
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>Snapshot</span>
                </>
              )}
            </button>
          }
        />

        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full" ref={calendarRef}>
          <ProfitCalendar />
        </div>
      </div>
    </ProtectedRoute>
  );
}
