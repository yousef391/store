"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Home, Package, Truck, PhoneCall, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";

export default function SuccessPage() {
  
  useEffect(() => {
    // Fire a simple, single confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#F59E0B', '#ffffff']
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 font-sans selection:bg-orange-500 selection:text-white relative overflow-hidden" dir="rtl">
      
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
        className="w-28 h-28 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 relative z-10 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]"
      >
        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
        <CheckCircle2 className="w-14 h-14 text-emerald-400 relative z-10" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-center z-10 relative"
      >
        <div className="flex items-center justify-center gap-2 mb-2 text-orange-500">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-sm tracking-widest uppercase">طلب ناجح</span>
          <Sparkles className="w-5 h-5" />
        </div>
        <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight text-white drop-shadow-lg">
          تم تأكيد طلبك <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">بنجاح!</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-lg mb-12 leading-relaxed mx-auto">
          شكراً لثقتك بنا. فريقنا يقوم الآن بتجهيز طلبك وسنتصل بك قريباً لتأكيد تفاصيل الشحن.
        </p>
      </motion.div>

      <motion.div 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mb-14 z-10 relative"
      >
        {[
          { icon: PhoneCall, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", title: "تأكيد هاتفي", desc: "سنتصل بك خلال 24 ساعة" },
          { icon: Package, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", title: "تجهيز الطلب", desc: "نغلف طلبك بعناية فائقة" },
          { icon: Truck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", title: "شحن سريع", desc: "الدفع يداً بيد عند الاستلام" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }}
            className={`bg-[#121214] border ${item.border} p-6 rounded-2xl flex flex-col items-center text-center shadow-lg transition-all`}
          >
            <div className={`w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
              <item.icon className={`w-7 h-7 ${item.color}`} />
            </div>
            <h3 className="font-bold text-lg mb-1.5 text-white">{item.title}</h3>
            <p className="text-sm text-gray-400">{item.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="z-10 relative"
      >
        <Link 
          href="/"
          className="group flex items-center gap-3 bg-white text-black px-10 py-4 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)]"
        >
          <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>العودة للمتجر</span>
        </Link>
      </motion.div>

    </div>
  );
}
