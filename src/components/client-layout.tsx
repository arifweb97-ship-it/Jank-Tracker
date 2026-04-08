"use client";

import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Pages that DON'T show the sidebar
  const isAuthPage = pathname === "/login" || pathname === "/";

  // 🛡️ Instant Entrance: Removed the global blocking loader as per user request.
  // Performance is now prioritized by letting the app shell render immediately.

  // If it's a dashboard page and user is NOT logged in, we could redirect here, 
  // but usually it's better to handle it per-page or in middleware.
  // For now, we just hide the sidebar.
  const showSidebar = !isAuthPage && user;

  return (
    <div className="flex relative z-10 w-full min-h-screen">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 min-h-screen transition-all duration-500 relative overflow-x-hidden ${showSidebar ? 'ml-60' : 'ml-0'}`}>
        {children}
      </main>
    </div>
  );
}
