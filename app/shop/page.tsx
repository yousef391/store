"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Star, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { products as staticProducts } from "@/data/products";
import { fetchProducts } from "@/lib/api";
import { useI18n } from "@/hooks/useI18n";

type SortOption = "featured" | "price-asc" | "price-desc" | "newest" | "rating";

interface ShopProduct {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  bundlePrice: number;
  images: string[];
  category: string;
  tag: string | null;
  status: string;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
  dateAdded: string;
}

export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [productList, setProductList] = useState<ShopProduct[]>(
    staticProducts.map((p) => ({ ...p }))
  );
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  // Fetch products from Supabase (overrides static data)
  useEffect(() => {
    fetchProducts()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped: ShopProduct[] = data.map((p: Record<string, unknown>) => {
            // Find matching static product for fields not in DB
            const staticMatch = staticProducts.find((sp) => sp.id === p.id);
            return {
              id: p.id as number,
              slug: p.slug as string,
              name: p.name as string,
              description: p.description as string,
              price: p.price as number,
              bundlePrice: (p.bundle_price as number) || 0,
              images: (p.images as string[]) || [],
              category: (p.category as string) || "",
              tag: (p.tag as string) || staticMatch?.tag || null,
              status: (p.status as string) || "active",
              isFeatured: p.is_featured != null ? (p.is_featured as boolean) : (staticMatch?.isFeatured ?? true),
              rating: (p.rating as number) ?? staticMatch?.rating ?? 4.8,
              reviewCount: (p.review_count as number) ?? staticMatch?.reviewCount ?? 0,
              stock: (p.stock as number) || 0,
              dateAdded: (p.date_added as string) || staticMatch?.dateAdded || "2025-01-01",
            };
          });
          setProductList(mapped);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = productList.filter((p) => p.status !== "draft");

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => a.price - b.price); break;
      case "price-desc": result.sort((a, b) => b.price - a.price); break;
      case "newest": result.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()); break;
      case "rating": result.sort((a, b) => b.rating - a.rating); break;
      case "featured": result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0)); break;
    }

    return result;
  }, [search, sortBy, productList]);

  return (
    <>
      <Navbar />
      <main className="pt-20 md:pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-heading font-bold text-white mb-3"
            >
              {t("shop.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-400 text-sm md:text-base"
            >
              {filtered.length} {t("shop.products")}
            </motion.p>
          </div>

          {/* Filters Bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-8"
          >
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("shop.search")}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", paddingRight: "30px" }}
            >
              <option value="featured">{t("shop.featured")}</option>
              <option value="newest">{t("shop.newest")}</option>
              <option value="price-asc">{t("shop.price_asc")}</option>
              <option value="price-desc">{t("shop.price_desc")}</option>
              <option value="rating">{t("shop.rating")}</option>
            </select>
          </motion.div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <Search size={24} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{t("shop.no_results")}</h3>
              <p className="text-sm text-gray-500">{t("shop.no_results_desc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:gap-6">
              {filtered.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(0.05 * i, 0.4) }}
                >
                  <Link href={`/product/${product.slug}`} className="group block">
                    <div className="relative aspect-[3/4] rounded-xl md:rounded-2xl overflow-hidden bg-surface mb-3">
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 50vw"
                      />
                      {product.tag && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-1 bg-accent text-black text-[10px] font-bold uppercase rounded-lg">
                          {product.tag}
                        </span>
                      )}
                      {product.status === "out_of_stock" && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-xs font-bold text-white uppercase bg-black/80 px-3 py-1.5 rounded-lg">{t("shop.sold_out")}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-300" />
                    </div>

                    <div className="px-0.5">
                      <h3 className="text-sm md:text-base font-semibold text-white truncate">{product.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Star size={11} className="fill-accent text-accent" />
                        <span className="text-[11px] text-gray-400">{product.rating}</span>
                        <span className="text-[11px] text-gray-600">({product.reviewCount})</span>
                      </div>
                      <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-sm md:text-base font-bold text-white tabular-nums">
                          {product.price.toLocaleString()} DA
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
