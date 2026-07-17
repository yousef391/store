import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/home/Hero";
import DeliveryBanner from "@/components/home/DeliveryBanner";
import FeaturedCollections from "@/components/home/FeaturedCollections";
import BestSellers from "@/components/home/BestSellers";
import TrustBadges from "@/components/home/TrustBadges";
import Reviews from "@/components/home/Reviews";
import Newsletter from "@/components/home/Newsletter";

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
      </main>
      <Footer />
    </>
  );
}
