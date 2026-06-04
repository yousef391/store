"use client";

import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Truck, CreditCard, Shield, RotateCcw } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

export default function TrustBadges() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useI18n();

  const badges = [
    { icon: Truck, title: t("trust.delivery"), desc: t("trust.delivery_desc") },
    { icon: CreditCard, title: t("trust.cod"), desc: t("trust.cod_desc") },
    { icon: Shield, title: t("trust.quality"), desc: t("trust.quality_desc") },
    { icon: RotateCcw, title: t("trust.exchange"), desc: t("trust.exchange_desc") },
  ];

  return (
    <section ref={ref} className="py-12 md:py-16 px-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {badges.map((badge, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 * i }}
            className="text-center p-4 md:p-6"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mx-auto mb-3">
              <badge.icon size={20} />
            </div>
            <h4 className="text-xs md:text-sm font-bold text-white mb-1">{badge.title}</h4>
            <p className="text-[10px] md:text-xs text-gray-500">{badge.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
