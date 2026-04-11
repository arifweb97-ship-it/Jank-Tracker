"use client";

import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";

interface MobileHeaderProps {
  isOpen: boolean;
  toggle: () => void;
}

export function MobileHeader({ isOpen, toggle }: MobileHeaderProps) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-[60] bg-[#02060E]/80 backdrop-blur-2xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-baseline gap-2 group outline-none">
        <span className="text-xl font-black text-white tracking-tighter italic uppercase">JANK</span>
        <span className="text-[10px] font-bold text-[#C50337] tracking-widest opacity-90 italic uppercase">Tracker</span>
      </Link>

      <button
        onClick={toggle}
        className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95"
        aria-label="Toggle Menu"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </header>
  );
}
