"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/hooks/useI18n";

const sizeData = [
  { size: "M", heightMin: 168, heightMax: 178, weightMin: 63, weightMax: 75 },
  { size: "L", heightMin: 175, heightMax: 185, weightMin: 73, weightMax: 85 },
  { size: "XL", heightMin: 183, heightMax: 195, weightMin: 83, weightMax: 100 },
];

const heightOptions = Array.from({ length: 41 }, (_, i) => 155 + i); // 155–195
const weightOptions = Array.from({ length: 51 }, (_, i) => 50 + i);  // 50–100

function recommend(height: number | null, weight: number | null): string | null {
  if (height === null && weight === null) return null;

  let best: string | null = null;
  let bestScore = -Infinity;

  for (const s of sizeData) {
    let score = 0;
    if (height !== null) {
      if (height >= s.heightMin && height <= s.heightMax) score += 2;
      else {
        const dist = Math.min(Math.abs(height - s.heightMin), Math.abs(height - s.heightMax));
        score -= dist * 0.1;
      }
    }
    if (weight !== null) {
      if (weight >= s.weightMin && weight <= s.weightMax) score += 2;
      else {
        const dist = Math.min(Math.abs(weight - s.weightMin), Math.abs(weight - s.weightMax));
        score -= dist * 0.1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = s.size;
    }
  }
  return best;
}

export default function SizeGuide() {
  const [height, setHeight] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const { t } = useI18n();

  const recommended = useMemo(() => recommend(height, weight), [height, weight]);

  return (
    <section
      id="size-guide"
      className="relative w-full bg-[#0a0a0a] py-16 px-4 sm:px-8 lg:px-16 overflow-hidden"
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none z-10" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-20 max-w-5xl mx-auto"
      >
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="inline-block text-[10px] sm:text-xs uppercase tracking-[0.35em] text-white/40 font-bold mb-3">
            Guide des tailles
          </span>
          <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-heading font-bold uppercase tracking-tight">
            Trouvez votre taille
          </h2>
          <p className="text-white/40 text-sm sm:text-base mt-3 max-w-md mx-auto leading-relaxed">
            Ensemble Nike Airmax — Qualité Turquie. Sélectionnez votre taille et poids pour une recommandation personnalisée.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* ── Size Chart Table ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
          >
            <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em] mb-5 font-heading">
              Tableau des tailles
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 px-3 text-[11px] sm:text-xs uppercase tracking-widest text-white/50 font-bold">Taille</th>
                    <th className="py-3 px-3 text-[11px] sm:text-xs uppercase tracking-widest text-white/50 font-bold">Hauteur (cm)</th>
                    <th className="py-3 px-3 text-[11px] sm:text-xs uppercase tracking-widest text-white/50 font-bold">Poids (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeData.map((row) => {
                    const isRecommended = recommended === row.size;
                    return (
                      <tr
                        key={row.size}
                        className={`border-b border-white/5 transition-all duration-500 ${
                          isRecommended
                            ? "bg-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black transition-all duration-500 ${
                                isRecommended
                                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                                  : "bg-white/5 text-white/70 border border-white/10"
                              }`}
                            >
                              {row.size}
                            </span>
                            {isRecommended && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-[10px] uppercase tracking-widest text-[#fbbf24] font-bold whitespace-nowrap"
                              >
                                ★ Recommandé
                              </motion.span>
                            )}
                          </div>
                        </td>
                        <td className={`py-4 px-3 text-sm font-medium tabular-nums transition-colors duration-500 ${isRecommended ? "text-white" : "text-white/50"}`}>
                          {row.heightMin} – {row.heightMax}
                        </td>
                        <td className={`py-4 px-3 text-sm font-medium tabular-nums transition-colors duration-500 ${isRecommended ? "text-white" : "text-white/50"}`}>
                          {row.weightMin} – {row.weightMax}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ── Interactive Size Finder ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <h3 className="text-white text-sm font-bold uppercase tracking-[0.2em] mb-5 font-heading">
              Trouvez votre taille
            </h3>

            {/* Height selector */}
            <div className="mb-5">
              <label className="block text-white/50 text-[11px] uppercase tracking-widest font-bold mb-2.5">
                Votre hauteur (cm)
              </label>
              <select
                value={height ?? ""}
                onChange={(e) => setHeight(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="text-black">Sélectionnez</option>
                {heightOptions.map((h) => (
                  <option key={h} value={h} className="text-black">
                    {h} cm
                  </option>
                ))}
              </select>
            </div>

            {/* Weight selector */}
            <div className="mb-6">
              <label className="block text-white/50 text-[11px] uppercase tracking-widest font-bold mb-2.5">
                Votre poids (kg)
              </label>
              <select
                value={weight ?? ""}
                onChange={(e) => setWeight(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="text-black">Sélectionnez</option>
                {weightOptions.map((w) => (
                  <option key={w} value={w} className="text-black">
                    {w} kg
                  </option>
                ))}
              </select>
            </div>

            {/* Result */}
            <div className="flex-1 flex items-center justify-center">
              {recommended ? (
                <motion.div
                  key={recommended}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center"
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(255,255,255,0.2)] mb-4">
                    <span className="text-black text-4xl sm:text-5xl font-black font-heading">
                      {recommended}
                    </span>
                  </div>
                  <p className="text-white/60 text-xs uppercase tracking-widest font-bold">
                    Taille recommandée
                  </p>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/5 border border-white/10 border-dashed flex items-center justify-center mx-auto mb-4">
                    <span className="text-white/20 text-4xl">?</span>
                  </div>
                  <p className="text-white/30 text-xs uppercase tracking-widest font-bold">
                    Sélectionnez vos mesures
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Footer note */}
        <p className="text-center text-white/20 text-[11px] mt-8 tracking-wide">
          Ces recommandations sont indicatives. En cas de doute, optez pour la taille supérieure.
        </p>
      </motion.div>
    </section>
  );
}
