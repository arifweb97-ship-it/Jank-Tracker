"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Upload, CheckCircle2, AlertCircle, Loader2, Trash2, Crosshair } from "lucide-react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";
import { parse, format, isValid } from "date-fns";
import { useAuth } from "@/context/auth-context";

interface FileEntry {
  file: File;
}

interface ClickUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ClickUploadModal({ isOpen, onClose, onSuccess }: ClickUploadModalProps) {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    const newEntries: FileEntry[] = files.map(file => ({ file }));
    setQueue(prev => [...prev, ...newEntries]);
  };

  const removeFile = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const cleanDateTime = (val: any): string | null => {
    if (!val) return null;
    let str = String(val).trim();

    // Try ISO-like format first: "2026-04-09 14:30:00"
    if (str.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/)) {
      const jsDate = new Date(str.replace(' ', 'T'));
      if (!isNaN(jsDate.getTime())) return jsDate.toISOString();
    }

    // Try dd/MM/yyyy HH:mm
    if (str.match(/^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/)) {
      const d = parse(str, "dd/MM/yyyy HH:mm:ss", new Date());
      if (isValid(d)) return d.toISOString();
      const d2 = parse(str, "dd/MM/yyyy HH:mm", new Date());
      if (isValid(d2)) return d2.toISOString();
    }

    // Date-only formats
    const dateStr = str.split(' ')[0];
    const dateFormats = [
      "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy/MM/dd", "dd-MM-yyyy"
    ];
    for (const f of dateFormats) {
      const d = parse(dateStr, f, new Date());
      if (isValid(d)) return d.toISOString();
    }

    // JS fallback
    const jsDate = new Date(str);
    if (!isNaN(jsDate.getTime())) return jsDate.toISOString();

    return null;
  };

  const getAliasValue = (row: any, aliases: string[]): any => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().trim() === alias.toLowerCase().trim());
      if (match) return row[match];
    }
    for (const alias of aliases) {
      const match = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()) || alias.toLowerCase().includes(k.toLowerCase()));
      if (match) return row[match];
    }
    return null;
  };

  const normalizeSource = (val: any): string => {
    if (!val) return "Others";
    const s = String(val).trim().toLowerCase();
    if (s.includes("facebook") || s.includes("fb")) return "Facebook";
    if (s.includes("instagram") || s.includes("ig")) return "Instagram";
    if (s.includes("threads")) return "Threads";
    if (s.includes("youtube") || s.includes("yt")) return "YouTube";
    if (s.includes("tiktok")) return "TikTok";
    if (s.includes("google")) return "Google";
    if (s.includes("shopee")) return "Shopee";
    return "Others";
  };

  const handleSync = async () => {
    if (queue.length === 0 || !user?.id) return;
    setIsUploading(true);
    setStatus(null);
    setCurrentProgress(0);

    const CLICK_TIME_ALIASES = ["Click Time", "Waktu Klik", "Tanggal Klik", "Click time", "Date", "Tanggal", "Waktu"];
    const CLICK_ID_ALIASES = ["Click id", "Click ID", "ID Klik", "Click Id"];
    const TAG_ALIASES = ["Tag_link", "Tag_link1", "Tag Link", "Tag_Link", "Link Name", "Custom Link", "Sub ID", "Sub_id1", "Subid", "Sub_id", "Nama Link", "Tag"];
    const PLATFORM_ALIASES = ["Referrer", "Channel", "Saluran", "Placement", "Site Source Name", "Site", "Sumber", "Platform", "Device"];

    const allRows: {
      click_id: string;
      click_time: string | null;
      technical_source: string;
      tag_link: string;
      user_id: string;
    }[] = [];

    const fingerprints = new Set<string>();

    try {
      // Step 1: Fetch ALL existing click_ids to avoid duplicates (Paginated to bypass 1000 limit)
      let fetchMore = true;
      let from = 0;
      const pageSize = 1000;
      
      while (fetchMore) {
        const { data: existingClicks } = await supabase
          .from("shopee_clicks")
          .select("click_id")
          .eq("user_id", user.id)
          .range(from, from + pageSize - 1);
          
        if (existingClicks && existingClicks.length > 0) {
          existingClicks.forEach(c => {
            if (c.click_id) fingerprints.add(c.click_id);
          });
          if (existingClicks.length < pageSize) fetchMore = false;
          else from += pageSize;
        } else {
          fetchMore = false;
        }
      }

      // Step 2: Parse all CSV files
      for (let i = 0; i < queue.length; i++) {
        const entry = queue[i];
        await new Promise((resolve, reject) => {
          Papa.parse(entry.file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              try {
                const data = results.data;
                if (data.length === 0) return resolve(true);

                data.forEach((row: any) => {
                  const clickId = getAliasValue(row, CLICK_ID_ALIASES);
                  const clickIdStr = clickId ? String(clickId).trim() : "";

                  // Skip duplicates
                  if (clickIdStr && fingerprints.has(clickIdStr)) return;
                  if (clickIdStr) fingerprints.add(clickIdStr);

                  const clickTime = cleanDateTime(getAliasValue(row, CLICK_TIME_ALIASES));
                  const rawSource = getAliasValue(row, PLATFORM_ALIASES);
                  const technical = normalizeSource(rawSource);
                  const rawTag = getAliasValue(row, TAG_ALIASES);
                  const tagLink = rawTag ? String(rawTag).trim().replace(/[^a-zA-Z0-9\s_-]+$/g, '').trim() : "Untagged";

                  allRows.push({
                    click_id: clickIdStr || `auto_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                    click_time: clickTime,
                    technical_source: technical,
                    tag_link: tagLink || "Untagged",
                    user_id: user.id
                  });
                });

                resolve(true);
              } catch (innerErr) {
                reject(innerErr);
              }
            },
            error: (err) => reject(err)
          });
        });
        setCurrentProgress(((i + 1) / queue.length) * 50);
      }

      if (allRows.length === 0) {
        throw new Error("No click data found. Check CSV headers (e.g. 'Click id', 'Click Time', 'Tag_link').");
      }

      // Step 3: Insert in batches of 500
      const BATCH_SIZE = 500;
      let inserted = 0;
      for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
        const batch = allRows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from("shopee_clicks").insert(batch);
        if (error) throw new Error(`Insert Error: ${error.message}`);
        inserted += batch.length;
        setCurrentProgress(50 + (inserted / allRows.length) * 50);
      }

      setStatus({ type: "success", message: `Synced ${inserted.toLocaleString()} clicks from ${queue.length} file(s).` });
      setQueue([]);

      if (onSuccess) onSuccess();
      setTimeout(() => { onClose(); setStatus(null); }, 2000);
    } catch (e: any) {
      console.error(e);
      setStatus({ type: "error", message: e.message || "Unknown error during sync." });
    } finally {
      setIsUploading(false);
      setCurrentProgress(100);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
      <div className="bg-slate-900 border border-t-violet-500/30 border-x-white/5 border-b-white/5 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className={`w-4 h-4 text-violet-500 ${isUploading ? 'animate-pulse' : ''}`} />
            <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Click Data Uploader</h2>
          </div>
          <button onClick={onClose} className="p-2"><X className="w-4 h-4 text-slate-500 hover:text-violet-400" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
          {/* INFO BANNER */}
          <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-3 flex items-start gap-3">
            <div className="w-1 h-8 bg-violet-500 rounded-full shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Isolated Upload</span>
              <span className="text-[9px] font-bold text-slate-500 mt-1 leading-relaxed">Data disimpan ke tabel terpisah (shopee_clicks). Tidak mempengaruhi dashboard atau report lain.</span>
            </div>
          </div>

          {/* DROP ZONE */}
          <div className="group border-2 border-dashed border-white/5 rounded-2xl p-6 flex items-center justify-center gap-4 bg-slate-950/30 relative hover:border-violet-500/50 transition-all cursor-pointer">
            <input type="file" multiple accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5 text-violet-500" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Upload Shopee Click CSV</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Format: Klik_*.csv dari Shopee Affiliate</p>
            </div>
          </div>

          {/* FILE QUEUE */}
          {queue.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Click Queue ({queue.length})</span>
                <span className="text-[8px] font-black text-rose-500 uppercase cursor-pointer hover:underline" onClick={() => setQueue([])}>Clear Queue</span>
              </div>

              <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-2 scrollbar-hide">
                {queue.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="text-[10px] font-bold text-white truncate">{entry.file.name}</span>
                        <span className="text-[7px] font-black uppercase text-violet-500/60 mt-1">Click Data • Pending Parse</span>
                      </div>
                      <button onClick={() => removeFile(idx)} className="p-1.5 hover:bg-rose-500/20 rounded-lg group transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-rose-800 group-hover:text-rose-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROGRESS */}
          {isUploading && (
            <div className="space-y-2 py-4">
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${currentProgress}%` }} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">Processing Clicks...</p>
                <p className="text-[8px] font-black text-white uppercase tracking-widest leading-none">{Math.round(currentProgress)}%</p>
              </div>
            </div>
          )}

          {/* STATUS */}
          {status && (
            <div className={`p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 ${
              status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5" />}
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">{status.type === 'success' ? 'Success' : 'Error'}</p>
                <p className="text-[10px] font-bold text-slate-400 leading-relaxed">{status.message}</p>
              </div>
            </div>
          )}

          {/* SYNC BUTTON */}
          <button
            disabled={isUploading || queue.length === 0}
            onClick={handleSync}
            className="w-full h-12 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-violet-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Crosshair className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-500" />
            )}
            <span>{isUploading ? 'Syncing Clicks...' : `Commit ${queue.length} Files`}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
