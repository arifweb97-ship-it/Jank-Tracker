"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";

import { 
  Users, 
  Database,
  Loader2,
  AlertTriangle,
  X,
  Plus,
  Activity,
  Trash2,
  Lock,
  Unlock,
  MoreVertical,
  Phone,
  MapPin,
  User as UserIcon,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3
} from "lucide-react";
import { supabase } from "@/lib/supabase";

import { SystemNotice, type NoticeType } from "@/components/system-notice";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ProtectedRoute } from "@/components/protected-route";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminConsole() {
  const { role } = useAuth();
  
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [userProfits, setUserProfits] = useState<Record<string, { dailyProfit: number; totalProfit: number; latestDate: string | null }>>({});

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

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

      // 📊 Fetch profit data PER USER (same approach as dashboard-hero)
      // Collect all unique user IDs from both tables
      const allUserIds: { id: string; email: string }[] = [];
      (profiles || []).forEach((p: any) => { if (p.id && p.email) allUserIds.push({ id: p.id, email: p.email.toLowerCase() }); });
      (requests || []).forEach((r: any) => { if (r.id && r.email) allUserIds.push({ id: r.id, email: r.email.toLowerCase() }); });

      // Build email -> display ID mapping (for admin table)
      const emailToDisplayId: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { if (p.email) emailToDisplayId[p.email.toLowerCase()] = p.id; });
      (requests || []).forEach((r: any) => { 
        const email = r.email?.toLowerCase();
        if (email && !emailToDisplayId[email]) emailToDisplayId[email] = r.id; 
      });

      const profitMap: Record<string, { dailyProfit: number; totalProfit: number; latestDate: string | null }> = {};

      // Fetch daily_records per user (bypasses 1000 row default limit)
      const profitPromises = allUserIds.map(async ({ id: userId, email }) => {
        const { data: userRecords } = await supabase
          .from("daily_records")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: true });

        if (!userRecords || userRecords.length === 0) return;

        // Group by date
        const dateMap: Record<string, { spend: number; commission: number }> = {};
        userRecords.forEach((rec: any) => {
          if (!dateMap[rec.date]) dateMap[rec.date] = { spend: 0, commission: 0 };
          if (rec.category === 'meta') {
            dateMap[rec.date].spend += Number(rec.spend) || 0;
          } else if (rec.category === 'shopee_comm') {
            dateMap[rec.date].commission += Number(rec.commission) || 0;
          }
        });

        let totalSpend = 0;
        let totalCommission = 0;
        let latestDate: string | null = null;

        Object.entries(dateMap).forEach(([date, vals]) => {
          totalSpend += vals.spend;
          totalCommission += vals.commission;
          if (!latestDate || date > latestDate) latestDate = date;
        });

        const latestDayData = latestDate ? dateMap[latestDate] : { spend: 0, commission: 0 };
        const displayId = emailToDisplayId[email];
        if (displayId) {
          profitMap[displayId] = {
            dailyProfit: latestDayData.commission - latestDayData.spend,
            totalProfit: totalCommission - totalSpend,
            latestDate
          };
        }
      });

      await Promise.all(profitPromises);
      setUserProfits(profitMap);


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
      <div className="p-4 sm:p-8 md:p-12 relative animate-in fade-in duration-1000 overflow-visible">
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

      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 mb-12 md:mb-16 px-2">
         <div className="flex flex-col">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tighter capitalize">
              User Directory
            </h2>
            <p className="text-[10px] md:text-[11px] font-semibold text-slate-500 tracking-[0.05em] mt-2 md:mt-3 italic">
              Platform Governance Hub
            </p>
         </div>
         <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <button 
              onClick={() => {
                setEditingUser(null);
                setNewUserEmail("");
                setNewUserName("");
                setNewUserPhone("");
                setNewUserAddress("");
                setShowAddUser(true);
              }}
              className="flex-1 sm:flex-none px-6 py-3 md:py-2 bg-[#C50337] text-white text-[10px] md:text-[11px] font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-[#A0022C] transition-all rounded shadow-lg shadow-[#C50337]/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> Generate User
            </button>
            <div className="px-4 py-3 md:py-2 bg-slate-900 border border-white/5 flex items-center gap-3 shadow-xl rounded">
               <Database className="w-4 h-4 text-slate-600" />
               <span className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest pointer-events-none">Stable</span>
            </div>
         </div>
      </header>

      {/* Generator Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-slate-900 border border-white/5 w-full max-w-md p-6 md:p-10 shadow-2xl rounded-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => { setShowAddUser(false); setEditingUser(null); }} 
                className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5"/>
              </button>
              
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-tighter">
                {editingUser ? 'Edit Identity Node' : 'Generate New Identity'}
              </h3>
              
              <p className="text-slate-500 text-[10px] md:text-xs mb-8">
                {editingUser ? 'Update the registry information for this user node.' : 'Register a new secure node in the platform registry.'}
              </p>
              
              <form onSubmit={handleCreateUser} className="space-y-4 md:space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-wider">Full Name</label>
                       <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="John Doe"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-wider">Email Address</label>
                       <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="user@jank.id"/>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-wider">Phone Number</label>
                    <input type="text" value={newUserPhone} onChange={(e) => setNewUserPhone(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg transition-all font-bold" placeholder="+62..."/>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-wider">Physical Address</label>
                    <textarea rows={2} value={newUserAddress} onChange={(e) => setNewUserAddress(e.target.value)} className="w-full bg-slate-950 border border-white/5 p-3 text-white text-xs focus:border-[#C50337]/50 outline-none rounded-lg resize-none transition-all font-bold" placeholder="Enter full address..."/>
                 </div>

                 <button type="submit" className="w-full py-4 bg-[#C50337] text-white font-bold text-[10px] md:text-[11px] tracking-wider hover:bg-[#A0022C] transition-all rounded-lg shadow-xl shadow-[#C50337]/10 active:scale-95">
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
          
          {/* MOBILE VIEW CARD REGISTRY */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {data.map((p, index) => (
              <div key={p.id} className="bg-slate-900/40 border border-white/5 p-6 rounded-xl flex flex-col gap-6 relative overflow-visible group">
                 <div className="absolute top-0 right-0 p-4">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all border",
                        activeMenu === p.id 
                          ? "bg-[#C50337] text-white border-transparent" 
                          : "bg-slate-950/30 text-slate-500 border-white/5"
                      )}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenu === p.id && (
                      <div className={cn(
                        "absolute right-4 w-52 bg-[#0B121F] border border-white/10 shadow-2xl z-50 rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200",
                        index > 0 && index === data.length - 1 ? "bottom-20 mb-2" : "top-14 mt-2"
                      )}>
                        <div className="p-1.5 grayscale-[0.5] hover:grayscale-0 transition-all">
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
                             className="w-full flex items-center gap-3 px-3.5 py-3 text-[10px] font-bold text-slate-300 hover:bg-[#C50337]/10 hover:text-white transition-all rounded-lg"
                           >
                             <Activity className="w-3.5 h-3.5 text-blue-500" /> Edit Identity
                           </button>
                           <button 
                             onClick={() => { handleToggleLock(p); setActiveMenu(null); }}
                             className="w-full flex items-center gap-3 px-3.5 py-3 text-[10px] font-bold text-slate-300 hover:bg-amber-500/10 hover:text-white transition-all rounded-lg"
                           >
                             {p.is_locked ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
                             {p.is_locked ? "Unlock Registry" : "Lock Identity"}
                           </button>
                           <div className="my-1 border-t border-white/5 mx-2" />
                           <button 
                             onClick={() => { handleDeleteUser(p); setActiveMenu(null); }}
                             className="w-full flex items-center gap-3 px-3.5 py-3 text-[10px] font-bold text-rose-500/60 hover:bg-rose-500/10 hover:text-rose-500 transition-all rounded-lg"
                           >
                             <Trash2 className="w-3.5 h-3.5" /> DELETE IDENTITY
                           </button>
                        </div>
                      </div>
                    )}
                 </div>

                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 border border-white/10 flex items-center justify-center rounded-xl shrink-0">
                       {p.full_name ? <UserIcon className="w-6 h-6 text-[#C50337]" /> : <Users className="w-6 h-6 text-slate-700" />}
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                       <span className="text-base font-black text-white truncate tracking-tight">{p.full_name || "Unknown Identity"}</span>
                       <span className="text-[10px] font-medium text-slate-500 truncate tracking-wide">{p.email}</span>
                       <span className="mt-1 w-fit px-1.5 py-0.5 bg-slate-800 text-[8px] font-bold text-slate-400 tracking-wider rounded border border-white/5 uppercase">{p.id.slice(0, 8)}</span>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">Assignment</span>
                       <div className="flex flex-wrap gap-2">
                          <span className={cn(
                             "px-2.5 py-0.5 text-[8px] font-black tracking-widest rounded-full border border-white/5 uppercase",
                             p.role === 'admin' ? "bg-[#C50337]/20 text-[#C50337]" : "bg-slate-800 text-slate-400"
                          )}>
                             {p.role}
                          </span>
                          {p.is_locked && (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-500 text-[8px] font-bold tracking-widest rounded-full flex items-center gap-1 border border-rose-500/10">
                              <Lock className="w-2 h-2" /> Locked
                            </span>
                          )}
                       </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                       <span className="text-[9px] font-bold text-slate-600 tracking-widest uppercase">Deployment</span>
                       <span className="text-xs font-black text-white/80">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                    </div>
                 </div>

                 <div className="space-y-3 bg-slate-950/40 p-4 rounded-lg border border-white/5">
                    <div className="flex items-center gap-3">
                       <Phone className="w-3.5 h-3.5 text-[#C50337]" />
                       <span className="text-[11px] font-bold text-slate-300">{p.phone || 'No Telpon Registered'}</span>
                    </div>
                    <div className="flex items-start gap-3">
                       <MapPin className="w-3.5 h-3.5 text-[#C50337] shrink-0 mt-0.5" />
                       <span className="text-[10px] font-medium text-slate-400 leading-relaxed italic line-clamp-2">{p.address || 'Address not registered'}</span>
                    </div>
                 </div>

                 {/* MOBILE: Profit Analytics Section */}
                 <div className="grid grid-cols-2 gap-3">
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${
                      (userProfits[p.id]?.dailyProfit ?? 0) >= 0 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}>
                       <div className={`absolute top-0 right-0 w-12 h-12 blur-2xl -mr-4 -mt-4 ${(userProfits[p.id]?.dailyProfit ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />
                       <div className="relative z-10">
                          <div className="flex items-center gap-1.5 mb-2">
                             <BarChart3 className={`w-3 h-3 ${(userProfits[p.id]?.dailyProfit ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                             <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Profit Harian</span>
                          </div>
                          <span className={`text-sm font-black tracking-tight ${
                            (userProfits[p.id]?.dailyProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {formatCurrency(userProfits[p.id]?.dailyProfit ?? 0)}
                          </span>
                          {userProfits[p.id]?.latestDate && (
                            <span className="block text-[7px] font-bold text-slate-600 mt-1 tracking-wide">
                              {new Date(userProfits[p.id].latestDate!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                       </div>
                    </div>
                    <div className={`p-4 rounded-xl border relative overflow-hidden ${
                      (userProfits[p.id]?.totalProfit ?? 0) >= 0 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-rose-500/5 border-rose-500/20'
                    }`}>
                       <div className={`absolute top-0 right-0 w-12 h-12 blur-2xl -mr-4 -mt-4 ${(userProfits[p.id]?.totalProfit ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`} />
                       <div className="relative z-10">
                          <div className="flex items-center gap-1.5 mb-2">
                             <DollarSign className={`w-3 h-3 ${(userProfits[p.id]?.totalProfit ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
                             <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Total Profit</span>
                          </div>
                          <span className={`text-sm font-black tracking-tight ${
                            (userProfits[p.id]?.totalProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {formatCurrency(userProfits[p.id]?.totalProfit ?? 0)}
                          </span>
                          <span className="block text-[7px] font-bold text-slate-600 mt-1 tracking-wide">Keseluruhan</span>
                       </div>
                    </div>
                 </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW TABLE REGISTRY */}
          <div className="hidden md:block bg-slate-900/50 border border-white/5 shadow-2xl rounded-xl relative z-30 overflow-visible">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-[#02060E] border-b border-white/5">
                      <tr>
                         <th className="px-5 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Identity Node</th>
                         <th className="px-4 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Assignment</th>
                         <th className="px-4 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Contact Node</th>
                         <th className="px-4 py-6 text-[11px] font-bold text-slate-500 tracking-wider text-right">Profit Harian</th>
                         <th className="px-4 py-6 text-[11px] font-bold text-slate-500 tracking-wider text-right">Total Profit</th>
                         <th className="px-4 py-6 text-[11px] font-bold text-slate-500 tracking-wider">Deployment</th>
                         <th className="px-5 py-6 text-[11px] font-bold text-slate-500 tracking-wider text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {data.map((p, index) => (
                         <tr key={p.id} className="group hover:bg-white/[0.02] transition-colors">
                             <td className="px-5 py-4">
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
                             <td className="px-4 py-4">
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
                             <td className="px-4 py-4">
                               <div className="flex flex-col gap-1.5 max-w-[180px]">
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
                             {/* Profit Harian Column */}
                             <td className="px-4 py-4 text-right">
                               <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    {(userProfits[p.id]?.dailyProfit ?? 0) >= 0 
                                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                                      : <TrendingDown className="w-3 h-3 text-rose-500" />
                                    }
                                    <span className={`text-[11px] font-black tracking-tight ${
                                      (userProfits[p.id]?.dailyProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                      {formatCurrency(userProfits[p.id]?.dailyProfit ?? 0)}
                                    </span>
                                  </div>
                                  {userProfits[p.id]?.latestDate && (
                                    <span className="text-[7px] font-bold text-slate-600 tracking-wider">
                                      {new Date(userProfits[p.id].latestDate!).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  )}
                               </div>
                             </td>
                             {/* Total Profit Column */}
                             <td className="px-4 py-4 text-right">
                               <div className="flex flex-col items-end gap-0.5">
                                  <span className={`text-[12px] font-black tracking-tight ${
                                    (userProfits[p.id]?.totalProfit ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}>
                                    {formatCurrency(userProfits[p.id]?.totalProfit ?? 0)}
                                  </span>
                                  <span className={`text-[7px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-sm border ${
                                    (userProfits[p.id]?.totalProfit ?? 0) >= 0 
                                      ? 'bg-emerald-500/10 text-emerald-500/60 border-emerald-500/10' 
                                      : 'bg-rose-500/10 text-rose-500/60 border-rose-500/10'
                                  }`}>
                                    {(userProfits[p.id]?.totalProfit ?? 0) >= 0 ? 'Profit' : 'Rugi'}
                                  </span>
                               </div>
                             </td>
                             <td className="px-4 py-4">
                               <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-white/90 tracking-widest leading-none">{new Date(p.created_at).toLocaleDateString('en-GB')}</span>
                                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter mt-0.5">Deployment</span>
                               </div>
                             </td>
                             <td className="px-5 py-4 text-right relative">
                               <div className="flex justify-end items-center gap-2 manage-menu-container overflow-visible">
                                  <button 
                                    onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                                    className={cn(
                                      "px-4 py-2 text-[10px] font-bold tracking-tight transition-all duration-300 rounded-lg flex items-center gap-2.5 border",
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
                                      (index > 0 && index === data.length - 1) ? "bottom-full mb-2 slide-in-from-bottom-2" : "top-full mt-2 slide-in-from-top-2"
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
