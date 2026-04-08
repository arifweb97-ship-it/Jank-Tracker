"use client";

import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // 🔒 No Identity Found: Redirect to Login
        router.push("/login");
      } else if (adminOnly && role !== "admin") {
        // 🛡️ Unauthorized Node: Redirect to Dashboard
        router.push("/dashboard");
      }
    }
  }, [user, loading, role, adminOnly, router]);

  // Handle Loading & Transition States
  if (loading || !user || (adminOnly && role !== "admin")) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#C50337]" />
        <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase animate-pulse">
          Synchronizing Security Protocol...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
