import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import DeliveryBanner from "@/components/home/DeliveryBanner";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import BestSellers from "@/components/home/BestSellers";
import TrustBadges from "@/components/home/TrustBadges";
import Reviews from "@/components/home/Reviews";
import Newsletter from "@/components/home/Newsletter";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <DeliveryBanner />
        <BestSellers />
        <FeaturedCollections />
        <TrustBadges />
        <Reviews />
        <Newsletter />
        
        {/* Test Floating Button for Upsell */}
        <Link 
          href="/upsell/sacoche"
          className="fixed bottom-10 right-10 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center justify-center z-50 animate-bounce transition-transform"
        >
          🚀 Test Upsell Page
        </Link>
      </main>
      <Footer />
    </>
  );
}
