"use client";

import { useState, useEffect } from "react";
import ProductShowcase from "@/components/product/ProductShowcase";
import {
  products as defaultProducts,
  noctaProducts,
  linProducts,
  tshirtProducts,
  bmwProducts,
  sacocheProducts,
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
      .then(async ([productRes, settingsRes]) => {
        const data = productRes.data;
        if (data) {
          const currentProduct = {
            id: data.id,
            slug: data.slug,
            name: data.name,
            description: data.description,
            price: data.price,
            bundlePrice: data.bundle_price,
            sizes: data.sizes || ["Taille Unique"],
            stock: data.stock,
            status: data.status,
            images: data.images || [],
            category: data.category,
            colors: data.colors || [],
            tag: data.tag,
            isFeatured: data.is_featured,
            rating: data.rating || 4.9,
            reviewCount: data.review_count || 50,
            dateAdded: data.date_added,
            showcaseType: data.showcase_type || "sacoche",
          };
          setProductData(currentProduct);

          // Try fetching showcase variants from database
          const { data: dbVariants } = await supabase
            .from("showcase_variants")
            .select("*")
            .eq("product_id", data.id)
            .order("sort_order");

          if (dbVariants && dbVariants.length > 0) {
            const built: ShowcaseProduct[] = dbVariants.map((v: Record<string, unknown>) => ({
              id: v.id as number,
              name: (v.name as string) || data.name,
              bg: (v.bg as string) || "#0a0a0a",
              tag: (v.tag as string) || (v.color_name as string) || "Noir",
              swatch: (v.swatch as string) || "#111111",
              desc: (v.description as string) || data.description,
              review: (v.review as string) || "",
              productType: (v.product_type as string) || "sacoche",
              image: (v.image as string) || (data.images && data.images[0]) || "",
              colorName: (v.color_name as string) || "Noir",
            }));
            setDynamicVariants(built);
          } else {
            // Build dynamic variants from DB images so edits are reflected
            const getBaseVariants = (type: string) => {
              if (type === "tshirt") return tshirtProducts;
              if (type === "lin") return linProducts;
              if (type === "bmw") return bmwProducts;
              if (type === "sacoche") return sacocheProducts;
              return noctaProducts;
            };
            const baseVariants = getBaseVariants(currentProduct.showcaseType);

            const dbImages: string[] = data.images || [];
            const dbName: string = data.name || currentProduct.name;
            const dbDesc: string = data.description || currentProduct.description;

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
    productData.showcaseType === "tshirt"
      ? tshirtProducts
      : productData.showcaseType === "bmw"
      ? bmwProducts
      : productData.showcaseType === "sacoche"
      ? sacocheProducts
      : productData.showcaseType === "nocta"
      ? noctaProducts
      : linProducts;
  const variants = dynamicVariants || fallbackVariants;

  return (
    <ProductShowcase
      variants={variants}
      singlePrice={productData.price}
      bundlePrice={productData.bundlePrice}
      sizes={productData.sizes}
      hasColorSelector={
        (productData.showcaseType === "nocta" ||
          productData.showcaseType === "sacoche" ||
          productData.showcaseType === "bmw") &&
        variants.length > 1
      }
      zonePrices={zonePrices}
      showReviews={productData.showcaseType !== "tshirt"}
    />
  );
}
