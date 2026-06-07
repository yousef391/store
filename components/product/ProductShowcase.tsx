"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShowcaseProduct } from "@/data/products";
import algeriaData from "@/data/algeria.json";
import { zonePrices as defaultZonePrices } from "@/data/wilayas";
import { useMetaEvents } from "@/hooks/useMetaEvents";
import Image from "next/image";

interface ProductShowcaseProps {
  variants: ShowcaseProduct[];
  singlePrice: number;
  bundlePrice: number;
  sizes?: string[];
  hasColorSelector?: boolean;
  zonePrices?: Record<number, number>;
}

/* ──── SIZE GUIDE DATA ──── */
const sizeChart = [
  { size: "M", height: "170–175 cm", weight: "60–70 kg", chest: "96 cm" },
  { size: "L", height: "175–180 cm", weight: "70–80 kg", chest: "102 cm" },
  { size: "XL", height: "180–185 cm", weight: "80–90 kg", chest: "108 cm" },
];

/* ──── CUSTOMER REVIEWS DATA ──── */
const productReviews = [
  { name: "كريم ر.", text: "أفضل طقم لبسته في حياتي. القماش ممتاز والخياطة عالمية 🔥", stars: 5, city: "وهران" },
  { name: "مهدي س.", text: "القطعة فخامة من كل النواحي. التوصيل كان سريع. شكراً ROVA!", stars: 5, city: "الجزائر" },
  { name: "أمين ب.", text: "جربت مواقع كثيرة بصح ROVA مختلفة. الجودة حقيقية والأسعار معقولة.", stars: 5, city: "قسنطينة" },
  { name: "سليم خ.", text: "الطلب وصلني في 3 أيام. التغليف فاخر والقطعة أحسن من الصورة!", stars: 5, city: "سطيف" },
];

/* ──── TRUST BADGES DATA ──── */
const trustBadges = [
  { icon: "🛡️", title: "ضمان الجودة", desc: "استبدال مجاني خلال 48 ساعة" },
  { icon: "📦", title: "الفتح قبل الدفع", desc: "تقدر تفتح الطرد وتشوف قبل ما تدفع" },
  { icon: "🚚", title: "توصيل 58 ولاية", desc: "لكل الولايات بأسعار مدروسة" },
  { icon: "💵", title: "الدفع عند الاستلام", desc: "ما تدفع حتى توصلك القطعة" },
];

const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  variants,
  singlePrice,
  bundlePrice,
  sizes: sizesProp,
  hasColorSelector = false,
  zonePrices = defaultZonePrices,
}) => {
  const availableSizes = sizesProp && sizesProp.length > 0 ? sizesProp : ["M", "L", "XL"];
  const { sendEvent } = useMetaEvents();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState(availableSizes[1] || availableSizes[0]);
  const [selectedQuantity, setSelectedQuantity] = useState<1 | 2>(1);
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [hasTrackedAddToCart, setHasTrackedAddToCart] = useState(false);
  const animating = useRef(false);
  const abandonedLeadSent = useRef(false);
  const formNameRef = useRef("");
  const formPhoneRef = useRef("");

  const item = variants[currentIndex];

  // ── Track ViewContent on page load ──
  useEffect(() => {
    sendEvent("ViewContent", {
      value: singlePrice,
      currency: "DZD",
      contentIds: [String(variants[0]?.id)],
      contentName: variants[0]?.name,
      contentCategory: variants[0]?.productType,
      contentType: "product",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const communesForWilaya = selectedWilaya
    ? algeriaData.communes.filter(
        (c: { wilaya_id: string }) => c.wilaya_id.toString() === selectedWilaya
      )
    : [];
  const selectedWilayaObj = algeriaData.wilayas.find(
    (w: { wilaya_id: string; zone: number }) => w.wilaya_id.toString() === selectedWilaya
  );
  const deliveryPrice = selectedWilayaObj
    ? (zonePrices[(selectedWilayaObj as { zone: number }).zone] ?? 900)
    : 0;

  const productPrice = selectedQuantity === 2 ? bundlePrice : singlePrice;
  const totalPrice = productPrice + deliveryPrice;

  // ── Abandoned Lead Detection ──
  // Send lead data when user leaves without completing the order
  const sendAbandonedLead = useCallback(() => {
    const name = formNameRef.current;
    const phone = formPhoneRef.current;
    // Only send if user has entered both name and phone but hasn't ordered
    if (!name || !phone || orderSuccess || isSubmitting || abandonedLeadSent.current) return;
    abandonedLeadSent.current = true;

    const wilayaObj = algeriaData.wilayas.find(
      (w: { wilaya_id: string; wilaya_name_latin: string }) => w.wilaya_id.toString() === selectedWilaya
    );
    const payload = JSON.stringify({
      name,
      phone,
      wilaya: wilayaObj ? `${wilayaObj.wilaya_id} - ${wilayaObj.wilaya_name_latin}` : selectedWilaya || null,
      commune: selectedCommune || null,
      item: variants[currentIndex]?.name,
      color: variants[currentIndex]?.colorName || variants[currentIndex]?.tag,
      size: selectedSize,
      quantity: selectedQuantity,
      price: `${productPrice.toLocaleString('en')} DA`,
      delivery: deliveryPrice,
      total: selectedWilaya ? `${totalPrice.toLocaleString('en')} DA` : null,
    });

    // Use sendBeacon for reliable delivery on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/abandoned-lead', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/abandoned-lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  }, [selectedWilaya, selectedCommune, selectedSize, selectedQuantity, productPrice, deliveryPrice, totalPrice, currentIndex, orderSuccess, isSubmitting, variants]);

  useEffect(() => {
    const handleBeforeUnload = () => sendAbandonedLead();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendAbandonedLead();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [sendAbandonedLead]);

  const navigate = useCallback(
    (dir: number) => {
      if (animating.current) return;
      animating.current = true;
      setCurrentIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return variants.length - 1;
        if (next >= variants.length) return 0;
        return next;
      });
      setTimeout(() => {
        animating.current = false;
      }, 600);
    },
    [variants.length]
  );

  const switchTo = useCallback(
    (idx: number) => {
      if (animating.current || idx === currentIndex) return;
      animating.current = true;
      setCurrentIndex(idx);
      setTimeout(() => {
        animating.current = false;
      }, 600);
    },
    [currentIndex]
  );

  const handleOrderSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setOrderError("");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formNameRef.current,
          phone: formPhoneRef.current,
          wilaya: selectedWilaya,
          commune: selectedCommune,
          item: item.name,
          color: item.colorName || item.tag,
          size: selectedSize,
          quantity: selectedQuantity,
          price: productPrice,
          delivery: deliveryPrice,
          total: totalPrice,
        }),
      });
      if (res.status === 429) {
        const data = await res.json();
        setOrderError(data.error || "لقد قمت بطلب مؤخراً. يرجى المحاولة بعد 48 ساعة.");
        setIsSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error("Order failed");
      setIsSubmitting(false);
      setOrderSuccess(true);

      // Track Purchase event via CAPI + browser pixel
      sendEvent("Purchase", {
        value: totalPrice,
        currency: "DZD",
        contentIds: [String(item.id)],
        contentName: item.name,
        contentCategory: item.productType,
        contentType: "product",
      });
    } catch (err) {
      console.error("Order failed:", err);
      setIsSubmitting(false);
      setOrderError("حدث خطأ. يرجى المحاولة مرة أخرى.");
    }
  };

  /* ──── SHARED SUB-COMPONENTS ──── */

  const TrustBadgesRow = ({ compact = false }: { compact?: boolean }) => (
    <div className={`grid ${compact ? "grid-cols-2 gap-2" : "grid-cols-4 gap-3"}`} dir="rtl">
      {trustBadges.map((b, i) => (
        <div
          key={i}
          className={`flex flex-col items-center text-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm ${compact ? "p-3 gap-1" : "p-4 gap-1.5"}`}
        >
          <span className={compact ? "text-xl" : "text-2xl"}>{b.icon}</span>
          <span className={`text-white font-bold ${compact ? "text-[10px]" : "text-xs"}`}>{b.title}</span>
          <span className={`text-white/40 ${compact ? "text-[8px] leading-tight" : "text-[10px] leading-tight"}`}>{b.desc}</span>
        </div>
      ))}
    </div>
  );

  const CustomerReviewsSection = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex flex-col gap-2" dir="rtl">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-white font-black text-sm" style={{ fontFamily: "var(--font-heading)" }}>آراء العملاء</span>
        <div className="flex items-center gap-1">
          <span className="text-[#fbbf24] text-xs">★★★★★</span>
          <span className="text-white/50 text-[10px]">4.8 (120+)</span>
        </div>
      </div>
      <div className={`flex flex-col gap-2 ${compact ? "max-h-[200px] overflow-y-auto no-scrollbar" : ""}`}>
        {productReviews.map((r, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-bold">
                  {r.name.charAt(0)}
                </div>
                <div>
                  <span className="text-white text-xs font-bold">{r.name}</span>
                  <span className="text-white/30 text-[9px] mr-2">• {r.city}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: r.stars }).map((_, j) => (
                  <svg key={j} width="10" height="10" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z" /></svg>
                ))}
              </div>
            </div>
            <p className="text-white/60 text-[11px] leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const SizeRecommender = ({ onClose }: { onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative z-10 bg-[#1a1a1a] rounded-3xl w-full max-w-sm p-6 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l4.41-4.41A2 2 0 017.83 2h8.34a2 2 0 011.42.59L22 7" /><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><path d="M15 22v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 01-2 2 2.7 2.7 0 01-1.59-.63.7.7 0 00-.82 0A2.7 2.7 0 0116 12a2.7 2.7 0 01-1.59-.63.7.7 0 00-.82 0A2.7 2.7 0 0112 12a2.7 2.7 0 01-1.59-.63.7.7 0 00-.82 0A2.7 2.7 0 018 12a2.7 2.7 0 01-1.59-.63.7.7 0 00-.82 0A2.7 2.7 0 014 12a2 2 0 01-2-2V7" /></svg>
            </div>
            <h3 className="text-white font-black text-lg" style={{ fontFamily: "var(--font-heading)" }}>دليل المقاسات</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Quick Tip */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4">
          <p className="text-accent text-[11px] font-bold mb-0.5">💡 نصيحة سريعة</p>
          <p className="text-white/60 text-[10px] leading-relaxed">إذا كنت بين مقاسين، اختر المقاس الأكبر للراحة المثالية.</p>
        </div>

        {/* Size Table */}
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-center" dir="ltr">
            <thead>
              <tr className="bg-white/10">
                <th className="py-2.5 px-3 text-[11px] font-bold text-accent uppercase tracking-wider">Size</th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-white/60 uppercase tracking-wider">الطول</th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-white/60 uppercase tracking-wider">الوزن</th>
                <th className="py-2.5 px-3 text-[11px] font-bold text-white/60 uppercase tracking-wider">الصدر</th>
              </tr>
            </thead>
            <tbody>
              {sizeChart.map((row) => (
                <tr
                  key={row.size}
                  className={`border-t border-white/5 transition-colors ${selectedSize === row.size ? "bg-accent/10" : "hover:bg-white/5"}`}
                  onClick={() => { setSelectedSize(row.size); }}
                >
                  <td className={`py-2.5 px-3 text-sm font-black ${selectedSize === row.size ? "text-accent" : "text-white"}`}>{row.size}</td>
                  <td className="py-2.5 px-3 text-[11px] text-white/60">{row.height}</td>
                  <td className="py-2.5 px-3 text-[11px] text-white/60">{row.weight}</td>
                  <td className="py-2.5 px-3 text-[11px] text-white/60">{row.chest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Currently Selected */}
        <div className="flex items-center justify-center gap-2 mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
          <span className="text-white/50 text-xs">المقاس المختار:</span>
          <span className="text-white font-black text-lg" style={{ fontFamily: "var(--font-heading)" }}>{selectedSize}</span>
          <span className="text-emerald-400 text-[10px] font-bold">✓</span>
        </div>
      </motion.div>
    </motion.div>
  );

  return (
    <motion.div
      className="relative w-screen min-h-screen lg:min-h-screen overflow-hidden flex flex-col"
      animate={{ backgroundColor: item.bg }}
      transition={{ duration: 0.6 }}
    >
      {/* ────── HEADER (Desktop Only) ────── */}
      <header className="hidden lg:flex relative z-30 justify-between items-center px-10 py-8 shrink-0 w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="h-20 w-auto object-contain drop-shadow-2xl" />
        <div className="flex items-center bg-white/10 backdrop-blur-md rounded-full px-5 py-2.5 gap-3 border border-white/20 shadow-xl shadow-black/20">
          <span className="text-2xl leading-none mt-[-2px]">🇩🇿</span>
          <span className="text-white font-black tracking-widest uppercase text-sm" style={{ fontFamily: "var(--font-dm)" }}>
            Livraison 58 Wilayas
          </span>
          <span className="text-2xl leading-none mt-[-2px]">🇩🇿</span>
        </div>
        <div className="w-20" />
      </header>

      {/* ────── MOBILE LAYOUT ────── */}
      <div className="flex flex-col lg:hidden flex-1 px-4 pt-3 pb-6 gap-4 overflow-y-auto no-scrollbar">
        {/* Mobile Header */}
        <div className="flex items-center justify-center w-full flex-shrink-0 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="h-[4.5rem] w-auto object-contain drop-shadow-xl scale-125" />
        </div>

        {/* Product Image Box */}
        <div className="relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex-shrink-0 z-40">
          <AnimatePresence mode="wait">
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.8}
              onDragEnd={(_e, { offset, velocity }) => {
                const swipePower = Math.abs(offset.x) * velocity.x;
                if (swipePower < -5000 || offset.x < -100) navigate(1);
                else if (swipePower > 5000 || offset.x > 100) navigate(-1);
              }}
              className="relative w-full h-full"
            >
              <Image src={item.image} alt={item.name} fill className="object-cover pointer-events-none" priority />
            </motion.div>
          </AnimatePresence>

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-full px-2.5 py-1.5 flex items-center gap-1.5 shadow-md">
              <span className="text-[12px] leading-none">🇩🇿</span>
              <span className="text-black font-black tracking-wider uppercase text-[9px]" style={{ fontFamily: "var(--font-dm)" }}>
                Livraison 58 Wilayas
              </span>
            </div>
            <div className="bg-black/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 w-fit">
              <span className="text-white font-bold tracking-widest uppercase text-[9px]" style={{ fontFamily: "var(--font-dm)" }}>
                {item.tag}
              </span>
            </div>
          </div>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-50 pointer-events-none">
            {variants.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? "w-5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "w-1.5 bg-white/30"}`} />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col flex-1 justify-between gap-4 mt-1">
          <div className="flex justify-between items-start z-30">
            <div className="flex flex-col">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`m-title-${item.id}`}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="text-white text-[1.7rem] sm:text-4xl font-black uppercase leading-[1.05] tracking-tighter w-[180px]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {item.name}
                </motion.h1>
              </AnimatePresence>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[#fbbf24] text-[11px] tracking-widest">★★★★★</span>
                <span className="text-white/40 text-[10px] ml-1 font-medium" style={{ fontFamily: "var(--font-dm)" }}>4.8 (120+ avis)</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`m-price-${item.id}-${selectedQuantity}`}
                initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
                className="flex flex-col items-end pt-1"
              >
                {selectedQuantity === 2 && (
                  <span className="text-white/40 text-[0.85rem] line-through" style={{ fontFamily: "var(--font-dm)" }}>{(singlePrice * 2).toLocaleString("en")} DA</span>
                )}
                <span className="text-white text-[1.6rem] font-bold tracking-tight whitespace-nowrap" style={{ fontFamily: "var(--font-heading)" }}>
                  {productPrice.toLocaleString("en")} DA
                </span>
                {selectedQuantity === 2 && (
                  <span className="text-amber-400 text-[10px] font-bold tracking-wide" style={{ fontFamily: "var(--font-dm)" }}>وفّر {((singlePrice * 2) - bundlePrice).toLocaleString("en")} DA 🔥</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Variants & Form */}
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {/* Color selector (only for Nocta) */}
              {hasColorSelector && variants.length > 1 && (
                <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-[1.2rem] p-3.5 shadow-inner backdrop-blur-sm">
                  <span className="text-white/60 text-[11px] uppercase tracking-widest font-bold font-dm">Color: <span className="text-white ml-1 font-black">{item.colorName}</span></span>
                  <div className="flex gap-2.5">
                    {variants.map((j, idx) => (
                      <button key={j.id} type="button" onClick={() => switchTo(idx)} className={`w-7 h-7 rounded-full transition-all duration-300 border-2 ${idx === currentIndex ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-transparent scale-95 opacity-80"}`} style={{ backgroundColor: j.swatch }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Size + Size Guide */}
              <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-[1.2rem] p-3.5 shadow-inner backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/60 text-[11px] uppercase tracking-widest font-bold font-dm">Size</span>
                  <button
                    type="button"
                    onClick={() => setSizeGuideOpen(true)}
                    className="text-accent text-[10px] font-bold underline underline-offset-2 hover:text-accent/80 transition-colors"
                  >
                    📏 دليل المقاسات
                  </button>
                </div>
                <div className="flex gap-2">
                  {availableSizes.map((s) => (
                    <button key={s} type="button" onClick={() => setSelectedSize(s)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black transition-all duration-300 ${selectedSize === s ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "bg-white/10 text-white"}`} style={{ fontFamily: "var(--font-dm)" }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-2">
                <span className="text-white/60 text-[11px] uppercase tracking-widest font-bold font-dm px-1">الكمية</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedQuantity(1)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[1.2rem] p-3 transition-all duration-300 border ${selectedQuantity === 1 ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "bg-white/5 text-white border-white/10"}`}>
                    <span className="text-[13px] font-black" style={{ fontFamily: "var(--font-dm)" }}>1 قطعة</span>
                    <span className="text-[15px] font-black" style={{ fontFamily: "var(--font-heading)" }}>{singlePrice.toLocaleString("en")} DA</span>
                  </button>
                  <button type="button" onClick={() => setSelectedQuantity(2)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-[1.2rem] p-3 transition-all duration-300 border relative overflow-hidden ${selectedQuantity === 2 ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.4)]" : "bg-white/5 text-white border-white/10"}`}>
                    <span className="absolute -top-0 -right-0 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg rounded-tr-[1.1rem]">PROMO</span>
                    <span className="text-[13px] font-black" style={{ fontFamily: "var(--font-dm)" }}>2 قطع 🔥</span>
                    <span className="text-[15px] font-black" style={{ fontFamily: "var(--font-heading)" }}>{bundlePrice.toLocaleString("en")} DA</span>
                    <span className={`text-[9px] font-bold ${selectedQuantity === 2 ? "text-black/60" : "text-amber-400"}`} style={{ fontFamily: "var(--font-dm)" }}>وفّر {((singlePrice * 2) - bundlePrice).toLocaleString("en")} DA</span>
                  </button>
                </div>
              </div>

              {/* Order Form */}
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 font-sans"
                style={{ direction: "rtl" }}
                onSubmit={handleOrderSubmit}
              >
                <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-xl border border-white/10 mt-1 shadow-2xl flex flex-col gap-3">
                  <input required name="name" placeholder="الاسم الكامل" onChange={(e) => { formNameRef.current = e.target.value; }} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[15px] text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                  <input required type="tel" name="phone" placeholder="رقم الهاتف" onChange={(e) => { formPhoneRef.current = e.target.value; }} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[15px] text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors text-right" dir="ltr" />
                  <div className="flex flex-col gap-2">
                    <select required value={selectedWilaya} onChange={(e) => { setSelectedWilaya(e.target.value); setSelectedCommune(""); if (!hasTrackedAddToCart) { setHasTrackedAddToCart(true); sendEvent('AddToCart', { value: productPrice, currency: 'DZD', contentIds: [String(item.id)], contentName: item.name, contentCategory: item.productType, contentType: 'product' }); } }} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[15px] text-white focus:outline-none focus:border-white/40 transition-colors appearance-none">
                      <option value="" disabled className="text-black">اختر الولاية</option>
                      {algeriaData.wilayas.map((w: { wilaya_id: string; wilaya_name_latin: string }) => (
                        <option key={w.wilaya_id} value={w.wilaya_id} className="text-black text-left" dir="ltr">{w.wilaya_id} - {w.wilaya_name_latin}</option>
                      ))}
                    </select>
                    <select required value={selectedCommune} onChange={(e) => setSelectedCommune(e.target.value)} disabled={!selectedWilaya} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[15px] text-white focus:outline-none focus:border-white/40 transition-colors appearance-none disabled:opacity-50">
                      <option value="" disabled className="text-black">البلدية</option>
                      {communesForWilaya.map((c: { commune_id: number; commune_name_latin: string }) => (
                        <option key={c.commune_id} value={c.commune_name_latin} className="text-black text-left" dir="ltr">{c.commune_name_latin}</option>
                      ))}
                    </select>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col gap-1 mt-1 font-sans">
                    <div className="flex justify-between text-white/70 text-xs">
                      <span>المجموع ({selectedQuantity} قطعة - المقاس: {selectedSize})</span>
                      <span dir="ltr">{productPrice.toLocaleString("en")} DA</span>
                    </div>
                    <div className="flex justify-between text-white/70 text-xs">
                      <span>التوصيل</span>
                      <span className="text-white font-medium" dir="ltr">{selectedWilaya ? `${deliveryPrice} DA` : "---"}</span>
                    </div>
                    <div className="h-[1px] w-full bg-white/10 my-1" />
                    <div className="flex justify-between text-white text-sm font-bold">
                      <span>السعر النهائي</span>
                      <span dir="ltr">{selectedWilaya ? `${totalPrice.toLocaleString("en")} DA` : "---"}</span>
                    </div>
                  </div>

                  <button disabled={isSubmitting || orderSuccess} type="submit" className="w-full py-4 mt-2 rounded-[1.2rem] bg-white text-black font-black uppercase text-[15px] tracking-tight shadow-[0_10px_40px_rgba(255,255,255,0.3)] active:scale-[0.98] transition-transform flex justify-center items-center gap-2 cursor-pointer disabled:opacity-75 disabled:scale-100">
                    {isSubmitting ? "جاري الإرسال..." : orderSuccess ? "تم الطلب بنجاح ✓" : "تأكيد الطلب"}
                  </button>
                  {orderError && (
                    <div className="w-full text-center py-2 px-3 mt-2 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs font-bold text-red-400" dir="rtl">{orderError}</p>
                    </div>
                  )}
                </div>
              </motion.form>

              {/* ──── TRUST BADGES (Mobile — after form) ──── */}
              <TrustBadgesRow compact />

              {/* ──── CUSTOMER REVIEWS (Mobile) ──── */}
              <CustomerReviewsSection compact />
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* ────── DESKTOP LAYOUT ────── */}
      {/* Floating tag */}
      <div className="hidden lg:block absolute top-36 left-10 z-20">
        <AnimatePresence mode="wait">
          <motion.span
            key={item.tag + "-d"}
            initial={{ opacity: 0, scale: 0.7, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="inline-block px-4 py-2 rounded-full text-sm font-semibold tracking-wide backdrop-blur-md border border-white/10 bg-white/5"
            style={{ color: "white", fontFamily: "var(--font-dm)" }}
          >
            {item.tag}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Hero text — left */}
      <div className="hidden lg:flex absolute left-10 top-1/2 -translate-y-1/2 z-20 max-w-[380px] flex-col">
        <AnimatePresence mode="wait">
          <motion.h1
            key={`d-name-${item.id}`}
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-white text-5xl xl:text-6xl leading-[1.05] tracking-tighter uppercase font-black mb-5"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {item.name.split(" ").map((word, i) => (
              <span key={i} className="block">{word}</span>
            ))}
          </motion.h1>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={`d-desc-${item.id}`}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="text-white/40 text-sm leading-relaxed mb-6"
            style={{ fontFamily: "var(--font-dm)" }}
          >
            {item.desc}
          </motion.p>
        </AnimatePresence>

        {/* Desktop Trust Badges (below description) */}
        <div className="grid grid-cols-2 gap-2">
          {trustBadges.map((b, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2.5 backdrop-blur-sm" dir="rtl">
              <span className="text-lg">{b.icon}</span>
              <div>
                <p className="text-white text-[10px] font-bold">{b.title}</p>
                <p className="text-white/30 text-[8px]">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center image — desktop */}
      <div className="hidden lg:flex absolute inset-0 items-center justify-center z-10 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id + "-d"}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative w-[480px] h-[600px] rounded-[2.5rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] border border-white/10 bg-white/5 pointer-events-auto"
          >
            <Image src={item.image} alt={item.name} fill className="object-cover" priority />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Sidebar — desktop */}
      <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 z-20 flex-col gap-10 w-[120px] items-end">
        {hasColorSelector && variants.length > 1 && (
          <div className="flex flex-col gap-4 items-end">
            <span className="text-white/60 text-xs uppercase tracking-[0.2em] font-bold" style={{ fontFamily: "var(--font-heading)" }}>Color</span>
            {variants.map((j, idx) => (
              <motion.button key={j.id} onClick={() => switchTo(idx)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className={`w-8 h-8 rounded-full border-2 transition-all ${idx === currentIndex ? "border-white scale-110" : "border-transparent scale-100"}`} style={{ backgroundColor: j.swatch }} />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-3 items-end">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSizeGuideOpen(true)}
              className="text-accent text-[9px] font-bold hover:underline transition-all"
            >
              📏
            </button>
            <span className="text-white/60 text-xs uppercase tracking-[0.2em] font-bold" style={{ fontFamily: "var(--font-heading)" }}>Size</span>
          </div>
          {availableSizes.map((s) => (
            <button key={s} onClick={() => setSelectedSize(s)} className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${selectedSize === s ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`} style={{ fontFamily: "var(--font-dm)" }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 items-end">
          <span className="text-white/60 text-xs uppercase tracking-[0.2em] font-bold" style={{ fontFamily: "var(--font-heading)" }}>Qty</span>
          <button onClick={() => setSelectedQuantity(1)} className={`h-auto px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all ${selectedQuantity === 1 ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`} style={{ fontFamily: "var(--font-dm)" }}>
            <span className="text-xs font-bold">1 pc</span>
            <span className="text-[10px] font-bold opacity-70">{singlePrice.toLocaleString("en")}</span>
          </button>
          <button onClick={() => setSelectedQuantity(2)} className={`h-auto px-3 py-2 rounded-xl flex flex-col items-center justify-center transition-all relative ${selectedQuantity === 2 ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-[0_0_15px_rgba(251,191,36,0.4)]" : "bg-white/10 text-white hover:bg-white/20"}`} style={{ fontFamily: "var(--font-dm)" }}>
            <span className="text-xs font-bold">2 pcs 🔥</span>
            <span className="text-[10px] font-bold opacity-70">{bundlePrice.toLocaleString("en")}</span>
          </button>
        </div>
      </div>

      {/* Bottom bar — desktop */}
      <div className="hidden lg:flex absolute bottom-0 left-0 right-0 z-20 items-end justify-between px-10 pb-8">
        {/* Review */}
        <div className="max-w-[280px]">
          <div className="flex items-center gap-1 mb-1.5">
            {[1, 2, 3, 4].map((s) => (
              <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z" /></svg>
            ))}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01z" /></svg>
            <span className="text-white/50 text-xs ml-1" style={{ fontFamily: "var(--font-dm)" }}>4.8</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={`d-rev-${item.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="text-white/35 text-xs italic leading-relaxed" style={{ fontFamily: "var(--font-dm)" }} dir="rtl">
              {item.review}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Price + arrows */}
        <div className="flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div key={`d-price-${item.id}-${selectedQuantity}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="flex flex-col items-center">
              {selectedQuantity === 2 && (
                <span className="text-white/40 text-sm line-through" style={{ fontFamily: "var(--font-dm)" }}>{(singlePrice * 2).toLocaleString("en")} DA</span>
              )}
              <span className="text-white text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                {productPrice.toLocaleString("en")} DA
              </span>
              {selectedQuantity === 2 && (
                <span className="text-amber-400 text-xs font-bold mt-0.5" style={{ fontFamily: "var(--font-dm)" }}>وفّر {((singlePrice * 2) - bundlePrice).toLocaleString("en")} DA 🔥</span>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8L10 13" /></svg>
            </motion.button>
            <span className="text-white/50 text-xs tabular-nums" style={{ fontFamily: "var(--font-dm)" }}>{currentIndex + 1} / {variants.length}</span>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(1)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M6 3L11 8L6 13" /></svg>
            </motion.button>
          </div>
        </div>

        {/* Desktop Form */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.form
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute bottom-0 right-0 w-[400px] flex flex-col gap-3 bg-white/10 p-6 rounded-[2rem] backdrop-blur-2xl border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-50 overflow-hidden"
              style={{ fontFamily: "var(--font-dm)", direction: "rtl" }}
              onSubmit={handleOrderSubmit}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-[-1]" />
              <h3 className="text-white font-black tracking-tight text-2xl mb-1 relative z-10" style={{ fontFamily: "var(--font-heading)" }}>تأكيد الطلبية</h3>
              <input required name="name" placeholder="الاسم الكامل" onChange={(e) => { formNameRef.current = e.target.value; }} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors text-base relative z-10" />
              <input required type="tel" name="phone" placeholder="رقم الهاتف" onChange={(e) => { formPhoneRef.current = e.target.value; }} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors text-right text-base relative z-10" dir="ltr" />
              <div className="flex gap-2 relative z-10">
                <select required value={selectedWilaya} onChange={(e) => { setSelectedWilaya(e.target.value); setSelectedCommune(""); if (!hasTrackedAddToCart) { setHasTrackedAddToCart(true); sendEvent('AddToCart', { value: productPrice, currency: 'DZD', contentIds: [String(item.id)], contentName: item.name, contentCategory: item.productType, contentType: 'product' }); } }} className="w-[45%] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors appearance-none cursor-pointer text-base">
                  <option value="" disabled className="text-black">1. الولاية</option>
                  {algeriaData.wilayas.map((w: { wilaya_id: string; wilaya_name_latin: string }) => (
                    <option key={w.wilaya_id} value={w.wilaya_id} className="text-black text-left" dir="ltr">{w.wilaya_id} - {w.wilaya_name_latin}</option>
                  ))}
                </select>
                <select required value={selectedCommune} onChange={(e) => setSelectedCommune(e.target.value)} disabled={!selectedWilaya} className="w-[55%] bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/50 transition-colors appearance-none disabled:opacity-50 cursor-pointer text-base">
                  <option value="" disabled className="text-black">2. البلدية</option>
                  {communesForWilaya.map((c: { commune_id: number; commune_name_latin: string }) => (
                    <option key={c.commune_id} value={c.commune_name_latin} className="text-black text-left" dir="ltr">{c.commune_name_latin}</option>
                  ))}
                </select>
              </div>

              {/* Desktop Order Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 mt-1 font-sans relative z-10">
                <div className="flex justify-between text-white/70 text-sm">
                  <span>المجموع ({selectedQuantity} قطعة - المقاس: {selectedSize})</span>
                  <span dir="ltr">{productPrice.toLocaleString("en")} DA</span>
                </div>
                <div className="flex justify-between text-white/70 text-sm">
                  <span>التوصيل</span>
                  <span className="text-white font-medium" dir="ltr">{selectedWilaya ? `${deliveryPrice} DA` : "---"}</span>
                </div>
                <div className="h-[1px] w-full bg-white/10 my-1" />
                <div className="flex justify-between text-white text-lg font-black">
                  <span>السعر النهائي</span>
                  <span dir="ltr">{selectedWilaya ? `${totalPrice.toLocaleString("en")} DA` : "---"}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-3 font-sans relative z-10 w-full flex-col" dir="ltr">
                <button disabled={isSubmitting || orderSuccess} type="submit" className="w-full py-4 rounded-xl bg-white text-black font-black uppercase text-sm tracking-wider hover:bg-white/90 transition-transform active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer disabled:opacity-75 disabled:scale-100 flex items-center justify-center">
                  {isSubmitting ? "جاري الإرسال..." : orderSuccess ? "تم الطلب بنجاح ✓" : "تأكيد الطلب"}
                </button>
                {orderError && (
                  <div className="w-full text-center py-2 px-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs font-bold text-red-400" dir="rtl">{orderError}</p>
                  </div>
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>

      {/* ────── SIZE GUIDE MODAL ────── */}
      <AnimatePresence>
        {sizeGuideOpen && <SizeRecommender onClose={() => setSizeGuideOpen(false)} />}
      </AnimatePresence>

      {/* ────── SUCCESS DIALOG ────── */}
      <AnimatePresence>
        {orderSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setOrderSuccess(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            {/* Confetti particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0, x: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0, 1, 1, 0.5], x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 600 - 100 }} transition={{ duration: 2 + Math.random() * 1.5, delay: Math.random() * 0.5, ease: "easeOut" }} className="absolute pointer-events-none" style={{ width: 6 + Math.random() * 10, height: 6 + Math.random() * 10, borderRadius: Math.random() > 0.5 ? "50%" : "2px", backgroundColor: ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"][Math.floor(Math.random() * 6)], rotate: Math.random() * 360 }} />
            ))}

            {/* Dialog Card */}
            <motion.div initial={{ opacity: 0, scale: 0.7, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 22, delay: 0.1 }} className="relative z-10 bg-white rounded-[2.5rem] w-full max-w-sm p-8 flex flex-col items-center text-center shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-green-200 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-50" />

              {/* Animated checkmark */}
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }} className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full shadow-lg shadow-green-500/30" />
                <motion.svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full p-6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 13l4 4L19 7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }} />
                </motion.svg>
                <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 1 }} className="absolute inset-0 bg-green-400 rounded-full" />
              </motion.div>

              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-2xl font-black text-gray-900 mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                تم الطلب بنجاح
              </motion.h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-gray-500 text-sm mb-6 leading-relaxed" style={{ fontFamily: "var(--font-dm)" }}>
                شكراً لك! سيتم التواصل معك قريباً لتأكيد الطلبية.
              </motion.p>

              {/* Summary */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="w-full bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" /></svg>
                  </div>
                  <div className="text-left" dir="ltr">
                    <p className="text-sm font-bold text-gray-900" style={{ fontFamily: "var(--font-dm)" }}>{item.name}</p>
                    <p className="text-xs text-gray-500">{item.colorName} • {selectedSize} • {selectedQuantity}x</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">المبلغ الإجمالي</span>
                  <span className="text-lg font-black text-gray-900" style={{ fontFamily: "var(--font-heading)" }} dir="ltr">
                    {totalPrice.toLocaleString("en")} DA
                  </span>
                </div>
              </motion.div>

              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} onClick={() => setOrderSuccess(false)} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 text-white font-bold text-sm tracking-wide shadow-lg shadow-gray-900/20 active:scale-[0.98] transition-transform" style={{ fontFamily: "var(--font-dm)" }}>
                حسناً
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProductShowcase;
