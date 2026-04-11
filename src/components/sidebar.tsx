"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { 
  LayoutDashboard, 
  Calendar, 
  Settings, 
  MousePointer2,
  Tag,
  ShieldCheck,
  LogOut,
  BarChart3,
  Users,
  DollarSign,
  Zap,
  Link2
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Sidebar({ isOpen }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, signOut, user, full_name: fullName } = useAuth();

  const isAdminPath = pathname.startsWith("/admin") || pathname === "/settings";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profit Calendar", href: "/calendar", icon: Calendar },
    { name: "Daily Reports", href: "/reports/daily", icon: BarChart3 },
    { name: "Placement Reports", href: "/reports/clicks", icon: MousePointer2 },
    { name: "Taglink Reports", href: "/reports/taglink", icon: Tag },
    { name: "Link Matrix", href: "/links", icon: Link2 },
    { name: "Ad Balance", href: "/deposits", icon: DollarSign },
  ];

  const adminItems = [
    { name: "User Directory", href: "/admin", icon: ShieldCheck },
    { name: "Platform Settings", href: "/settings", icon: Settings },
  ];

  const currentView = searchParams.get("view") || "users";

  return (
    <aside className={cn(
      "w-60 bg-[#02060E]/95 backdrop-blur-3xl border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-[70] transition-sidebar shadow-2xl overflow-hidden rounded-none lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* BRANDING SECTION */}
      <div className="px-6 py-10 border-b border-white/5">
        <Link href={isAdminPath ? "/admin" : "/dashboard"} className="group flex items-baseline gap-2 outline-none">
           <span className="text-2xl font-black text-white tracking-tighter group-hover:text-[#C50337] transition-all duration-300 italic shrink-0 uppercase">JANK</span>
           <span className="text-sm font-bold text-[#C50337] tracking-widest opacity-90 truncate italic uppercase">{isAdminPath ? "Admin" : "Tracker"}</span>
        </Link>
      </div>

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 px-3 space-y-8 mt-6 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          <p className="px-4 mb-4 text-[10px] font-bold text-slate-700 tracking-wider opacity-60 capitalize">
            {isAdminPath ? "Platform control center" : "Marketing analytics"}
          </p>
          {(isAdminPath ? adminItems : navItems).map((item) => {
            const isActive = pathname === item.href || (isAdminPath && currentView === item.href.split("view=")[1]);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 transition-all duration-500 relative overflow-hidden rounded-lg outline-none",
                  isActive 
                    ? "text-white bg-white/[0.03] border-l-2 border-[#C50337]" 
                    : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.01]"
                )}
              >
                <div className={cn(
                  "p-1.5 transition-all duration-500 flex-shrink-0",
                  isActive ? "text-[#C50337]" : "text-slate-600 group-hover:scale-110"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-[13px] tracking-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER SECTION */}
      <div className="p-6 border-t border-white/[0.03] space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <span className="text-xs font-black text-white tracking-tight truncate leading-none">
              {fullName || user?.email?.split('@')[0] || 'User Node'}
            </span>
            <span className="text-[10px] font-bold text-slate-500 tracking-tight leading-none truncate mt-0.5">
              {user?.email}
            </span>
            <span className="text-[9px] font-bold text-[#C50337] tracking-wider leading-none capitalize mt-1">
              {role || 'User'} Console
            </span>
          </div>
          <button 
            onClick={signOut}
            className="p-2.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/10 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        
        <div className="px-3 py-3 bg-slate-950/40 border border-white/5 flex items-center justify-between rounded-lg">
           <span className="text-[9px] font-bold text-slate-700 tracking-widest leading-none capitalize font-mono">v5.1.0 Executive</span>
           <div className="w-1.5 h-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse rounded-full" />
        </div>
      </div>
    </aside>
  );
}
