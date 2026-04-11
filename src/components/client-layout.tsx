"use client";

import { useAuth } from "@/context/auth-context";
import { Sidebar } from "@/components/sidebar";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/mobile-header";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Pages that DON'T show the sidebar
  const isAuthPage = pathname === "/login" || pathname === "/";
  const showSidebar = !isAuthPage && user;

  // Close sidebar when navigating on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="flex relative z-10 w-full min-h-screen overflow-x-hidden">
      {showSidebar && (
        <>
          <MobileHeader 
            isOpen={isSidebarOpen} 
            toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
          <Sidebar isOpen={isSidebarOpen} />
          
          {/* Backdrop for mobile */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </>
      )}
      
      <main className={`flex-1 min-h-screen transition-all duration-500 relative overflow-x-hidden 
        ${showSidebar ? 'lg:ml-60 pt-[60px] lg:pt-0' : 'ml-0'}`}
      >
        {children}
      </main>
    </div>
  );
}
