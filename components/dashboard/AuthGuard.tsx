"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth";

/* ------------------------------------------------------------------ */
/*  Context                                                             */
/* ------------------------------------------------------------------ */
interface AuthContextValue {
  role: UserRole | null;
  userEmail: string | null;
  assignedProducts: string[] | null;
  telegramChatId: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  role: null,
  userEmail: null,
  assignedProducts: null,
  telegramChatId: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

/* ------------------------------------------------------------------ */
/*  Guard component                                                     */
/* ------------------------------------------------------------------ */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [assignedProducts, setAssignedProducts] = useState<string[] | null>(null);
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check current session and extract role & metadata
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const meta = session.user?.user_metadata ?? {};
        const userRole: UserRole = meta.role === "sub_admin" ? "sub_admin" : "admin";
        setRole(userRole);
        setUserEmail(session.user?.email ?? null);
        setAssignedProducts(userRole === "sub_admin" ? (meta.assigned_products ?? []) : null);
        setTelegramChatId(meta.telegram_chat_id ?? null);
        setIsAuthed(true);
      } else {
        router.push("/login");
      }
      setChecking(false);
    });

    // Listen for auth state changes (logout, token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAuthed(false);
        setRole(null);
        setAssignedProducts(null);
        setTelegramChatId(null);
        router.push("/login");
      } else {
        const meta = session.user?.user_metadata ?? {};
        const userRole: UserRole = meta.role === "sub_admin" ? "sub_admin" : "admin";
        setRole(userRole);
        setUserEmail(session.user?.email ?? null);
        setAssignedProducts(userRole === "sub_admin" ? (meta.assigned_products ?? []) : null);
        setTelegramChatId(meta.telegram_chat_id ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return (
    <AuthContext.Provider value={{ role, userEmail, assignedProducts, telegramChatId }}>
      {children}
    </AuthContext.Provider>
  );
}
