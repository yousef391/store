// User roles for dashboard access control
export type UserRole = "admin" | "sub_admin";

/**
 * Pages each role is allowed to access within /dashboard.
 * "admin" can access everything; "sub_admin" is restricted to
 * Statistics (/) and Orders only.
 */
export const ROLE_ALLOWED_PATHS: Record<UserRole, string[]> = {
  admin: [
    "/dashboard",
    "/dashboard/orders",
    "/dashboard/products",
    "/dashboard/abandoned",
    "/dashboard/histories",
    "/dashboard/sub-accounts",
    "/dashboard/settings",
  ],
  sub_admin: ["/dashboard", "/dashboard/orders"],
};

/** Return true if a role is allowed to visit a given pathname. */
export function isAllowed(role: UserRole, pathname: string): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role] ?? [];
  // Exact match OR child path (e.g. /dashboard/orders/123)
  return allowed.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/** Check if a product item matches any of the assigned products */
export function matchesAssignedProduct(
  orderItem: string | null | undefined,
  assignedProducts: string[] | null | undefined
): boolean {
  // If assignedProducts is null/undefined (admin), all products are allowed
  if (!assignedProducts) return true;
  if (!orderItem) return false;
  if (assignedProducts.length === 0) return false;

  const itemLower = orderItem.toLowerCase().trim();
  return assignedProducts.some((p) => {
    const pLower = p.toLowerCase().trim();
    return itemLower === pLower || itemLower.includes(pLower) || pLower.includes(itemLower);
  });
}
