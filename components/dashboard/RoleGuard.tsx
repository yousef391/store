"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/dashboard/AuthGuard";
import type { UserRole } from "@/lib/auth";

interface RoleGuardProps {
  /** Roles that are allowed to view this page. */
  allowedRoles: UserRole[];
  /** Where to redirect unauthorized users (default: /dashboard). */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Wraps a dashboard page and redirects users whose role isn't in
 * `allowedRoles` to `redirectTo` (default: /dashboard).
 */
export default function RoleGuard({
  allowedRoles,
  redirectTo = "/dashboard",
  children,
}: RoleGuardProps) {
  const { role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // role is null while AuthGuard is still checking — do nothing yet
    if (role === null) return;
    if (!allowedRoles.includes(role)) {
      router.replace(redirectTo);
    }
  }, [role, allowedRoles, redirectTo, router]);

  // While we don't know the role yet, or if role is not allowed, show nothing
  if (role === null || !allowedRoles.includes(role)) return null;

  return <>{children}</>;
}

