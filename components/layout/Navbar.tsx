"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Menu, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileMenu from "./MobileMenu";
import { useI18n } from "@/hooks/useI18n";
import { Locale, localeNames } from "@/data/translations";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/shop", label: t("nav.shop") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setLangOpen(false);
  }, [pathname]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0.2, 1] }}
        className={`
          fixed top-0 left-0 right-0 z-40 transition-all duration-300
          ${scrolled
            ? "bg-black/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/20"
            : "bg-transparent"
          }
        `}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="relative z-10 shrink-0">
            <Image
              src="/logo.png"
              alt="ROVA"
              width={100}
              height={40}
              className="h-8 md:h-10 w-auto brightness-110"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative px-4 py-2 text-sm font-medium transition-colors duration-200
                    ${isActive ? "text-white" : "text-gray-400 hover:text-white"}
                  `}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-accent rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side: Lang + CTA */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <Globe size={16} />
                <span className="font-medium uppercase text-xs tracking-wider">{locale}</span>
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[140px] z-50"
                  >
                    {(Object.keys(localeNames) as Locale[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLocale(l); setLangOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${locale === l ? "text-accent bg-accent/10 font-bold" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                      >
                        {localeNames[l]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA */}
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-100 transition-all duration-200 active:scale-[0.97]"
            >
              {t("nav.shop")}
            </Link>
          </div>

          {/* Mobile: Lang + Menu */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
            >
              <Globe size={18} />
            </button>
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-white hover:bg-white/5 rounded-xl transition-colors"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </div>

          {/* Mobile lang dropdown */}
          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute md:hidden right-4 top-full mt-1 bg-surface border border-white/10 rounded-xl shadow-xl shadow-black/40 overflow-hidden min-w-[130px] z-50"
              >
                {(Object.keys(localeNames) as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLocale(l); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${locale === l ? "text-accent bg-accent/10 font-bold" : "text-gray-300 hover:bg-white/5 hover:text-white"}`}
                  >
                    {localeNames[l]}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </motion.header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
