"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Users, 
  Database,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  Globe,
  Settings as SettingsIcon,
  X,
  Plus,
  Activity,
  Trash2,
  Lock,
  Unlock,
  MoreVertical,
  Phone,
  MapPin,
  User as UserIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TopBar } from "@/components/top-bar";
import { SystemNotice, type NoticeType } from "@/components/system-notice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProtectedRoute } from "@/components/protected-route";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminConsole() {
  const { role } = useAuth();
  const router = useRouter();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Notification System State
  const [notice, setNotice] = useState<{
    isOpen: boolean;
    type: NoticeType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // User Creation State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserAddress, setNewUserAddress] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    // 🛡️ Data Synchronization Protocol
    if (role === "admin") {
      fetchData();
    }
  }, [role]);

  const showSystemNotice = (type: NoticeType, title: string, message: string, onConfirm?: () => void) => {
    setNotice({ isOpen: true, type, title, message, onConfirm });
  };

  const closeNotice = () => setNotice(prev => ({ ...prev, isOpen: false }));

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const [{ data: profiles, error: pError }, { data: requests, error: rError }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("access_requests").select("*").order("created_at", { ascending: false })
      ]);
      
      if (pError) throw pError;
      if (rError) throw rError;

      const profileEmails = new Set(profiles?.map(p => p.email.toLowerCase()) || []);
      const pending = (requests || [])
        .filter(r => !profileEmails.has(r.email.toLowerCase()))
        .map(r => ({
          id: r.id,
          email: r.email,
          full_name: r.full_name,
          phone: r.phone,
          address: r.address,
          role: "user", 
          created_at: r.created_at,
          is_pending: true,
          is_locked: r.is_locked
        }));

      const unified = [
        ...(profiles || []).map(p => ({ ...p, is_pending: false })),
        ...pending
      ]
      .filter(user => user.role !== 'admin')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setData(unified);
    } catch (e: any) {
      setDbError(e.message || "Database connection failure.");
    } finally {
      setLoading(false); 
    }
  };

  const handleDeleteUser = async (user: any) => {
    showSystemNotice(
      'confirm',
      'Delete Identity Node',
      `Are you sure you want to permanently delete node ${user.email}? This action cannot be undone.`,
      async () => {
        try {
          if (user.is_pending) {
            await supabase.from("access_requests").delete().eq("id", user.id);
          } else {
            await supabase.from("profiles").delete().eq("id", user.id);
          }
          closeNotice();
          fetchData();
          showSystemNotice('success', 'Node Purged', 'The identity has been removed from registry.');
        } catch (err: any) {
          showSystemNotice('error', 'Execution Failure', err.message);
        }
      }
    );
  };

  const handleToggleLock = async (user: any) => {
    const newStatus = !user.is_locked;
    try {
      if (user.is_pending) {
        await supabase.from("access_requests").update({ is_locked: newStatus }).eq("id", user.id);
      } else {
        await supabase.from("profiles").update({ is_locked: newStatus }).eq("id", user.id);
      }
      fetchData();
      showSystemNotice('success', 'Security Registry Updated', `Identity lock status synchronized.`);
    } catch (err: any) {
      showSystemNotice('error', 'Encryption Error', err.message);
    }
  };

  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenu && !(e.target as Element).closest('.manage-menu-container')) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        if (editingUser.is_pending) {
           await supabase.from("access_requests").update({
            full_name: newUserName,
            phone: newUserPhone,
            address: newUserAddress
           }).eq("id", editingUser.id);
        } else {
           await supabase.from("profiles").update({
            full_name: newUserName,
            phone: newUserPhone,
            address: newUserAddress
           }).eq("id", editingUser.id);
        }
      } else {
        const { error } = await supabase.from("access_requests").upsert([{
          email: newUserEmail,
          full_name: newUserName,
          phone: newUserPhone,
          address: newUserAddress,
          status: 'approved'
        }], { onConflict: 'email' });
        
        if (error) throw error;
      }
      setShowAddUser(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPhone("");
      setNewUserAddress("");
      setEditingUser(null);
      fetchData();
      showSystemNotice('success', 'Identity Initialized', 'Secure node registered in global database.');
    } catch (err: any) {
      showSystemNotice('error', 'Registry Failure', err.message);
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="p-12 relative animate-in fade-in duration-1000 overflow-x-hidden">
      {/* EXECUTIVE SYSTEM NOTICE MODAL */}
      <SystemNotice 
         isOpen={notice.isOpen}
         onClose={closeNotice}
         onConfirm={notice.onConfirm}
         type={notice.type}
         title={notice.title}
         message={notice.message}
         confirmLabel={notice.type === 'confirm' ? 'YES, DELETE' : 'OK'}
         cancelLabel="CANCEL"
      />

      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#C50337]/5 blur-[120px] rounded-full -z-10" />

      <header className="flex justify-between items-end mb-16 px-2">
         <div className="flex flex-col">
            <h2 className="text-4xl font-extrabold text-white tracking-tighter capitalize">
              User Directory
            </h2>
            <p className="text-[11px] font-semibold text-slate-500 tracking-[0.05em] mt-3 italic">
              Platform Governance Hub
            </p>
         </div>
         <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setEditingUser(null);
                setNewUserEmail("");
                setNewUserName("");
                setNewUserPhone("");
                setNewUserAddress("");
                setShowAddUser(true);
              }}
              className="px-6 py-2 bg-[#C50337] text-white text-[11px] font-bold tracking-widest flex items-center gap-2 hover:bg-[#A0022C] transition-all rounded shadow-lg shadow-[#C50337]/20"
            >
              <Plus className="w-4 h-4" /> Generate User
            </button>
            <div className="px-4 py-2 bg-slate-900 border border-white/5 flex items-center gap-3 shadow-xl rounded">
               <Database className="w-4 h-4 text-slate-600" />
               <span className="text-[10px] font-bold text-slate-400 tracking-widest pointer-events-none">Stable</span>
            </div>
         </div>
      </header>

      {/* Generator Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-slate-900 border border-white/5 w-full max-w-md p-10 shadow-2xl rounded-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
              <button onClick={() => { setShowAddUser(false); setEditingUser(null); }} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tighter">{editingUser ? 'Edit Identity Node' : 'Generate New Identity'}</h3>
              <p className="text-slate-500 text-xs mb-8">{editingUser ? 'Update the registry information for this user node.' : 'Register a new secure node in the platform registry.'}</p>
              <form onSubmit={handleCreateUser} className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 tracking-wider">Full Name</label>
                       <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="John Doe"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 tracking-wider">Email Address</label>
                       <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="user@jank.id"/>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">Phone Number</label>
                    <input type="text" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="+62..."/>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-wider">Physical Address</label>
                    <textarea rows={2} value={newUserAddress} onChange={(e) => setNewUserAddress(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg resize-none transition-all font-bold" placeholder="Enter full address..."/>
                 </div>

                 <button type="submit" className="w-full py-4 bg-[#C50337] text-white font-bold text-[11px] tracking-wider hover:bg-[#A0022C] transition-all rounded-lg shadow-xl shadow-[#C50337]/10 active:scale-95">
                   {editingUser ? 'Save Identity Changes' : 'Initialize Identity Node'}
                 </button>
              </form>
           </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
           <Loader2 className="w-12 h-12 animate-spin text-[#C50337]" />
        </div>
      ) : dbError ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] border border-white/5 bg-slate-900/10 p-12 text-center rounded-2xl">
           <AlertTriangle className="w-12 h-12 text-[#C50337] mb-6" />
           <p className="text-slate-500 font-bold mb-4">{dbError}</p>
           <button onClick={fetchData} className="px-8 py-3 bg-[#C50337] text-white text-[10px] font-bold uppercase rounded">Retry Link</button>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-2 duration-700">
        <div className="bg-slate-900/50 border border-white/5 shadow-2xl rounded-xl relative z-30">
              <table className="w-full text-left border-collapse">
                 <thead className="bg-[#02060E] border-b border-white/5">
                    <tr>
                       <th className="px-8 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Identity Node</th>
                       <th className="px-8 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Assignment</th>
                       <th className="px-8 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Contact Node</th>
                       <th className="px-8 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Deployment</th>
                       <th className="px-8 py-6 text-[11px] font-bold text-slate-500 tracking-wider text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {data.map((p) => (
                       <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                           <td className="px-8 py-4">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-slate-950 border border-white/10 flex items-center justify-center rounded-lg shadow-inner group-hover:border-[#C50337]/50 transition-all duration-500">
                                    {p.full_name ? <UserIcon className="w-5 h-5 text-[#C50337]" /> : <Users className="w-5 h-5 text-slate-700 group-hover:text-white transition-colors" />}
                                 </div>
                                 <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-black text-white tracking-tight leading-none">{p.full_name || "Unknown Identity"}</span>
                                    <span className="text-[9px] font-medium text-slate-500 tracking-wide opacity-80">{p.email}</span>
                                    <div className="flex items-center gap-2.5 mt-1">
                                      <span className="px-1.5 py-0.5 bg-slate-800/40 text-[7px] font-bold text-slate-600 tracking-wider rounded-sm border border-white/5">{p.id.slice(0, 8)}</span>
                                    </div>
                                 </div>
                             </div>
                           </td>
                           <td className="px-8 py-4">
                             <div className="flex items-center gap-2">
                                <span className={cn(
                                   "px-3 py-1 text-[9px] font-bold tracking-wider rounded-full border transition-all duration-500 capitalize",
                                   p.role === 'admin' 
                                    ? "bg-[#C50337]/10 text-[#C50337] border-[#C50337]/20" 
                                    : "bg-slate-900/50 text-slate-500 border-white/5"
                                )}>
                                   {p.role}
                                </span>
                                {p.is_locked && (
                                  <span className="px-2.5 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[8px] font-bold tracking-wide rounded-full flex items-center gap-1 animate-pulse">
                                    <Lock className="w-2.5 h-2.5" /> Locked
                                  </span>
                                )}
                             </div>
                           </td>
                           <td className="px-8 py-4">
                             <div className="flex flex-col gap-1.5 max-w-[200px]">
                                {p.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-[#C50337]" />
                                    <span className="text-[10px] font-bold text-white tracking-tight">{p.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-600 italic tracking-widest">No Telpon</span>
                                )}
                                {p.address ? (
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-3 h-3 text-[#C50337] shrink-0 mt-0.5" />
                                    <span className="text-[9px] font-bold text-slate-500 leading-tight line-clamp-2">{p.address}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-600 italic tracking-widest">No Alamat</span>
                                )}
                             </div>
                           </td>
                           <td className="px-8 py-4">
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/90 tracking-widest leading-none">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">Deployment</span>
                             </div>
                           </td>
                           <td className="px-8 py-4 text-right relative">
                             <div className="flex justify-end items-center gap-2 manage-menu-container overflow-visible">
                                <button 
                                  onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                                  className={cn(
                                    "px-4 py-2 text-[10px] font-bold tracking-tight transition-all duration-300 rounded-lg flex items-center gap-2.5 border transition-all",
                                    activeMenu === p.id 
                                      ? "bg-[#C50337] text-white border-transparent" 
                                      : "bg-slate-950/30 hover:bg-[#C50337]/10 text-slate-400 hover:text-white border-white/5 hover:border-[#C50337]/20"
                                  )}
                                >
                                  Manage <MoreVertical className="w-3 h-3 opacity-50" />
                                </button>
                                
                                {activeMenu === p.id && (
                                  <div className={cn(
                                    "absolute right-8 w-52 bg-[#0B121F]/98 backdrop-blur-3xl border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)] z-[400] rounded-xl overflow-hidden animate-in fade-in duration-300",
                                    data.indexOf(p) === data.length - 1 ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
                                  )}>
                                     <div className="p-1.5">
                                       <button 
                                         onClick={() => { 
                                           setEditingUser(p);
                                           setNewUserEmail(p.email);
                                           setNewUserName(p.full_name || "");
                                           setNewUserPhone(p.phone || "");
                                           setNewUserAddress(p.address || "");
                                           setShowAddUser(true);
                                           setActiveMenu(null); 
                                         }}
                                         className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[10px] font-bold text-slate-300 hover:bg-[#C50337]/10 hover:text-white transition-all rounded-lg group tracking-tight"
                                       >
                                         <Activity className="w-3.5 h-3.5 text-blue-500 group-hover:scale-110 transition-transform" /> Edit Identity
                                       </button>
                                       <button 
                                         onClick={() => { handleToggleLock(p); setActiveMenu(null); }}
                                         className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[10px] font-bold text-slate-300 hover:bg-amber-500/10 hover:text-white transition-all rounded-lg group tracking-tight"
                                       >
                                         {p.is_locked ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                                         {p.is_locked ? "Unlock Registry" : "Lock Identity"}
                                       </button>
                                       <div className="my-1 border-t border-white/5 mx-2" />
                                       <button 
                                         onClick={() => { handleDeleteUser(p); setActiveMenu(null); }}
                                         className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[10px] font-bold text-rose-500/60 hover:bg-rose-500/10 hover:text-rose-500 transition-all rounded-lg group tracking-tight"
                                       >
                                         <Trash2 className="w-3.5 h-3.5" /> DELETE IDENTITY
                                       </button>
                                     </div>
                                  </div>
                                )}
                             </div>
                           </td>
                       </tr>
                    ))}
                  </tbody>
              </table>
           </div>
        </div>
      )}
      </div>
    </ProtectedRoute>
  );
}
