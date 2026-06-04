"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUp, MapPin, Phone, Mail } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const InstagramIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const FacebookIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
);

export default function Footer() {
  const { t } = useI18n();

  const quickLinks = [
    { href: "/shop", label: t("nav.shop") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <footer className="relative border-t border-white/5 bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Image src="/logo.png" alt="ROVA" width={100} height={40} className="h-8 w-auto brightness-110 mb-4" />
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              Streetwear premium algérien. Qualité, style, confiance.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all" aria-label="Instagram">
                <InstagramIcon size={16} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all" aria-label="Facebook">
                <FacebookIcon size={16} />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all" aria-label="TikTok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88A2.89 2.89 0 019.5 12.4v-3.5a6.37 6.37 0 00-6.38 6.38 6.37 6.37 0 006.38 6.38 6.37 6.37 0 006.38-6.38V9.42a8.16 8.16 0 003.71.88V6.69z" /></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{t("footer.quick_links")}</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-500 hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{t("footer.contact")}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <Phone size={14} className="text-accent shrink-0" />
                <span dir="ltr">+213 551 234 567</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <Mail size={14} className="text-accent shrink-0" />
                <span>contact@rova.dz</span>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-gray-500">
                <MapPin size={14} className="text-accent shrink-0" />
                <span>Oran, Algeria</span>
              </li>
            </ul>
          </div>

          {/* Payment */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{t("footer.payment")}</h4>
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <p className="text-sm text-gray-400 font-medium mb-2">{t("trust.cod")}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{t("trust.delivery")}</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-white/5 flex items-center justify-between">
          <p className="text-xs text-gray-600">{t("footer.rights")}</p>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all" aria-label="Back to top">
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </footer>
  );
}
