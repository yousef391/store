"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

export default function AnnouncementBar() {
  const { t, isRTL } = useI18n();
  const [index, setIndex] = useState(0);

  const keys = ["announcement.1", "announcement.2", "announcement.3"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % keys.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [keys.length]);

  return (
    <div className="w-full bg-[#0a0c10] border-b border-white/5 relative z-50">
      {/* Algerian Flag subtle accent line */}
      <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-[#006241] via-[#ffffff] to-[#d21034] to-transparent opacity-60" />
      
      <div className="max-w-7xl mx-auto px-4 h-9 flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/90 text-center flex items-center justify-center gap-2"
            dir={isRTL ? "rtl" : "ltr"}
          >
            {t(keys[index])}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
