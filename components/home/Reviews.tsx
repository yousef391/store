"use client";

import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useI18n } from "@/hooks/useI18n";
import Image from "next/image";

const avisImages = [
  "/avis/photo_5967660636512652734_y.jpg",
  "/avis/photo_5967660636512652735_y.jpg",
  "/avis/photo_5969912436326338031_y.jpg",
  "/avis/photo_5967660636512652737_y.jpg"
];

export default function Reviews() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useI18n();

  return (
    <section ref={ref} className="py-16 md:py-24 px-4 max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{t("reviews.subtitle")}</p>
        <h2 className="text-2xl md:text-4xl font-heading font-bold text-white" dir="rtl">آراء عملائنا</h2>
      </motion.div>

      {/* Image Carousel (Snap Scrolling) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="w-full"
      >
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-8 px-4 -mx-4 md:px-0 md:mx-0">
          {avisImages.map((src, i) => (
            <div 
              key={i} 
              className="relative min-w-[280px] md:min-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden snap-center bg-surface border border-white/10 shadow-2xl shrink-0 group"
            >
              <Image 
                src={src} 
                alt={`Avis Client ${i + 1}`} 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-105" 
                sizes="(max-width: 768px) 280px, 320px"
              />
              {/* Optional overlay gradient for styling */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
