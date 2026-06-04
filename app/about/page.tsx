"use client";

import { motion } from "framer-motion";
import { Heart, Users, Zap, Award } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const values = [
  { icon: Heart, title: "Passion First", desc: "Every piece is designed with obsessive attention to detail and love for streetwear culture." },
  { icon: Users, title: "For Algeria", desc: "Built by Algerians, for Algerians. We understand what our community needs." },
  { icon: Zap, title: "Premium Quality", desc: "We source the finest fabrics and never compromise on construction quality." },
  { icon: Award, title: "Accessible Luxury", desc: "Premium doesn't have to mean expensive. We deliver luxury at fair prices." },
];

const stats = [
  { value: "1,000+", label: "Happy Customers" },
  { value: "58", label: "Wilayas Served" },
  { value: "4.8", label: "Average Rating" },
  { value: "12+", label: "Products" },
];

export default function AboutPage() {
  const { ref: valuesRef, isVisible: valuesVisible } = useScrollAnimation();
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation();

  return (
    <>
      <Navbar />
      <main className="pt-20 md:pt-24 min-h-screen">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-4">Our Story</p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
                Redefining<br />
                <span className="gradient-text">Algerian</span><br />
                Streetwear
              </h1>
              <p className="text-base md:text-lg text-gray-400 leading-relaxed mb-4">
                ROVA was born from a simple belief: every young Algerian deserves access to premium streetwear
                without the premium price tag. We&apos;re not just selling clothes — we&apos;re building a movement.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Founded in Oran in 2025, ROVA curates and creates streetwear that blends international design
                sensibility with the energy and spirit of Algeria&apos;s urban youth culture.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-surface">
                <Image
                  src="/products/ens1.png"
                  alt="ROVA Brand"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              {/* Floating accent card */}
              <div className="absolute -bottom-6 -left-4 md:-left-8 glass-card rounded-2xl p-5 max-w-[200px]">
                <p className="text-2xl font-heading font-bold text-accent mb-1">EST.</p>
                <p className="text-4xl font-heading font-bold text-white">2025</p>
                <p className="text-xs text-gray-400 mt-1">Oran, Algeria</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section ref={statsRef} className="py-12 md:py-16 px-4 max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={statsVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <p className="text-3xl md:text-4xl font-heading font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section ref={valuesRef} className="py-16 md:py-24 px-4 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={valuesVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">Why ROVA</p>
            <h2 className="text-2xl md:text-4xl font-heading font-bold text-white">Our Values</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {values.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 20 }}
                animate={valuesVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
                  <v.icon size={22} className="text-accent" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
