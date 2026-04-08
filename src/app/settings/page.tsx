"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { 
  Shield, 
  Settings as SettingsIcon,
  ShieldCheck,
  User as UserIcon,
  Save,
  Loader2,
  Globe,
  CheckCircle2,
  AlertCircle,
  Bell,
  Database
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ProtectedRoute } from "@/components/protected-route";
import { TopBar } from "@/components/top-bar";

export default function SettingsPage() {
  const { role, loading: authLoading, user, full_name } = useAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Local Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: ""
  });

  useEffect(() => {
    if (!authLoading && user) {
      setFormData({
        fullName: full_name || "",
        email: user?.email || ""
      });
    }
  }, [authLoading, full_name, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setSaveStatus('idle');
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullName,
          email: formData.email
        })
        .eq("id", user.id);
        
      if (error) throw error;
      
      // Update system bypass identity for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("jank_auth_bypass_email", formData.email);
      }
      
      setSaveStatus('success');
      
      // Force reload to refresh context immediately
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen">
        <TopBar 
          title="System configurations"
          description="Manage your tracking preferences and global account settings."
        />

        <div className="p-8 max-w-7xl mx-auto w-full space-y-12 animate-in fade-in duration-1000">
          
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 items-start">
            
            {/* PROFILE ORIENTED SETTINGS */}
            <div className="space-y-8">
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-10 rounded-3xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                  <ShieldCheck className="w-48 h-48 text-white" />
                </div>
                
                <h3 className="text-xl font-black text-white tracking-tight mb-8">Identity Node Registry</h3>
                
                <form onSubmit={handleSave} className="space-y-8 relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                      <div className="relative group/field">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within/field:text-[#C50337]" />
                        <input 
                          type="text" 
                          value={formData.fullName}
                          onChange={e => setFormData({...formData, fullName: e.target.value})}
                          className="w-full bg-slate-950 border border-white/5 pl-12 pr-4 py-4 text-white text-xs font-bold focus:border-[#C50337]/50 outline-none rounded-2xl transition-all shadow-inner"
                          placeholder="Node Identity"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Secure Email</label>
                      <div className="relative group/field">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-focus-within/field:text-[#C50337]" />
                        <input 
                          type="email" 
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-slate-950 border border-white/5 pl-12 pr-4 py-4 text-white text-xs font-bold focus:border-[#C50337]/50 outline-none rounded-2xl transition-all shadow-inner"
                          placeholder="email@node.id"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-8">
                    <div className="flex-1">
                      {saveStatus === 'success' && (
                        <div className="flex items-center gap-2 text-emerald-500 animate-in fade-in slide-in-from-left-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[9px] font-black tracking-widest uppercase">Registry Updated</span>
                        </div>
                      )}
                      {saveStatus === 'error' && (
                        <div className="flex items-center gap-2 text-rose-500 animate-in fade-in slide-in-from-left-2">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-[9px] font-black tracking-widest uppercase">Protocol Failure</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="px-10 py-4 bg-[#C50337] hover:bg-[#A0022C] text-white font-black text-[10px] uppercase tracking-widest transition-all rounded-2xl shadow-xl shadow-[#C50337]/30 flex items-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Sync Identity
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-10 rounded-3xl shadow-2xl">
                 <h3 className="text-xl font-black text-white tracking-tight mb-8">System Access Layers</h3>
                 <div className="space-y-4">
                    {[
                      { title: "Security Protocols", desc: "Manage multi-factor authentication and secure identity hashes.", icon: Shield },
                      { title: "Alert Configurations", desc: "Set thresholds for boncos alerts and performance spikes.", icon: Bell },
                      { title: "Node Maintenance", desc: "Purge local caches and synchronize database nodes.", icon: Database },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-slate-950/40 border border-white/5 rounded-2xl group hover:border-[#C50337]/30 transition-all cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:bg-[#C50337]/10 transition-colors">
                            <item.icon className="w-4 h-4 text-slate-500 group-hover:text-[#C50337]" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white">{item.title}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{item.desc}</span>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-white/5 group-hover:bg-[#C50337] transition-all" />
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* QUICK INFO SIDEBAR */}
            <div className="space-y-6">
               <div className="p-8 bg-[#C50337]/5 border border-[#C50337]/10 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 blur-sm group-hover:blur-none transition-all duration-700">
                    <ShieldCheck className="w-16 h-16 text-[#C50337]" />
                  </div>
                  <h4 className="text-[10px] font-black text-[#C50337] uppercase tracking-[0.3em] mb-4">Security Status</h4>
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Identity Role</span>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{role}</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-950/50 p-3 rounded-xl border border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Encryption</span>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                    </div>
                  </div>
               </div>

               <div className="p-8 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">JanK Infrastructure</h4>
                  <div className="space-y-4">
                    <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
                      "Governance Hub v3.0.5 ensures that all identity nodes are synchronized across the global registry with zero-latency protocols."
                    </p>
                    <div className="pt-4 border-t border-white/5">
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Hans Corporation © 2026</span>
                    </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
