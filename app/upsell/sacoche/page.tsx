"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle, 
  Package, 
  Heart, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Star,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function UpsellLandingPage() {
  const router = useRouter();
  const [showFloatingButton, setShowFloatingButton] = useState(false);

  // Show floating button after scrolling down a bit
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowFloatingButton(true);
      } else {
        setShowFloatingButton(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAcceptOffer = () => {
    router.push("/shop/success");
  };

  const handleDeclineOffer = () => {
    router.push("/shop/success");
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white pb-32 font-sans selection:bg-orange-500 selection:text-white" dir="rtl">
      
      {/* Container */}
      <div className="max-w-md mx-auto w-full p-5 pt-12 flex flex-col items-center">
        
        {/* 1. Success Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-orange-500 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-orange-500" strokeWidth={3} />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">شكراً لك!</h1>
          <p className="text-gray-300 font-medium text-sm">
            تم تأكيد طلبك بنجاح.<br />كل شيء جاهز الآن.
          </p>
        </div>

        {/* 2. Order Status Box */}
        <div className="w-full bg-[#1A1A1A] rounded-2xl p-4 mb-8 flex items-center gap-4">
          <div className="p-3 bg-[#252525] rounded-xl text-orange-500">
            <Package className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-sm">طقم نايك الخاص بك في طريقه إليك.</h3>
            <p className="text-gray-400 text-xs mt-1">سنتواصل معك قريباً لتأكيد الشحن.</p>
          </div>
        </div>

        {/* 3. Main Upsell Card */}
        <div className="w-full relative bg-[#1A1A1A] rounded-3xl p-5 border border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
          
          {/* Badge */}
          <div className="absolute -top-3 right-6 bg-[#0F0F0F] px-2">
            <div className="border border-orange-500 text-orange-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              عرض بضغطة واحدة
            </div>
          </div>

          <h2 className="text-3xl font-black text-white leading-tight mt-4 mb-2">
            أضف الساكوش<br />لطلبك الحالي
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            احصل على هذه الحقيبة الفاخرة لتكتمل أناقتك، واستفد من التوصيل المجاني.
          </p>
          
          <div className="mb-4">
             <span className="text-4xl font-black text-orange-500">2500</span>
             <span className="text-xl font-bold text-orange-500 ml-2">د.ج</span>
             <span className="text-gray-500 line-through text-sm mr-3">4500 د.ج</span>
          </div>

          {/* Media / Video Container (Vertical Stack Layout) */}
          <div className="w-full flex flex-col gap-4 mb-6">
            
            {/* 1. Video */}
            <div className="relative w-full aspect-[4/5] bg-black rounded-2xl overflow-hidden border border-white/5">
              <video 
                src="/IMG_1448.mov" 
                autoPlay 
                loop 
                muted 
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Discount Sticker */}
              <div className="absolute top-2 left-2 w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg transform -rotate-12 z-10">
                <div className="text-center">
                  <span className="block text-black font-black text-[9px] leading-none">توصيل</span>
                  <span className="block text-black font-black text-[9px] leading-none">مجاني</span>
                </div>
              </div>
            </div>

            {/* 2. Uploaded Image 1 (Flat lay) */}
            <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-white/5">
              <img 
                src="/sacoche-1.jpg" 
                alt="Sacoche Lacoste 1"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>

            {/* 3. Uploaded Image 2 (On person) */}
            <div className="relative w-full aspect-[4/5] bg-black rounded-2xl overflow-hidden border border-white/5">
              <img 
                src="/sacoche-2.jpg" 
                alt="Sacoche Lacoste 2"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
          </div>

          {/* Add Now Button inside Card */}
          <button 
            onClick={handleAcceptOffer}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_0_rgba(249,115,22,0.39)]"
          >
            أضف الآن - 2500 د.ج
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* 4. Landing Page Details (Features) */}
        <div className="w-full mt-12 mb-8 space-y-6">
          <h3 className="text-xl font-bold text-white text-center mb-6">لماذا تحتاج هذه الحقيبة؟</h3>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#1A1A1A] rounded-full text-orange-500 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">جودة ممتازة</h4>
              <p className="text-gray-400 text-sm mt-1">خامات متينة ومقاومة للماء تحافظ على أغراضك بأمان تام.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#1A1A1A] rounded-full text-orange-500 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">شحن مدمج مجاني</h4>
              <p className="text-gray-400 text-sm mt-1">لن تدفع أي رسوم شحن إضافية، سنرسلها مع طقم النايك الخاص بك.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#1A1A1A] rounded-full text-orange-500 shrink-0">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-white text-base">الخيار المفضل لعملائنا</h4>
              <p className="text-gray-400 text-sm mt-1">أكثر من 500 عميل اختاروا إضافة هذا الساكوش لإطلالتهم.</p>
            </div>
          </div>
        </div>

        {/* 5. Footer Appreciation Box */}
        <div className="w-full bg-[#1A1A1A] rounded-2xl p-5 mb-8 flex items-center gap-4">
          <Heart className="w-6 h-6 text-orange-500" />
          <div className="flex flex-col">
            <h3 className="font-bold text-white text-sm">نحن نقدر ثقتك!</h3>
            <p className="text-gray-400 text-xs mt-1">شكراً لكونك جزءاً من عائلتنا.</p>
          </div>
        </div>

        {/* Decline Link */}
        <button 
          onClick={handleDeclineOffer}
          className="text-gray-500 hover:text-white font-medium text-sm flex items-center gap-2 transition-colors pb-10"
        >
          لا شكراً، لا أريد الاستفادة من العرض
        </button>

      </div>

      {/* 6. Floating Action Button (Sticky at bottom) */}
      <AnimatePresence>
        {showFloatingButton && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F] to-transparent z-50 flex flex-col items-center"
          >
            <div className="max-w-md w-full">
              <button 
                onClick={handleAcceptOffer}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black text-lg py-4 rounded-xl flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(249,115,22,0.3)] transform transition-transform active:scale-95"
              >
                أضف الآن - 2500 د.ج
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleDeclineOffer}
                className="w-full text-center mt-3 text-gray-400 text-xs hover:text-white"
              >
                تخطي العرض
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
