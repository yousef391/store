"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Truck, ShieldCheck } from "lucide-react";

export default function DeliveryBanner() {
  return (
    <section className="relative w-full py-16 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 border-y border-white/5">
        <Image
          src="/delivery-banner.png"
          alt="Premium Texture"
          fill
          className="object-cover object-center opacity-30 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-black/60 to-background" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-24">
        {/* Livraison 58 Wilaya */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-5"
        >
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(212,165,116,0.1)]">
            <Truck className="w-8 h-8 text-accent" />
            <span className="absolute -bottom-2 -right-2 text-xl drop-shadow-md">🇩🇿</span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.15em] font-heading mb-1 drop-shadow-md">
              Livraison 58 Wilayas
            </h3>
            <p className="text-white/40 text-xs md:text-sm font-dm tracking-wide">
              Toutes les wilayas d&apos;Algérie à votre porte
            </p>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="hidden md:block w-px h-16 bg-gradient-to-b from-transparent via-white/15 to-transparent" />
        {/* Mobile divider */}
        <div className="md:hidden w-32 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Qualité Premium */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-transparent border border-accent/30 flex items-center justify-center backdrop-blur-md shadow-[0_0_30px_rgba(212,165,116,0.1)]">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-[0.15em] font-heading mb-1 drop-shadow-md">
              Qualité Premium
            </h3>
            <p className="text-white/40 text-xs md:text-sm font-dm tracking-wide">
              Des vêtements conçus pour durer
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
