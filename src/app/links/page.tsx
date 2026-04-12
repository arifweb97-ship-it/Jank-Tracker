"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { 
  Link2, 
  Copy, 
  Check,
  Trash2,
  Search,
  PlusSquare,
  Loader2,
  Play,
  Pause,
  Clock,
  MoreVertical,
  X,
  Target,
  Info,
  Globe,
  Tag,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { SystemNotice, type NoticeType } from "@/components/system-notice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProtectedRoute } from "@/components/protected-route";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AdStatus = 'active' | 'off' | 'pending';

export default function LinkMatrix() {
  const { user } = useAuth();
  
  // Registry State
  const [dbLinks, setDbLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI State
  const [showModal, setShowModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  // Notification System State
  const [notice, setNotice] = useState<{
    isOpen: boolean;
    type: NoticeType;
    title: string;
    message: string;
    onConfirmed?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Data State (Strictly Raw)
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    tag: "",
    status: 'active' as AdStatus
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null); // Format: 'type-id'

  useEffect(() => {
    if (user) {
      fetchLinks();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuId && !(e.target as Element).closest('.auction-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("link_matrix")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDbLinks(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const showSystemNotice = (type: NoticeType, title: string, message: string, onConfirmed?: () => void) => {
    setNotice({ isOpen: true, type, title, message, onConfirmed });
  };

  const closeNotice = () => setNotice(prev => ({ ...prev, isOpen: false }));

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.url.trim()) return;

    setIsProcessing(true);
    
    const prepared = [{
      name: formData.name,
      original_url: formData.url, 
      tagged_url: formData.url,   
      tag: formData.tag || null,  
      status: formData.status,
      user_id: user.id
    }];

    try {
      const { error } = await supabase.from("link_matrix").insert(prepared);
      if (error) throw error;
      
      setFormData({ name: "", url: "", tag: "", status: 'active' });
      setShowModal(false);
      fetchLinks();
      showSystemNotice('success', 'Asset Registered', 'The link has been successfully deployed to the matrix.');
    } catch (err) {
      showSystemNotice('error', 'Execution Error', (err as any).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const setStatus = async (id: string, nextStatus: AdStatus) => {
    try {
      await supabase.from("link_matrix").update({ status: nextStatus }).eq('id', id);
      setActiveMenuId(null);
      fetchLinks();
      showSystemNotice('success', 'Status Switched', `Protocol updated to ${nextStatus.toUpperCase()}.`);
    } catch (err) {
      showSystemNotice('error', 'Switch Error', (err as any).message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showSystemNotice(
      'confirm', 
      'Delete Documentation', 
      `Are you sure you want to permanently delete "${name}" from the matrix registry?`,
      async () => {
        try {
          const { error } = await supabase.from("link_matrix").delete().eq("id", id);
          if (error) throw error;
          closeNotice();
          fetchLinks();
        } catch (err) {
          showSystemNotice('error', 'Delete Failed', (err as any).message);
        }
      }
    );
  };

  const handleCopy = (val: string, type: 'link' | 'tag', id: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopyStatus(`${type}-${id}`);
    setTimeout(() => setCopyStatus(null), 1500);
  };

  const filteredLinks = useMemo(() => {
    setCurrentPage(1);
    const lowSearch = searchTerm.toLowerCase();
    return dbLinks.filter(l => 
      l.name.toLowerCase().includes(lowSearch) || 
      l.original_url.toLowerCase().includes(lowSearch) || 
      (l.tag && l.tag.toLowerCase().includes(lowSearch))
    );
  }, [dbLinks, searchTerm]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
  const paginatedLinks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLinks.slice(start, start + itemsPerPage);
  }, [filteredLinks, currentPage]);

  const totalRegistryCount = filteredLinks.length;

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen relative overflow-visible">
        {/* EXECUTIVE SYSTEM NOTICE MODAL */}
        <SystemNotice 
           isOpen={notice.isOpen}
           onClose={closeNotice}
           onConfirm={notice.onConfirmed}
           type={notice.type}
           title={notice.title}
           message={notice.message}
           confirmLabel={notice.type === 'confirm' ? 'YES, DELETE' : 'OK'}
           cancelLabel="CANCEL"
        />

        <TopBar 
          title="Dokumentasi Link"
          description="Penyimpanan data link dan tag aslinya"
          action={
            <button 
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-[#C50337] text-white text-[8px] font-black uppercase tracking-widest hover:bg-[#A0022C] transition-all rounded shadow-xl flex items-center gap-2"
            >
              <PlusSquare className="w-3.5 h-3.5" /> Upload Link
            </button>
          }
        />

        <div className="py-6 px-4 md:px-12 max-w-7xl mx-auto w-full flex-1">
          
          {showModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
               <div className="bg-slate-900 border border-white/10 w-full max-w-md p-8 shadow-4xl rounded-xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                  <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-700 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                  
                  <div className="flex items-center gap-3 mb-1">
                     <Target className="w-6 h-6 text-[#C50337]" />
                     <h3 className="text-xl font-black text-white capitalize tracking-tighter">Upload Data Asli</h3>
                  </div>
                  <p className="text-slate-500 text-[10px] mb-8 font-bold italic">Simpan link dan tag apa adanya untuk dokumentasi.</p>
                  
                  <form onSubmit={handleRegisterAsset} className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Nama Asset</label>
                          <div className="relative">
                            <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                            <input 
                              type="text"
                              required
                              value={formData.name}
                              onChange={e => setFormData({...formData, name: e.target.value})}
                              className="w-full bg-slate-950 border border-white/10 pl-12 pr-4 py-3 text-white text-[11px] focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold"
                              placeholder="Nama Iklan Anda"
                            />
                          </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest text-left">Link Project</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                          <input 
                            type="text"
                            required
                            value={formData.url}
                            onChange={e => setFormData({...formData, url: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 pl-12 pr-4 py-3 text-white text-[11px] focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold"
                            placeholder="Paste Link Asli di sini"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Taglink</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800" />
                            <input 
                              type="text"
                              value={formData.tag}
                              onChange={e => setFormData({...formData, tag: e.target.value})}
                              className="w-full bg-slate-950 border border-white/10 pl-12 pr-4 py-3 text-white text-[11px] focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold"
                              placeholder="Kode Taglink Asli"
                            />
                          </div>
                      </div>

                      <div className="space-y-2.5">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Status Dokumentasi</label>
                          <div className="flex gap-2.5">
                            {(['active', 'off', 'pending'] as AdStatus[]).map(s => (
                                <button 
                                  key={s}
                                  type="button"
                                  onClick={() => setFormData({...formData, status: s})}
                                  className={cn(
                                    "flex-1 py-3 border rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    formData.status === s ? "bg-[#C50337]/10 border-[#C50337] text-white" : "bg-slate-950 border-white/5 text-slate-600 hover:text-slate-400"
                                  )}
                                >
                                  {s}
                                </button>
                            ))}
                          </div>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-4 bg-[#C50337] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#A0022C] transition-all rounded-lg shadow-2xl flex items-center justify-center gap-4 disabled:opacity-30 active:scale-95"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Target className="w-5 h-5" />}
                      Save Node Registry
                    </button>
                  </form>
               </div>
            </div>
          )}

          <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl animate-in fade-in relative z-30 overflow-visible">
             <div className="px-6 py-5 border-b border-white/5 bg-slate-950/20 flex items-center justify-between">
                <div className="relative max-w-xs flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-700" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950/40 border border-white/5 pl-10 pr-4 py-2 text-white text-[10px] focus:border-[#C50337]/40 outline-none rounded-lg transition-all font-bold"
                    placeholder="Cari dokumentasi link matrix..."
                  />
                </div>
                 <div className="flex items-center gap-6 px-5 py-2 bg-slate-950/40 border border-white/5 rounded-lg">
                    <div className="flex items-center gap-2">
                       <span className="text-[14px] font-black text-white leading-none">{totalRegistryCount}</span>
                       <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-0.5">Total Registry</span>
                    </div>
                 </div>
             </div>

              <div className="relative">
                 {/* DESKTOP TABLE */}
                 <div className="hidden md:block overflow-visible">
                    <table className="w-full text-left border-collapse table-fixed">
                       <thead className="bg-[#02060E]/95 border-b border-white/10 sticky top-0 z-30">
                          <tr className="uppercase tracking-widest text-[8px] font-black text-slate-500">
                             <th className="px-8 py-4 w-[25%] bg-[#02060E]">Nama Asset</th>
                             <th className="px-8 py-4 w-[35%] bg-[#02060E]">Link Dokumentasi</th>
                             <th className="px-8 py-4 w-[20%] text-center bg-[#02060E]">Taglink Registry</th>
                             <th className="px-8 py-4 w-[10%] text-center bg-[#02060E]">Status</th>
                             <th className="px-8 py-4 w-[10%] text-right bg-[#02060E]">Auction</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/[0.03]">
                          {loading ? (
                            <tr><td colSpan={5} className="py-24 text-center opacity-30"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-800" /></td></tr>
                          ) : paginatedLinks.length === 0 ? (
                            <tr><td colSpan={5} className="py-32 text-center opacity-10"><Link2 className="w-16 h-16 mx-auto mb-6 text-slate-800" /><p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p></td></tr>
                          ) : (
                            paginatedLinks.map((link: any, index: number) => (
                               <tr key={link.id} className="hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-8 py-3.5 truncate">
                                     <div className="flex flex-col gap-1">
                                       <span className="text-[10px] font-black text-white truncate capitalize leading-none">{link.name}</span>
                                       <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest mt-1 opacity-60 tracking-tighter">Registered {new Date(link.created_at).toLocaleDateString()}</span>
                                     </div>
                                  </td>

                                  <td className="px-8 py-3.5">
                                     <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-300 font-mono tracking-tighter truncate opacity-90">{link.tagged_url}</span>
                                        <button 
                                          onClick={() => handleCopy(link.tagged_url, 'link', link.id)} 
                                          className="shrink-0 group/copy relative"
                                        >
                                           <div className={cn(
                                              "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                              copyStatus === `link-${link.id}` 
                                                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                                                : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                                           )}>
                                              {copyStatus === `link-${link.id}` ? (
                                                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-300">
                                                  <span className="text-[7.5px] font-black tracking-widest uppercase">Copied</span>
                                                  <Check className="w-3 h-3" />
                                                </div>
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                           </div>
                                        </button>
                                     </div>
                                  </td>

                                  <td className="px-8 py-3.5">
                                     <div className="flex items-center justify-center gap-3">
                                        <span className="text-[10px] font-black text-[#C50337] truncate opacity-90 uppercase tracking-widest">{link.tag || 'SYSTEM'}</span>
                                        {link.tag && (
                                          <button 
                                            onClick={() => handleCopy(link.tag, 'tag', link.id)} 
                                            className="shrink-0 group/copy relative"
                                          >
                                             <div className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                                copyStatus === `tag-${link.id}` 
                                                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" 
                                                  : "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10"
                                             )}>
                                                {copyStatus === `tag-${link.id}` ? (
                                                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-300">
                                                    <span className="text-[7.5px] font-black tracking-widest uppercase">Copied</span>
                                                    <Check className="w-3 h-3" />
                                                  </div>
                                                ) : (
                                                  <Copy className="w-3.5 h-3.5" />
                                                )}
                                             </div>
                                          </button>
                                        )}
                                     </div>
                                  </td>

                                  <td className="px-8 py-3.5">
                                     <div className="flex justify-center">
                                        <div className={cn(
                                            "px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-lg border min-w-[70px] text-center transition-all duration-500",
                                            link.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/10" 
                                            : link.status === 'off' ? "bg-rose-500/10 text-rose-500 border-rose-500/10"
                                            : "bg-amber-500/10 text-amber-500 border-amber-500/10"
                                          )}>
                                           {link.status}
                                        </div>
                                     </div>
                                  </td>

                                  <td className="px-8 py-3.5 text-right relative auction-menu-container overflow-visible">
                                     <button 
                                       onClick={() => setActiveMenuId(activeMenuId === link.id ? null : link.id)}
                                       className={cn("p-2 rounded-lg transition-all", activeMenuId === link.id ? "text-[#C50337] bg-[#C50337]/5" : "text-slate-800 hover:text-white hover:bg-white/5")}
                                     >
                                        <MoreVertical className="w-4 h-4" />
                                      </button>

                                     {activeMenuId === link.id && (
                                       <div className={cn(
                                         "absolute right-8 w-44 bg-[#0B121F] border border-white/10 shadow-4xl z-[400] rounded-xl p-2 animate-in fade-in duration-200 backdrop-blur-xl",
                                         (index >= paginatedLinks.length - 2 && paginatedLinks.length >= 2) ? "bottom-full mb-2 slide-in-from-bottom-1" : "top-full mt-2 slide-in-from-top-1"
                                       )}>
                                          <div className="px-3 py-2 border-b border-white/5 mb-1 opacity-40">
                                             <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Matrix Options</p>
                                          </div>
                                          <button onClick={() => setStatus(link.id, 'active')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all uppercase tracking-widest group">
                                             Protocol Active <Play className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100"/>
                                          </button>
                                          <button onClick={() => setStatus(link.id, 'off')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all uppercase tracking-widest group">
                                             Shutdown <Pause className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100"/>
                                          </button>
                                          <button onClick={() => setStatus(link.id, 'pending')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-all uppercase tracking-widest group">
                                             Queue Pending <Clock className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100"/>
                                          </button>
                                          <div className="h-px bg-white/5 my-1" />
                                          <button onClick={() => handleDelete(link.id, link.name)} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all uppercase tracking-widest group">
                                             Delete Asset <Trash2 className="w-3 h-3 opacity-40 group-hover:opacity-100"/>
                                          </button>
                                       </div>
                                     )}
                                  </td>
                               </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                 </div>

                 {/* MOBILE CARD VIEW */}
                 <div className="md:hidden divide-y divide-white/5">
                    {loading ? (
                       <div className="py-20 text-center opacity-30"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-800" /></div>
                    ) : paginatedLinks.length === 0 ? (
                       <div className="py-20 text-center opacity-10"><p className="text-[10px] font-black uppercase tracking-widest">Registry Empty</p></div>
                    ) : (
                       paginatedLinks.map((link: any, index: number) => (
                          <div key={link.id} className="p-4 space-y-4 hover:bg-white/[0.02] transition-colors relative">
                             <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-1 pr-10">
                                   <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-white capitalize">{link.name}</span>
                                      <div className={cn(
                                         "px-2 py-0.5 text-[7px] font-black uppercase tracking-widest rounded-md border",
                                         link.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/10" 
                                         : link.status === 'off' ? "bg-rose-500/10 text-rose-500 border-rose-500/10"
                                         : "bg-amber-500/10 text-amber-500 border-amber-500/10"
                                      )}>
                                         {link.status}
                                      </div>
                                   </div>
                                   <span className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.2em] opacity-60">Registered {new Date(link.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="relative auction-menu-container">
                                   <button 
                                      onClick={() => setActiveMenuId(activeMenuId === link.id ? null : link.id)}
                                      className={cn("p-2 rounded-lg transition-all", activeMenuId === link.id ? "text-[#C50337] bg-[#C50337]/5" : "text-slate-800 hover:text-white hover:bg-white/5")}
                                   >
                                      <MoreVertical className="w-4 h-4" />
                                   </button>
                                   
                                   {activeMenuId === link.id && (
                                      <div className={cn(
                                        "absolute right-0 w-44 bg-[#0B121F] border border-white/10 shadow-4xl z-[400] rounded-xl p-2 backdrop-blur-xl animate-in fade-in duration-200",
                                        (index >= paginatedLinks.length - 2 && paginatedLinks.length >= 2) ? "bottom-full mb-2 slide-in-from-bottom-1" : "top-full mt-1 slide-in-from-top-1"
                                      )}>
                                         <button onClick={() => setStatus(link.id, 'active')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all uppercase tracking-widest">
                                            Protocol Active <Play className="w-2.5 h-2.5 opacity-40"/>
                                         </button>
                                         <button onClick={() => setStatus(link.id, 'off')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg transition-all uppercase tracking-widest">
                                            Shutdown <Pause className="w-2.5 h-2.5 opacity-40"/>
                                         </button>
                                         <button onClick={() => setStatus(link.id, 'pending')} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-slate-400 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg transition-all uppercase tracking-widest">
                                            Queue Pending <Clock className="w-2.5 h-2.5 opacity-40"/>
                                         </button>
                                         <div className="h-px bg-white/5 my-1" />
                                         <button onClick={() => handleDelete(link.id, link.name)} className="w-full flex items-center justify-between px-3 py-2.5 text-[8px] font-black text-rose-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all uppercase tracking-widest">
                                            Delete Asset <Trash2 className="w-3 h-3 opacity-40"/>
                                         </button>
                                      </div>
                                   )}
                                </div>
                             </div>

                             <div className="grid grid-cols-1 gap-2">
                                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg p-2 group">
                                   <div className="flex flex-col gap-0.5 min-w-0">
                                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Documentation Link</span>
                                      <span className="text-[9px] font-bold text-slate-300 font-mono truncate max-w-[200px]">{link.tagged_url}</span>
                                   </div>
                                   <button 
                                      onClick={() => handleCopy(link.tagged_url, 'link', link.id)}
                                      className={cn(
                                         "p-2 rounded-md transition-all border shrink-0",
                                         copyStatus === `link-${link.id}` ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" : "bg-white/5 border-white/5 text-slate-400"
                                      )}
                                   >
                                      {copyStatus === `link-${link.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3.5 h-3.5" />}
                                   </button>
                                </div>

                                <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-lg p-2 group">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Registry Tag</span>
                                      <span className="text-[10px] font-black text-[#C50337] tracking-widest uppercase">{link.tag || 'SYSTEM'}</span>
                                   </div>
                                   {link.tag && (
                                      <button 
                                         onClick={() => handleCopy(link.tag, 'tag', link.id)}
                                         className={cn(
                                            "p-2 rounded-md transition-all border shrink-0",
                                            copyStatus === `tag-${link.id}` ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-500" : "bg-white/5 border-white/5 text-slate-400"
                                         )}
                                      >
                                         {copyStatus === `tag-${link.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                   )}
                                </div>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </div>

              {/* PAGINATION UI */}
              {totalPages > 1 && (
                 <div className="p-4 border-t border-white/5 bg-slate-950/40 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                       <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 transition-all active:scale-95"
                       >
                          <ChevronLeft className="w-4 h-4" />
                       </button>
                       
                       <div className="flex items-center gap-1.5">
                          {(() => {
                             const pages = [];
                             const maxVisible = 3;
                             if (totalPages <= maxVisible) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                             } else {
                                let start = Math.max(1, currentPage - 1);
                                let end = Math.min(totalPages, currentPage + 1);
                                if (currentPage === 1) end = 3;
                                else if (currentPage === totalPages) start = totalPages - 2;
                                for (let i = start; i <= end; i++) pages.push(i);
                                if (start > 1) {
                                   if (start > 2) pages.unshift("...");
                                   pages.unshift(1);
                                }
                                if (end < totalPages) {
                                   if (end < totalPages - 1) pages.push("...");
                                   pages.push(totalPages);
                                }
                             }
                             return pages.map((p, i) => (
                                p === "..." ? (
                                   <span key={`sep-${i}`} className="px-0.5 text-slate-700 font-black text-[10px]">...</span>
                                ) : (
                                   <button
                                      key={`page-${p}`}
                                      onClick={() => setCurrentPage(p as number)}
                                      className={cn(
                                         "w-7 h-7 rounded-lg text-[9px] font-black transition-all border",
                                         currentPage === p 
                                            ? "bg-[#C50337] border-transparent text-white shadow-lg shadow-[#C50337]/30" 
                                            : "bg-white/5 border-white/5 text-slate-500 hover:text-white hover:border-white/10"
                                      )}
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
                          className="p-1.5 bg-white/5 border border-white/5 rounded-lg text-slate-400 hover:text-white hover:border-[#C50337]/50 disabled:opacity-20 transition-all active:scale-95"
                       >
                          <ChevronRight className="w-4 h-4" />
                       </button>
                    </div>
                    <span className="text-[9px] font-black text-[#C50337]/60 uppercase tracking-[0.2em]">Registry Page {currentPage} of {totalPages}</span>
                 </div>
              )}

             <div className="p-4 bg-slate-950/60 border-t border-white/5 text-[7px] font-black text-slate-700 uppercase tracking-widest flex justify-between px-8">
                <div className="flex items-center gap-3">
                   <span className="opacity-40 tracking-tighter">JanK Documentation Matrix Registry</span>
                   <span className="text-[#C50337] opacity-60">v8.0 High-Definition</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                   <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"/>
                   Platform Synchronized
                </div>
             </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
