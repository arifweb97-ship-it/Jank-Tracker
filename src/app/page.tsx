"use client";

import Link from "next/link";
import { 
  ArrowRight, 
  BarChart3, 
  Target, 
  Zap, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  ActivityIcon,
  MousePointer2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#C50337]/30 overflow-x-hidden">
      {/* NAV LANDING */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#02060E]/70 backdrop-blur-3xl border-b border-white/5 px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-inter">
          <Link href="/" className="flex items-baseline gap-2 group outline-none">
            <span className="text-xl md:text-2xl font-black text-white tracking-tighter group-hover:text-[#C50337] transition-all duration-300 uppercase">JANK</span>
            <span className="text-[10px] md:text-sm font-bold text-[#C50337] tracking-[0.2em] uppercase">TRACKER</span>
          </Link>
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/login" className="bg-[#C50337] hover:bg-[#A0022C] text-white px-5 md:px-7 py-2 md:py-2.5 rounded-md text-[10px] md:text-[11px] font-bold tracking-widest transition-all shadow-lg shadow-[#C50337]/20 active:scale-95">Login</Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-24 md:pt-40 pb-20 md:pb-40 px-4 md:px-8 overflow-hidden font-inter">
        {/* Glow Effects */}
        <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[80%] md:w-[60%] h-[40%] bg-[#C50337]/5 blur-[120px] md:blur-[180px] pointer-events-none rounded-full" />
        
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_1.6fr] gap-12 md:gap-16 items-center relative z-10">
          {/* LEFT: CONTENT */}
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-left-8 duration-1000 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/40 border border-white/5 backdrop-blur-3xl shadow-inner">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-[9px] md:text-[10px] font-bold tracking-[0.25em] text-slate-500">v3.0.5 Executive Tracking Engine</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.1] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              Scale smarter with <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-[#C50337] to-white/60">Placement Intel</span>
            </h1>

            <p className="text-slate-500 text-sm md:text-lg font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-150">
              Automated Meta Ads & Shopee Affiliate tracking. High-fidelity attribution for elite marketers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
              <Link href="/login" className="w-full sm:w-auto px-10 py-4 md:py-5 bg-[#C50337] hover:bg-[#A0022C] text-white rounded-md text-sm font-bold tracking-widest transition-all shadow-2xl shadow-[#C50337]/20 flex items-center justify-center gap-3 active:scale-[0.98] group">
                Launch Console <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="animate-in fade-in zoom-in-95 duration-1000 delay-500 w-full px-2 md:px-0">
            <div className="relative group perspective-2000">
                <div className="absolute inset-0 bg-[#C50337]/5 blur-[60px] md:blur-[100px] rounded-xl group-hover:bg-[#C50337]/10 transition-all duration-700" />
                <img 
                    src="/placement_intel_hero_refined.png" 
                    alt="JanK Intelligence Preview" 
                    className="relative z-10 w-full aspect-[16/10] object-cover rounded-xl border border-white/5 shadow-2xl shadow-black/90 lg:hover:rotate-y-12 lg:hover:rotate-x-3 transition-transform duration-1000 ease-out"
                />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
        {[
          { 
            title: "Multi-Tenant Isolation", 
            desc: "Secure data separation. User A will NEVER see User B's records. Guaranteed by Supabase logic.", 
            icon: ShieldCheck, 
            color: "text-emerald-500",
            glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
            bg: "bg-emerald-500/10"
          },
          { 
            title: "Universal Sync Engine", 
            desc: "Drop raw Meta & Shopee CSVs. Our V62 engine automates attribution with 100% integrity.", 
            icon: Zap, 
            color: "text-blue-500",
            glow: "shadow-[0_0_15px_rgba(59,130,246,0.1)]",
            bg: "bg-blue-500/10"
          },
          { 
            title: "ROI Intelligence", 
            desc: "Real-time Profit, ROAS, and Click Loss analysis. Make data-driven scaling decisions.", 
            icon: BarChart3, 
            color: "text-[#C50337]",
            glow: "shadow-[0_0_15px_rgba(197,3,55,0.15)]",
            bg: "bg-[#C50337]/10"
          },
        ].map((feat, i) => (
          <div key={i} className="p-8 md:p-12 rounded-xl bg-slate-900/20 border border-white/5 backdrop-blur-3xl group hover:border-[#C50337]/30 transition-all duration-700 hover:-translate-y-2">
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-lg ${feat.bg} ${feat.glow} flex items-center justify-center border border-white/5 mb-6 md:mb-10 group-hover:scale-110 transition-all duration-500`}>
              <feat.icon className={`w-6 h-6 md:w-7 md:h-7 ${feat.color}`} />
            </div>
            <h3 className="text-xl md:text-2xl font-black tracking-tight text-white mb-4 md:mb-5">{feat.title}</h3>
            <p className="text-slate-500 text-[13px] md:text-sm font-medium leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20 md:pb-40">
        <div className="relative rounded-xl overflow-hidden border border-white/5 bg-slate-900/10 group shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-1000 delay-700">
          <div className="p-4 md:p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500/20 border border-orange-500/20" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/20" />
            </div>
            <div className="h-5 md:h-6 w-1/2 md:w-1/3 bg-white/5 rounded-lg border border-white/5 flex items-center px-4">
               <div className="w-2 h-2 rounded-full bg-white/10" />
               <div className="ml-3 w-16 md:w-20 h-1 bg-white/5 rounded-full" />
            </div>
            <div className="w-6 md:w-10 h-1" />
          </div>
          <div className="aspect-video relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent h-full z-10" />
            <img 
               src="/dashboard_preview_refined.png" 
               alt="JanK Intelligence Preview" 
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/20 backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <Zap className="w-8 md:w-12 h-8 md:h-12 text-[#C50337] mb-4 drop-shadow-[0_0_15px_rgba(197,3,55,0.4)]" />
              <p className="text-[8px] md:text-[10px] font-bold text-white tracking-[0.4em] text-center px-4">Enterprise Dashboard Live Preview</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-4 md:px-8 py-12 md:py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-center md:text-left">
          <div className="flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-black text-white tracking-tighter uppercase">JANK</span>
            <span className="text-[10px] md:text-xs font-bold text-[#C50337] tracking-[0.2em] uppercase">TRACKER</span>
          </div>
          <p className="text-[9px] md:text-[10px] font-medium text-slate-600 tracking-wide">© 2026 JanK Tracker By Hans Corporation. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
