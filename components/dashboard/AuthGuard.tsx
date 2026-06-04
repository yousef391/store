"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("rova_admin_auth");
    if (auth === "true") {
      setIsAuthed(true);
    } else {
      router.push("/login");
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthed) return null;
  return <>{children}</>;
}
