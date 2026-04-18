"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { 
  Mail, 
  ArrowRight, 
  Loader2,
  ShieldCheck,
  Lock,
  Smartphone,
  ChevronLeft
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'identify' | 'verify' | 'verify_admin'>('identify');
  const [tempIdentity, setTempIdentity] = useState<any>(null);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [adminOtp, setAdminOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const adminInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 🛡️ JanK Tracker: Step 1 - Identity Discovery
      const [{ data: profiles }, { data: r_requests }] = await Promise.all([
        supabase.from("profiles").select("*").eq("email", email.trim()).limit(1),
        supabase.from("access_requests").select("*").eq("email", email.trim()).eq("status", "approved").limit(1)
      ]);

      const identity = (profiles && profiles[0]) || (r_requests && r_requests[0]);

      if (identity) {
        if ((identity as any).is_locked) {
          setError("Account Locked: This node has been restricted by an administrator.");
          setLoading(false);
          return;
        }

        // 🟢 ADMIN 2FA: PIN Verification
        if ((identity as any).role === "admin") {
           setTempIdentity(identity);
           setStep('verify_admin');
           return;
        }

        // Check if phone exists (required for 2FA for regular users)
        if (!(identity as any).phone) {
          setError("Security Fault: No phone number registered. Contact Administrator.");
          setLoading(false);
          return;
        }

        setTempIdentity(identity);
        setStep('verify');
      } else {
        setError("Access Denied: Node not found in registry.");
      }
    } catch (err: any) {
      setError("Registry Failure: Identity could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedCode = otp.join("");
    if (combinedCode.length < 4 || !tempIdentity) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Extract last 4 digits (sanitize: only digits)
      const phoneClean = tempIdentity.phone.replace(/\D/g, '');
      const expectedCode = phoneClean.slice(-4);
      
      if (combinedCode === expectedCode) {
        // 🔐 Security Node Decrypted
        if (typeof window !== "undefined") {
          localStorage.setItem("jank_auth_bypass_email", tempIdentity.email);
          window.location.href = "/dashboard";
        }
      } else {
        setError("Security Token Mismatch: Access Code Incorrect.");
        setOtp(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError("Crypto Failure: Decryption sequence interrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const combinedCode = adminOtp.join("");
    if (combinedCode.length < 6 || !tempIdentity) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const expectedCode = tempIdentity.admin_pin || "000000";
      
      if (combinedCode === expectedCode) {
        if (typeof window !== "undefined") {
          localStorage.setItem("jank_auth_bypass_email", tempIdentity.email);
          window.location.href = "/admin";
        }
      } else {
        setError("Security Token Mismatch: Admin PIN Incorrect.");
        setAdminOtp(["", "", "", "", "", ""]);
        adminInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setError("Crypto Failure: Decryption sequence interrupted.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
     if (value.length > 1) value = value.slice(-1);
     if (!/^\d*$/.test(value)) return;

     const newOtp = [...otp];
     newOtp[index] = value;
     setOtp(newOtp);

     if (value && index < 3) {
        inputRefs.current[index + 1]?.focus();
     }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
     if (e.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
     }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
     const pastedData = e.clipboardData.getData('text').slice(0, 4).replace(/\D/g, '');
     if (pastedData.length === 4) {
        setOtp(pastedData.split(''));
        inputRefs.current[3]?.focus();
     }
  };

  const handleAdminOtpChange = (index: number, value: string) => {
     if (value.length > 1) value = value.slice(-1);
     if (!/^\d*$/.test(value)) return;

     const newOtp = [...adminOtp];
     newOtp[index] = value;
     setAdminOtp(newOtp);

     if (value && index < 5) {
        adminInputRefs.current[index + 1]?.focus();
     }
  };

  const handleAdminOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
     if (e.key === 'Backspace' && !adminOtp[index] && index > 0) {
        adminInputRefs.current[index - 1]?.focus();
     }
  };

  const handleAdminPaste = (e: React.ClipboardEvent) => {
     const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
     if (pastedData.length === 6) {
        setAdminOtp(pastedData.split(''));
        adminInputRefs.current[5]?.focus();
     }
  };


  return (
    <div className="min-h-screen bg-[#02060E] flex flex-col items-center justify-center p-3 sm:p-6 selection:bg-[#C50337]/30 font-inter relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C50337]/20 to-transparent" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#C50337]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[420px] bg-slate-900/30 backdrop-blur-3xl border border-white/[0.03] px-5 py-8 sm:p-12 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-1000 rounded-2xl sm:rounded-3xl">
        
        <header className="mb-8 sm:mb-12 text-center space-y-3">
            <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase leading-none flex items-baseline justify-center gap-2">
              JANK <span className="text-xl font-bold text-[#C50337] tracking-[0.2em]">TRACKER</span>
            </h1>
            <h2 className="text-lg font-semibold text-[#C50337]/80 tracking-widest italic">Login</h2>
            <div className="flex items-center justify-center gap-2 pt-1">
               <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
               <span className="text-[10px] font-bold text-slate-600 tracking-wide italic">System Node v3.0.5</span>
            </div>
        </header>

        <form onSubmit={step === 'identify' ? handleAuth : step === 'verify' ? handleVerify : handleAdminVerify} className="space-y-6">
          <div className="space-y-5">
             {step === 'identify' ? (
                <div className="space-y-2.5 animate-in slide-in-from-left-4 duration-300">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[11px] font-bold text-slate-500 tracking-wide">Network Identity</label>
                      <span className="text-[9px] font-black text-[#C50337]/40 uppercase tracking-widest">Step 01</span>
                   </div>
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
              ) : step === 'verify' ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                   <div className="flex items-center justify-between px-1">
                      <button 
                        type="button" 
                        onClick={() => { setStep('identify'); setError(null); setOtp(["", "", "", ""]); }}
                        className="text-[10px] font-black text-[#C50337] uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                      >
                         <ChevronLeft className="w-3 h-3" /> Back
                      </button>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Secure Step 02</span>
                   </div>
                   
                   <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl mb-2">
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                        Identity confirmed for <span className="text-white font-bold">{tempIdentity.email}</span>. Please enter the <span className="text-[#C50337] font-black underline decoration-[#C50337]/30 underline-offset-4">last 4 digits</span> of your registered phone number.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1 block text-center">Verification Code</label>
                       <div className="flex justify-center gap-2 sm:gap-3 px-0">
                        {otp.map((digit, index) => (
                           <input
                              key={index}
                              ref={el => { inputRefs.current[index] = el; }}
                              type="text"
                              inputMode="numeric"
                              pattern="\d*"
                              maxLength={1}
                              value={digit}
                              onChange={e => handleOtpChange(index, e.target.value)}
                              onKeyDown={e => handleOtpKeyDown(index, e)}
                              onPaste={index === 0 ? handlePaste : undefined}
                               className={cn(
                                  "w-14 h-16 sm:w-[68px] sm:h-20 bg-slate-950/50 border border-white/5 text-center text-2xl sm:text-3xl font-black text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 outline-none transition-all rounded-xl sm:rounded-2xl shadow-inner",
                                  digit && "border-white/10"
                               )}
                           />
                        ))}
                      </div>
                   </div>
                </div>
             ) : (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
                   <div className="flex items-center justify-between px-1">
                      <button 
                        type="button" 
                        onClick={() => { setStep('identify'); setError(null); setAdminOtp(["", "", "", "", "", ""]); }}
                        className="text-[10px] font-black text-[#C50337] uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
                      >
                         <ChevronLeft className="w-3 h-3" /> Back
                      </button>
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Admin Step 02</span>
                   </div>
                   
                   <div className="bg-white/[0.02] border border-rose-500/10 p-4 rounded-2xl mb-2">
                      <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                        Admin identity confirmed for <span className="text-white font-bold">{tempIdentity.email}</span>. Please enter your <span className="text-rose-500 font-black underline decoration-rose-500/30 underline-offset-4">6-digit PIN</span> to access the command center.
                      </p>
                   </div>

                   <div className="space-y-4">
                      <label className="text-[11px] font-bold text-slate-500 tracking-wide px-1 block text-center">Admin Access PIN</label>
                       <div className="flex justify-center gap-1.5 sm:gap-2 px-0">
                        {adminOtp.map((digit, index) => (
                           <input
                              key={index}
                              ref={el => { adminInputRefs.current[index] = el; }}
                              type="password"
                              inputMode="numeric"
                              pattern="\d*"
                              maxLength={1}
                              value={digit}
                              onChange={e => handleAdminOtpChange(index, e.target.value)}
                              onKeyDown={e => handleAdminOtpKeyDown(index, e)}
                              onPaste={index === 0 ? handleAdminPaste : undefined}
                               className={cn(
                                  "w-10 h-14 sm:w-12 sm:h-16 bg-slate-950/50 border border-white/5 text-center text-xl sm:text-2xl font-black text-white focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/10 outline-none transition-all rounded-xl shadow-inner",
                                  digit && "border-white/10"
                               )}
                           />
                        ))}
                      </div>
                   </div>
                </div>
             )}

             {error && (
               <div className="p-4 bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[11px] font-semibold tracking-wide text-center rounded-xl animate-in shake duration-300">
                 {error}
               </div>
             )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
               "w-full h-14 font-bold text-sm tracking-wide flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl group rounded-xl",
               step === 'identify' 
                  ? "bg-[#C50337] hover:bg-[#A0022C] shadow-[#C50337]/20" 
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{step === 'identify' ? 'Access System' : 'Verify Identity'}</span>
                {step === 'identify' ? (
                   <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                ) : (
                   <ShieldCheck className="w-4 h-4" />
                )}
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
