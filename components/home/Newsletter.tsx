"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useI18n } from "@/hooks/useI18n";

export default function Newsletter() {
  const { ref, isVisible } = useScrollAnimation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section ref={ref} className="py-16 md:py-24 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-2xl mx-auto text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{t("newsletter.subtitle")}</p>
        <h2 className="text-2xl md:text-4xl font-heading font-bold text-white mb-4">{t("newsletter.title")}</h2>
        <p className="text-sm md:text-base text-gray-400 mb-8 leading-relaxed">{t("newsletter.desc")}</p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl px-6 py-4 font-semibold"
          >
            ✓ {t("newsletter.success")}
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletter.placeholder")}
              required
              className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-accent text-black text-sm font-bold rounded-xl hover:bg-accent-hover transition-colors active:scale-[0.97] whitespace-nowrap"
            >
              {t("newsletter.cta")}
            </button>
          </form>
        )}
      </motion.div>
    </section>
  );
}
