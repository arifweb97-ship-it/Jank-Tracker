"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: "admin" | "user" | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  full_name: null,
  phone: null,
  address: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 🛡️ JanK Tracker: IDENTITY-AWARE BYPASS MODE
    const checkAuth = async () => {
      const bypassEmail = typeof window !== "undefined" ? localStorage.getItem("jank_auth_bypass_email") : null;

      if (bypassEmail) {
        try {
          const [{ data: profiles }, { data: requests }] = await Promise.all([
            supabase.from("profiles").select("*").eq("email", bypassEmail).limit(1),
            supabase.from("access_requests").select("*").eq("email", bypassEmail).eq("status", "approved").limit(1)
          ]);

          const identity = (profiles && profiles[0]) || (requests && requests[0]);
          
          if (identity && !(identity as any).is_locked) {
            setUser({ 
              id: (identity as any).id || "00000000-0000-0000-0000-000000000000", 
              email: bypassEmail, 
              aud: "authenticated", 
              role: "authenticated",
              app_metadata: {},
              user_metadata: {},
              created_at: (identity as any).created_at || new Date().toISOString()
            } as any);
            setRole((identity as any).role || "user");
            setFullName((identity as any).full_name || null);
            setPhone((identity as any).phone || null);
            setAddress((identity as any).address || null);
          } else {
            // Identity not found, not approved, or LOCKED
            localStorage.removeItem("jank_auth_bypass_email");
            setUser(null);
            setRole(null);
            setFullName(null);
            setPhone(null);
            setAddress(null);
          }
        } catch (error) {
          console.error("Auth bypass error:", error);
          localStorage.removeItem("jank_auth_bypass_email");
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const signOut = async () => {
    try {
      // 🛡️ JanK Tracker: Identity-Aware Logout
      if (typeof window !== "undefined") {
        localStorage.removeItem("jank_auth_bypass_email"); // Primary Identity
      }
      
      // Clear Supabase Session if active (non-blocking)
      supabase.auth.signOut().catch(() => {});
      
      // Reset local state to trigger UI updates
      setUser(null);
      setRole(null);
      setFullName(null);
      setPhone(null);
      setAddress(null);
      
      // Force physical reload to /login for maximum state purity
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (error) {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      role, 
      full_name: fullName, 
      phone, 
      address, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
