"use client";

import { useState } from "react";
import { ImportModal } from "@/components/import-modal";
import { Upload, History, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

const recentImports = [
  { id: 1, type: "Meta Ads", date: "2026-04-03", status: "Success", records: 45 },
  { id: 2, type: "Shopee Orders", date: "2026-04-02", status: "Success", records: 120 },
  { id: 3, type: "Shopee Clicks", date: "2026-04-02", status: "Error", records: 0 },
];

export default function ImportPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="p-8 space-y-12 max-w-7xl mx-auto">
        <div className="flex justify-between items-end border-b border-white/5 pb-8 relative">
          <div className="flex flex-col gap-1 relative">
            <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-[#C50337] to-transparent rounded-full shadow-[0_0_15px_rgba(197,3,55,0.3)]" />
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Data ingestion</h2>
            <p className="text-slate-500 font-medium text-sm">Synchronize Meta and Shopee CSV reports to JanK Hub.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#C50337] hover:bg-[#A0022C] text-white px-6 py-3 rounded-lg font-black text-sm transition-all shadow-xl shadow-[#C50337]/20 active:scale-95 flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Initialize Import
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Meta ads", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Shopee orders", icon: FileText, color: "text-orange-400", bg: "bg-orange-500/10" },
            { label: "Shopee clicks", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map((item) => (
            <div key={item.label} className="p-8 border border-white/5 rounded-xl bg-slate-900/40 backdrop-blur-md shadow-2xl flex flex-col items-center gap-4 text-center group hover:-translate-y-1 transition-all">
              <div className={`p-4 rounded-xl ${item.bg}`}>
                <item.icon className={`w-8 h-8 ${item.color}`} />
              </div>
              <div>
                <h3 className="font-black text-lg text-white tracking-tight">{item.label}</h3>
                <p className="text-xs text-slate-500 mt-1">Accepting multi-column UTF-8 CSV</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-slate-500" />
            <h3 className="font-black text-lg text-white tracking-tight">Sync History</h3>
          </div>
          
          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-950/30 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Yield</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentImports.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-white">{item.type}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{item.date}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">{item.records} recs</td>
                    <td className="px-6 py-4 text-xs">
                      <div className={`flex items-center gap-1.5 font-black tracking-tight ${
                        item.status === "Success" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {item.status === "Success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {item.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <ImportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    </ProtectedRoute>
  );
}
