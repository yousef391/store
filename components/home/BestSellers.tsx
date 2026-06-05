"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { products as staticProducts } from "@/data/products";
import { fetchProducts } from "@/lib/api";
import { Star } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

interface DisplayProduct {
  id: number;
  slug: string;
  name: string;
  images: string[];
  tag: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
}

export default function BestSellers() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useI18n();

  const [featured, setFeatured] = useState<DisplayProduct[]>(
    staticProducts.filter((p) => p.isFeatured)
  );

  useEffect(() => {
    fetchProducts()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: DisplayProduct[] = data.map((p: Record<string, unknown>) => {
            const staticMatch = staticProducts.find((sp) => sp.id === p.id);
            return {
              id: p.id as number,
              slug: p.slug as string,
              name: p.name as string,
              images: (p.images as string[]) || [],
              tag: staticMatch?.tag || null,
              price: p.price as number,
              rating: staticMatch?.rating ?? 4.8,
              reviewCount: staticMatch?.reviewCount ?? 0,
              isFeatured: staticMatch?.isFeatured ?? true,
            };
          });
          setFeatured(mapped.filter((p) => p.isFeatured));
        }
      })
      .catch(() => {});
  }, []);

  return (
    <section ref={ref} className="py-16 md:py-24 px-4 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="flex items-end justify-between mb-10"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-3">{t("bestsellers.subtitle")}</p>
          <h2 className="text-2xl md:text-4xl font-heading font-bold text-white">{t("bestsellers.title")}</h2>
        </div>
        <Link href="/shop" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1">
          {t("bestsellers.cta")}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {featured.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 * i }}
          >
            <Link href={`/product/${product.slug}`} className="group block">
              {/* Image */}
              <div className="relative aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden bg-surface mb-3">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 50vw"
                />
                {product.tag && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 bg-accent text-black text-[10px] font-bold uppercase rounded-lg">
                    {product.tag}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
              </div>

              {/* Info */}
              <div className="px-0.5">
                <h3 className="text-sm md:text-base font-semibold text-white truncate">{product.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center gap-0.5">
                    <Star size={12} className="fill-accent text-accent" />
                    <span className="text-xs text-gray-400">{product.rating}</span>
                  </div>
                  <span className="text-xs text-gray-600">({product.reviewCount})</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm md:text-base font-bold text-white tabular-nums">
                    {product.price.toLocaleString()} DA
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
