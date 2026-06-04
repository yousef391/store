"use client";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular" | "card";
}

export default function Skeleton({ className = "", variant = "rectangular" }: SkeletonProps) {
  const baseClass = "animate-pulse bg-white/5 rounded-lg";
  const variants = {
    text: "h-4 w-full rounded",
    circular: "rounded-full",
    rectangular: "rounded-xl",
    card: "rounded-2xl",
  };

  return <div className={`${baseClass} ${variants[variant]} ${className}`} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
      <div className="flex flex-col gap-2 px-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}
