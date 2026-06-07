"use client";

import { useState, useEffect } from "react";
import ProductShowcase from "@/components/product/ProductShowcase";
import {
  products as defaultProducts,
  noctaProducts,
  linProducts,
  ShowcaseProduct,
} from "@/data/products";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default function ProductPage({ params }: { params: { slug: string } }) {
  const staticProduct = defaultProducts.find((p) => p.slug === params.slug);
  const [productData, setProductData] = useState(staticProduct);
  const [dynamicVariants, setDynamicVariants] = useState<ShowcaseProduct[] | null>(null);
  const [zonePrices, setZonePrices] = useState<Record<number, number> | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch product data + store settings (zone prices) in parallel
    const fetchProduct = supabase
      .from("products")
      .select("*")
      .eq("slug", params.slug)
      .single();

    const fetchSettings = supabase
      .from("store_settings")
      .select("zone_prices")
      .eq("id", 1)
      .single();

    Promise.all([fetchProduct, fetchSettings])
      .then(([productRes, settingsRes]) => {
        const data = productRes.data;
        if (data && staticProduct) {
          setProductData({
            ...staticProduct,
            price: data.price,
            bundlePrice: data.bundle_price,
            sizes: data.sizes,
            stock: data.stock,
            status: data.status,
            images: data.images,
            name: data.name,
            description: data.description,
          });

          // Build dynamic variants from DB images so edits are reflected
          const baseVariants =
            staticProduct.showcaseType === "nocta" ? noctaProducts : linProducts;

          const dbImages: string[] = data.images || [];
          const dbName: string = data.name || staticProduct.name;
          const dbDesc: string = data.description || staticProduct.description;

          if (dbImages.length > 0) {
            const built: ShowcaseProduct[] = dbImages.map((img, idx) => {
              const base = baseVariants[idx] || baseVariants[0];
              return {
                ...base,
                id: base.id + idx * 100,
                name: dbName,
                desc: dbDesc,
                image: img,
              };
            });
            setDynamicVariants(built);
          }
        }

        // Load zone prices from store_settings
        if (settingsRes.data?.zone_prices) {
          setZonePrices(settingsRes.data.zone_prices);
        }

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.slug, staticProduct]);

  // Show loading until Supabase data arrives (prevents flash of old static data)
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!productData) notFound();

  const fallbackVariants =
    productData.showcaseType === "nocta" ? noctaProducts : linProducts;
  const variants = dynamicVariants || fallbackVariants;

  return (
    <ProductShowcase
      variants={variants}
      singlePrice={productData.price}
      bundlePrice={productData.bundlePrice}
      sizes={productData.sizes}
      hasColorSelector={
        productData.showcaseType === "nocta" && variants.length > 1
      }
      zonePrices={zonePrices}
    />
  );
}
