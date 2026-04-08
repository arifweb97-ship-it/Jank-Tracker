"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { 
  Mail, 
  ArrowRight, 
  Loader2
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, role } = useAuth();

  useEffect(() => {
    if (user) {
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, role]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 🛡️ JanK Tracker: Identity Verification (Passwordless)
      const [{ data: profiles }, { data: r_requests }] = await Promise.all([
        supabase.from("profiles").select("*").eq("email", email).limit(1),
        supabase.from("access_requests").select("*").eq("email", email).eq("status", "approved").limit(1)
      ]);

      const identity = (profiles && profiles[0]) || (r_requests && r_requests[0]);

      if (identity) {
        if ((identity as any).is_locked) {
          setError("Account Locked: This node has been restricted by an administrator.");
          setLoading(false);
          return;
        }

        if (typeof window !== "undefined") {
          localStorage.setItem("jank_auth_bypass_email", email);
          // Redirect immediately
          const is_admin = (identity as any).role === "admin";
          window.location.href = is_admin ? "/admin" : "/dashboard";
        }
      } else {
        setError("Access Denied: Node not found in registry.");
      }
    } catch (err: any) {
      setError("Registry Failure: Identity could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02060E] flex flex-col items-center justify-center p-6 selection:bg-[#C50337]/30 font-inter relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C50337]/20 to-transparent" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#C50337]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-slate-900/30 backdrop-blur-3xl border border-white/[0.03] p-12 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-1000 rounded-3xl">
        
        <header className="mb-12 text-center space-y-3">
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none flex items-baseline justify-center gap-2">
              JANK <span className="text-xl font-bold text-[#C50337] tracking-[0.2em]">TRACKER</span>
            </h1>
            <h2 className="text-lg font-semibold text-[#C50337]/80 tracking-widest italic">Login</h2>
            <div className="flex items-center justify-center gap-2 pt-1">
               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
               <span className="text-[10px] font-bold text-slate-600 tracking-wide italic">System Node v3.0.5</span>
            </div>
        </header>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-5">
             <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1">Network Identity</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-[#C50337] transition-colors" />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.id"
                    className="w-full h-14 bg-slate-950/50 border border-white/5 pl-12 pr-4 text-white text-sm focus:border-[#C50337]/50 focus:ring-1 focus:ring-[#C50337]/20 outline-none transition-all rounded-xl placeholder:text-slate-700 font-medium"
                  />
                </div>
             </div>

             {error && (
               <div className="p-4 bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] font-semibold tracking-wide text-center rounded-xl animate-in shake duration-300">
                 {error}
               </div>
             )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-[#C50337] hover:bg-[#A0022C] disabled:bg-slate-800 disabled:opacity-50 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-[#C50337]/20 group rounded-xl"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Access System</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <p className="text-[10px] text-slate-600 font-medium tracking-wide">
              Authentication: <span className="text-emerald-500/60">Identity Verified Node</span>
            </p>
          </div>
        </form>
      </div>

      <footer className="mt-16 text-center opacity-30 animate-in fade-in duration-1000 delay-500">
        <p className="text-[10px] font-semibold text-slate-600 tracking-widest">JanK Intelligence Infrastructure &copy; 2026</p>
        <p className="text-[8px] font-medium text-slate-700 mt-2 tracking-wide font-mono">Secure Node Access Protocol Active</p>
      </footer>
    </div>
  );
}
