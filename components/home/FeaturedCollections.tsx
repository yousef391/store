"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useI18n } from "@/hooks/useI18n";

const collections = [
  {
    name: "Nike Nocta",
    slug: "nike-nocta-ensemble",
    image: "/products/nocta_2.png",
    desc: "Tech-inspired streetwear",
  },
  {
    name: "Lin Premium",
    slug: "ensemble-lin-premium",
    image: "/products/ens1.png",
    desc: "Élégance moderne",
  },
];

export default function FeaturedCollections() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useI18n();

  return (
    <section ref={ref} className="py-16 md:py-24 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{t("collections.subtitle")}</p>
        <h2 className="text-2xl md:text-4xl font-heading font-bold text-white">{t("collections.title")}</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {collections.map((col, i) => (
          <motion.div
            key={col.slug}
            initial={{ opacity: 0, y: 30 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 * i }}
          >
            <Link href={`/product/${col.slug}`} className="group block relative aspect-[3/4] md:aspect-[4/5] rounded-2xl md:rounded-3xl overflow-hidden">
              <Image
                src={col.image}
                alt={col.name}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                <h3 className="text-xl md:text-2xl font-heading font-bold text-white mb-1">{col.name}</h3>
                <p className="text-sm text-white/60 mb-4">{col.desc}</p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-white border border-white/30 px-4 py-2 rounded-full group-hover:bg-white group-hover:text-black transition-all duration-300">
                  {t("shop.order_now")}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
