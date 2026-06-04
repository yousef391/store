"use client";

import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { reviews } from "@/data/reviews";
import { Star, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function Reviews() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useI18n();

  return (
    <section ref={ref} className="py-16 md:py-24 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{t("reviews.subtitle")}</p>
        <h2 className="text-2xl md:text-4xl font-heading font-bold text-white" dir="rtl">{t("reviews.title")}</h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review, i) => (
          <motion.div
            key={review.id}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            className="bg-surface rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors"
            dir="rtl"
          >
            {/* Stars */}
            <div className="flex items-center gap-0.5 mb-3">
              {Array.from({ length: review.rating }).map((_, j) => (
                <Star key={j} size={14} className="fill-accent text-accent" />
              ))}
            </div>

            {/* Comment */}
            <p className="text-sm text-gray-300 leading-relaxed mb-4 font-medium">
              &ldquo;{review.comment}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center text-accent text-xs font-bold">
                {review.avatar}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{review.name}</p>
                <p className="text-xs text-gray-500" dir="ltr">{review.product}</p>
              </div>
              {review.verified && (
                <div className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 size={14} />
                  <span className="text-[10px] font-bold">{t("reviews.verified")}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
