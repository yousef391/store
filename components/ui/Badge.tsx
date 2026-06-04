"use client";

interface BadgeProps {
  variant?: "default" | "new" | "sale" | "active" | "draft" | "out_of_stock" | "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<string, string> = {
  default: "bg-white/10 text-gray-300",
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  sale: "bg-red-500/15 text-red-400 border-red-500/20",
  active: "bg-emerald-500/15 text-emerald-400",
  draft: "bg-amber-500/15 text-amber-400",
  out_of_stock: "bg-red-500/15 text-red-400",
  pending: "bg-blue-500/15 text-blue-400",
  confirmed: "bg-amber-500/15 text-amber-400",
  shipped: "bg-indigo-500/15 text-indigo-400",
  delivered: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
  returned: "bg-orange-500/15 text-orange-400",
};

export default function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider
        rounded-lg border border-transparent
        ${variantStyles[variant] || variantStyles.default}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
