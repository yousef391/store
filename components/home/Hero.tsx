"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/hooks/useI18n";

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient mesh */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-background" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/3 rounded-full blur-[100px]" />
      </div>

      {/* Noise texture */}
      <div className="absolute inset-0 noise-overlay pointer-events-none" />

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xs md:text-sm font-bold uppercase tracking-[0.3em] text-accent mb-6"
        >
          {t("hero.subtitle")} — Est. 2025
        </motion.p>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.2, 0, 0.2, 1] }}
          className="mb-8"
        >
          <Image
            src="/logo.png"
            alt="ROVA"
            width={400}
            height={160}
            className="mx-auto h-20 md:h-32 lg:h-40 w-auto brightness-110"
            priority
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-base md:text-xl text-gray-400 max-w-lg mx-auto mb-10 leading-relaxed"
        >
          {t("hero.title_line1")} {t("hero.title_line2")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex items-center justify-center gap-4"
        >
          <Link
            href="/shop"
            className="group relative px-8 py-3.5 bg-white text-black text-sm font-bold rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-white/10 active:scale-[0.97]"
          >
            <span className="relative z-10">{t("hero.cta")}</span>
            <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="/about"
            className="px-8 py-3.5 bg-transparent border border-white/15 text-white text-sm font-semibold rounded-full hover:bg-white/5 hover:border-white/25 transition-all duration-300 active:scale-[0.97]"
          >
            {t("about.subtitle")}
          </Link>
        </motion.div>

        {/* Delivery badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex items-center justify-center gap-6 mt-10"
        >
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <span>🇩🇿</span>
            <span>{t("hero.delivery")}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-gray-600" />
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <span>💵</span>
            <span>{t("hero.cod")}</span>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-5 h-8 rounded-full border border-white/20 flex items-start justify-center p-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
