"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/hooks/useI18n";
import { Globe2, Banknote } from "lucide-react";

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/hero-bg.png" 
          alt="Streetwear Clothing Hero" 
          fill 
          className="object-cover object-center opacity-80"
          priority
        />
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-black/60 to-black/40" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto pt-20">
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
            className="mx-auto h-20 md:h-32 lg:h-40 w-auto brightness-110 drop-shadow-2xl"
            priority
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-base md:text-xl text-white/90 font-medium max-w-lg mx-auto mb-10 leading-relaxed drop-shadow-lg"
        >
          {t("hero.title_line1")} {t("hero.title_line2")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/shop"
            className="group relative px-8 py-3.5 bg-white text-black text-sm font-black uppercase tracking-wide rounded-full overflow-hidden transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] hover:scale-105 active:scale-[0.97]"
          >
            <span className="relative z-10">{t("hero.cta")}</span>
            <div className="absolute inset-0 bg-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="#reviews"
            className="px-8 py-3.5 bg-black/40 backdrop-blur-md border border-white/20 text-white text-sm font-semibold rounded-full hover:bg-white/10 hover:border-white/40 transition-all duration-300 active:scale-[0.97]"
          >
            {t("hero.reviews_btn")}
          </Link>
        </motion.div>

        {/* Delivery badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex items-center justify-center gap-6 mt-12 backdrop-blur-md bg-white/5 border border-white/10 px-6 py-3 rounded-full w-fit mx-auto"
        >
          <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
            <Globe2 className="w-4 h-4 text-accent" />
            <span>{t("hero.delivery")}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/30" />
          <div className="flex items-center gap-2 text-white/80 text-xs font-bold uppercase tracking-wider">
            <Banknote className="w-4 h-4 text-accent" />
            <span>{t("hero.cod")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
