"use client";

import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useI18n } from "@/hooks/useI18n";

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { t } = useI18n();

  const menuLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/shop", label: t("nav.shop") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl md:hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16">
            <Image src="/logo.png" alt="ROVA" width={80} height={32} className="h-7 w-auto brightness-110" />
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/5 rounded-xl transition-colors"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col items-center justify-center gap-2 mt-16">
            {menuLinks.map((link, i) => {
              const isActive = pathname === link.href;
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.2, 0, 0.2, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className={`
                      block text-3xl font-heading font-bold py-3 px-6 transition-colors
                      ${isActive ? "text-accent" : "text-white hover:text-accent"}
                    `}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6"
          >
            {/* Social */}
            <div className="flex items-center gap-5">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="Instagram">
                <InstagramIcon size={20} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="Facebook">
                <FacebookIcon size={20} />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors" aria-label="TikTok">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88A2.89 2.89 0 019.5 12.4v-3.5a6.37 6.37 0 00-6.38 6.38 6.37 6.37 0 006.38 6.38 6.37 6.37 0 006.38-6.38V9.42a8.16 8.16 0 003.71.88V6.69z" /></svg>
              </a>
            </div>
            <p className="text-xs text-gray-600">© 2025 ROVA. All rights reserved.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
