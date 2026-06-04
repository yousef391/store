"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ShoppingBag, Package, UserX, Clock, Settings, LogOut, X, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", icon: BarChart3, label: "Statistics" },
  { href: "/dashboard/products", icon: Package, label: "Products" },
  { href: "/dashboard/orders", icon: ShoppingBag, label: "Orders" },
  { href: "/dashboard/abandoned", icon: UserX, label: "Abandoned" },
  { href: "/dashboard/histories", icon: Clock, label: "Histories" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("rova_admin_auth");
    router.push("/login");
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Image src="/logo.png" alt="ROVA" width={80} height={32} className="h-7 w-auto brightness-110" />
        <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">Admin Panel</p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent/10 text-accent"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all w-full"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-surface border border-white/5 rounded-xl text-gray-400"
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 h-screen bg-surface border-r border-white/5 fixed left-0 top-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-surface flex flex-col border-r border-white/5">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
