"use client";

import { ReactNode } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TopBarProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function TopBar({ title, description, action }: TopBarProps) {
  const pathname = usePathname();
  
  return (
    <div className="sticky top-0 z-[50] bg-[#02060E]/80 backdrop-blur-xl border-b border-white/[0.05] h-16 flex items-center px-4 md:px-12 transition-all duration-500">
      <div className="flex w-full items-center justify-between gap-4 relative max-w-7xl mx-auto overflow-hidden">
        {/* Left Side: Indicator + Info */}
        <div className="flex items-center gap-6">
          {/* Brand/Nav Indicator */}
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-[#C50337] to-transparent shadow-[0_0_15px_rgba(197,3,55,0.4)]" />
          
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-black tracking-tighter text-white capitalize leading-none">{title}</h2>
            <p className="text-slate-500 font-bold text-[10px] tracking-tight">{description}</p>
          </div>
        </div>

        {/* Right Side: Action Button */}
        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
