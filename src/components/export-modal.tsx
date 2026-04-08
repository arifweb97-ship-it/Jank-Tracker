"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, ChevronRight, FileText, CheckCircle2, Loader2, Sparkles, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, subDays, isWithinInterval, parseISO } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
}

type Preset = "today" | "yesterday" | "last7" | "thisMonth" | "lastMonth" | "custom";

export function ExportModal({ isOpen, onClose, data }: ExportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset>("thisMonth");
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Update dates based on preset
  useEffect(() => {
    const today = new Date();
    if (selectedPreset === "today") {
      const d = format(today, "yyyy-MM-dd");
      setStartDate(d); setEndDate(d);
    } else if (selectedPreset === "yesterday") {
      const d = format(subDays(today, 1), "yyyy-MM-dd");
      setStartDate(d); setEndDate(d);
    } else if (selectedPreset === "last7") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (selectedPreset === "thisMonth") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (selectedPreset === "lastMonth") {
      const lastMonth = subMonths(today, 1);
      setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
    }
  }, [selectedPreset]);

  // SAFE FILTER LOGIC
  const filteredData = data.filter(rec => {
    try {
      if (!startDate || !endDate) return false;
      const d = parseISO(rec.date);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return isWithinInterval(d, { start, end });
    } catch {
      return false;
    }
  });

  const handleExport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const brandColor: [number, number, number] = [197, 3, 55]; // #C50337
      const accentDark: [number, number, number] = [15, 23, 42]; // Slate 900
      const successColor: [number, number, number] = [16, 185, 129];
      
      // LUXURY UPGRADE: VERTICAL SIGNATURE RIBBON
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(0, 0, 4, 297, 'F'); // Signature Ribbon on left

      // PREMIUM HEADER
      doc.setFillColor(accentDark[0], accentDark[1], accentDark[2]);
      doc.roundedRect(4, -10, 206, 68, 15, 15, 'F'); 
      
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.rect(4, 0, 206, 4, 'F'); 

      // Logo (Dashboard Symmetric Style - Luxury Edition)
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(34); 
      doc.text("JANK", 18, 24);
      
      const jankWidth = doc.getTextWidth("JANK");
      doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.setFontSize(16);
      doc.text("TRACKER", 18 + jankWidth + 2, 24);

      // Hans Corporation Luxury Label
      doc.setFillColor(30, 41, 59); // Darker blue slate
      doc.roundedRect(18, 32, 38, 7, 1, 1, 'F');
      doc.setTextColor(148, 163, 184); 
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Hans Corporation", 37, 37, { align: 'center' });

      // Elite Metadata Node
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("EXECUTIVE PERFORMANCE REGISTRY", 192, 20, { align: 'right' });
      
      doc.setTextColor(148, 163, 184);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`SESSION_NODE: ${Math.random().toString(36).substring(7).toUpperCase()}`, 192, 26, { align: 'right' });
      doc.text(`LOG_TIMESTAMP: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 192, 30, { align: 'right' });
      
      // Gold-Accented Period Badge
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.roundedRect(138, 38, 54, 11, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      
      let periodText = "N/A";
      try {
        const s = parseISO(startDate);
        const e = parseISO(endDate);
        periodText = `${format(s, "dd MMM")} - ${format(e, "dd MMM")}`;
      } catch (e) {}
      doc.text(periodText, 165, 45, { align: 'center' });

      // LUXURY METRICS (Floating Card Style)
      const totalSpend = filteredData.reduce((a, b) => a + b.spend, 0);
      const totalComm = filteredData.reduce((a, b) => a + b.commission, 0);
      const totalProfit = totalComm - totalSpend;
      const avgRoas = totalSpend > 0 ? totalComm / totalSpend : 0;

      const formatRounded = (val: number) => 
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

      const metrics = [
        { label: "TOTAL EXPENDITURE", value: formatRounded(totalSpend), color: brandColor },
        { label: "GROSS COMMISSION", value: formatRounded(totalComm), color: accentDark },
        { label: "NET PROFITABILITY", value: formatRounded(totalProfit), color: totalProfit >= 0 ? successColor : brandColor },
        { label: "PERFORMANCE ROAS", value: `${avgRoas.toFixed(2)}x`, color: accentDark }
      ];

      metrics.forEach((m, i) => {
        const x = 18 + (i * 46); 
        const y = 72;
        const centerX = x + 21;
        
        // Drop Shadow
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x + 1, y + 1.5, 42, 42, 4, 4, 'F');

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, 42, 42, 4, 4, 'FD'); 
        
        // Golden accent bar
        doc.setFillColor(190, 155, 75); // Luxury Gold
        doc.rect(x + 10, y, 22, 1.5, 'F');

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(m.label, centerX, y + 14, { align: 'center' }); 

        doc.setTextColor(m.color[0], m.color[1], m.color[2]);
        doc.setFontSize(13); // Mega Bold Luxury
        doc.text(m.value, centerX, y + 30, { align: 'center' }); 
      });

      // SECTION HEADER (Elite Badge Style)
      const tableStartY = 130;
      doc.setFillColor(brandColor[0], brandColor[1], brandColor[2]);
      doc.roundedRect(18, tableStartY - 8, 120, 12, 1, 1, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11); 
      doc.text("DAILY PERFORMANCE ANALYTICS LEDGER", 78, tableStartY - 0.5, { align: 'center' });

      // MAIN TABLE (Elite Centered Alignment)
      autoTable(doc, {
        startY: tableStartY + 10,
        head: [['Date', 'Spend', 'Commission', 'Profit', 'ROAS', 'ROI']],
        body: filteredData.map(r => [
          format(parseISO(r.date), "dd/MM/yy"),
          new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(r.spend),
          new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(r.commission),
          new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(r.profit),
          `${r.roas.toFixed(2)}x`,
          `${r.roi.toFixed(1)}%`
        ]),
        headStyles: { 
          fillColor: accentDark, 
          textColor: 255, 
          fontSize: 10, 
          fontStyle: 'bold', 
          halign: 'center',
          cellPadding: 4
        },
        bodyStyles: { 
          fontSize: 9.5, 
          textColor: accentDark, 
          halign: 'center', 
          cellPadding: 3.5 
        },
        alternateRowStyles: { fillColor: [250, 250, 251] },
        columnStyles: { 
          0: { halign: 'center', fontStyle: 'bold' },
          3: { fontStyle: 'bold' }, 
          5: { fontStyle: 'bold' } 
        },
        margin: { left: 18, right: 15 },
        didParseCell: (data) => {
          if (data.section === 'body') {
            if (data.column.index === 3 || data.column.index === 5) {
              const cellText = Array.isArray(data.cell.text) ? data.cell.text.join('') : data.cell.text;
              const val = parseFloat(cellText.replace(/[^-0-9,]/g, '').replace(',', '.'));
              data.cell.styles.textColor = val >= 0 ? successColor : brandColor;
            }
          }
        }
      });

      // FOOTER (Luxury Signature)
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(accentDark[0], accentDark[1], accentDark[2]);
        doc.roundedRect(12, 282, 186, 12, 2, 2, 'F');
        
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(`CERTIFIED ANALYTICS ENGINE | EXCLUSIVE NODE v5.2`, 22, 290);
        doc.text(`PAGE ${i} OF ${pageCount} | HANS CORPORATION OFFICIAL`, 190, 290, { align: 'right' });
      }

      doc.save(`JANK_Executive_Registry_${format(new Date(), "yyyyMMdd")}.pdf`);
      setTimeout(onClose, 500);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const presets = [
    { id: "today", label: "Hari Ini", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "yesterday", label: "Kemarin", icon: <Clock className="w-3.5 h-3.5" /> },
    { id: "last7", label: "7 Hari Terakhir", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "thisMonth", label: "Bulan Ini", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "lastMonth", label: "Bulan Lalu", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "custom", label: "Custom Range", icon: <Sparkles className="w-3.5 h-3.5" /> },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-[14px] font-black text-white tracking-tight">Generate Executive Report</h3>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">Automated Node Export System</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        <div className="p-8 space-y-8">
           
           {/* Presets Grid */}
           <div className="grid grid-cols-2 gap-3">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id as Preset)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    selectedPreset === p.id 
                      ? "bg-[#C50337] border-transparent text-white shadow-lg shadow-[#C50337]/20" 
                      : "bg-slate-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {p.icon}
                    <span className="text-[11px] font-bold tracking-tight">{p.label}</span>
                  </div>
                  {selectedPreset === p.id && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
              ))}
           </div>

           {/* Custom Date Selection */}
           {selectedPreset === "custom" && (
             <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                   <span className="text-[10px] font-black text-slate-600 ml-1">Start Point</span>
                   <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-white font-bold outline-none focus:border-[#C50337]/40 transition-all"
                   />
                </div>
                <div className="space-y-2">
                   <span className="text-[10px] font-black text-slate-600 ml-1">End Point</span>
                   <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-[10px] text-white font-bold outline-none focus:border-[#C50337]/40 transition-all"
                   />
                </div>
             </div>
           )}

           {/* Summary Info */}
           <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black text-slate-500">Report Mapping Summary</span>
                 <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-lg">Ready to Process</span>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 <div className="flex flex-col gap-1">
                    <span className="text-[18px] font-black text-white">{filteredData.length}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Total Daily Records</span>
                 </div>
                 <div className="flex flex-col gap-1 items-end text-right">
                    <span className="text-[11px] font-black text-[#C50337] uppercase tracking-widest">
                       {(() => {
                         try {
                           const s = parseISO(startDate);
                           const e = parseISO(endDate);
                           if (!startDate || !endDate || isNaN(s.getTime()) || isNaN(e.getTime())) return "Select Range";
                           return `${format(s, "dd MMM yy")} - ${format(e, "dd MMM yy")}`;
                         } catch {
                           return "Invalid Range";
                         }
                       })()}
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Active Timeframe</span>
                 </div>
              </div>
           </div>

           {/* Actions */}
           <div className="flex items-center gap-4 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-4 rounded-xl border border-white/5 text-slate-500 text-[11px] font-bold hover:bg-white/5 transition-all outline-none"
              >
                Cancel
              </button>
              <button 
                disabled={filteredData.length === 0 || isGenerating}
                onClick={handleExport}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl py-4 text-[12px] font-extrabold shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-3 outline-none"
              >
                {isGenerating ? (
                   <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                   </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span className="tracking-tight">Generate Executive PDF</span>
                    <ChevronRight className="w-5 h-5 opacity-30" />
                  </>
                )}
              </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
