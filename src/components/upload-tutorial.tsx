"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, X, AlertTriangle, Lightbulb } from "lucide-react";

interface UploadTutorialProps {
  type: "dashboard" | "orders" | "clicks";
}

export function UploadTutorial({ type }: UploadTutorialProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Content for each tutorial type
  const content = {
    dashboard: {
      title: "Tutorial Upload Data Dasbor",
      subtitle: "Universal Power Sync",
      steps: [
        {
          title: "Download CSV Laporan Pendapatan (Shopee)",
          desc: "Buka Shopee Affiliate > Laporan > Laporan Pendapatan. Export data ke CSV. File ini berisi komisi dan pesanan."
        },
        {
          title: "Download CSV Kinerja Iklan (Meta Ads)",
          desc: "Buka Meta Ads Manager > Campaigns/Ad Sets > Export ke CSV. Pastikan ada kolom 'Amount Spent' (Pengeluaran)."
        },
        {
          title: "Upload Semua File Sekaligus",
          desc: "Klik tombol Upload, pilih semua file CSV tadi (Shopee dan Meta) secara bersamaan. Sistem akan mengelompokkan secara otomatis."
        }
      ],
      warning: "Jangan pernah mengubah nama kolom di dalam file CSV agar sistem bisa membaca data dengan benar."
    },
    orders: {
      title: "Tutorial Upload Status Pesanan",
      subtitle: "Fulfillment Matrix",
      steps: [
        {
          title: "Download CSV Laporan Pesanan (Shopee)",
          desc: "Buka Shopee Affiliate > Laporan > Laporan Pesanan (Order Report). Export data ke CSV."
        },
        {
          title: "Pastikan Status Pesanan",
          desc: "File CSV ini wajib memiliki kolom 'Order Status' (Status Pesanan) seperti Selesai, Dibatalkan, atau Dikembalikan."
        },
        {
          title: "Upload Khusus Pesanan",
          desc: "Upload file ini HANYA di halaman Order Reports ini agar tidak merusak data komisi di dasbor."
        }
      ],
      warning: "Upload file Laporan Pesanan ke Dasbor (Universal Sync) akan otomatis ditolak oleh sistem untuk mencegah error."
    },
    clicks: {
      title: "Tutorial Upload Data Klik",
      subtitle: "Click Analytics",
      steps: [
        {
          title: "Download CSV Klik (Shopee)",
          desc: "Buka Shopee Affiliate > Laporan > Laporan Klik. Pilih rentang waktu dan Export data ke CSV."
        },
        {
          title: "Isi File Klik",
          desc: "File ini biasanya berisi ribuan baris dengan nama 'Klik_...csv'. Di dalamnya ada kolom Click ID, Tag Link, dan Platform."
        },
        {
          title: "Upload Khusus Klik",
          desc: "Upload file CSV Klik di halaman ini. Sistem akan mengisolasi data klik ini khusus untuk keperluan analisa konversi."
        }
      ],
      warning: "File klik berukuran besar. Sistem akan memprosesnya secara bertahap dalam hitungan detik. Harap tunggu hingga selesai."
    }
  };

  const data = content[type];

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-9 h-9 bg-slate-900/80 border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/10 rounded-lg transition-all group"
        title="Tutorial Upload"
      >
        <HelpCircle className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
      </button>

      {/* Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
          <div className="bg-slate-900 border border-t-violet-500/30 border-x-white/5 border-b-white/5 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                  <Lightbulb className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-[11px] font-black text-white uppercase tracking-widest">{data.title}</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{data.subtitle}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500 hover:text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Steps */}
              <div className="space-y-4">
                {data.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 z-10 shrink-0">
                        <span className="text-[10px] font-black text-white">{idx + 1}</span>
                      </div>
                      {idx !== data.steps.length - 1 && (
                        <div className="w-[1px] h-full bg-white/5 mt-1" />
                      )}
                    </div>
                    <div className="flex flex-col pt-0.5 pb-2">
                      <h3 className="text-[11px] font-black text-white tracking-wide">{step.title}</h3>
                      <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Penting</span>
                  <p className="text-[10px] font-bold text-amber-400/80 leading-relaxed">{data.warning}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-slate-950/50 rounded-b-2xl">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-full h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors active:scale-[0.98]"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
