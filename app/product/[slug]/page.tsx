"use client";

import { useState, useEffect } from "react";
import ProductShowcase from "@/components/product/ProductShowcase";
import {
  products as defaultProducts,
  noctaProducts,
  noctaTeeEnsembleProducts,
  noctaSweatProducts,
  poloProducts,
  nyProducts,
  nikeJoggerProducts,
  adidasSnapProducts,
  bmwProducts,
  debardeurProducts,
  jordanProducts,
  jordanParisProducts,
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
            bundlePrice: data.slug === "debardeur-nike-dri-fit" && data.bundle_price === 4500 ? 3100 : (data.bundle_price || staticProduct?.bundlePrice || 3100),
            triplePrice: data.triple_price || staticProduct?.triplePrice || (data.slug === "debardeur-nike-dri-fit" ? 4500 : undefined),
            sizes: (data.sizes || staticProduct?.sizes || ["S", "M", "L", "XL"]).filter((s: string) => s !== "XXL"),
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
            showcaseType: data.showcase_type || "nocta",
          };
          setProductData(currentProduct);

          // Try fetching showcase variants from database
          const { data: dbVariants } = await supabase
            .from("showcase_variants")
            .select("*")
            .eq("product_id", data.id)
            .order("sort_order");

          const dbImagesList: string[] = data.images || [];
          if (dbVariants && dbVariants.length >= dbImagesList.length && dbVariants.length > 0) {
            const built: ShowcaseProduct[] = dbVariants.map((v: Record<string, unknown>) => ({
              id: v.id as number,
              name: (v.name as string) || data.name,
              bg: (v.bg as string) || "#0a0a0a",
              tag: (v.tag as string) || (v.color_name as string) || "Noir",
              swatch: (v.swatch as string) || "#111111",
              desc: (v.description as string) || data.description,
              review: (v.review as string) || "",
              productType: (v.product_type as string) || "set",
              image: (v.image as string) || (data.images && data.images[0]) || "",
              colorName: (v.color_name as string) || "Noir",
            }));
            setDynamicVariants(built);
          } else {
            // Build dynamic variants from DB images so edits are reflected
            const getBaseVariants = (type: string) => {
              if (params.slug === "pantalon-track-adidas-3-stripes-snap" || type === "adidas_snap") return adidasSnapProducts;
              if (params.slug === "pantalon-jogger-nike-straight-leg" || type === "nike_jogger") return nikeJoggerProducts;
              if (params.slug === "ensemble-ny-yankees-heavy-fleece" || type === "ny") return nyProducts;
              if (params.slug === "pull-polo-jordan-paris-jacquard" || type === "jordan_paris") return jordanParisProducts;
              if (params.slug === "ensemble-polo-ralph-lauren-premium" || type === "polo") return poloProducts;
              if (params.slug === "nike-nocta-sweatshirt-ensemble" || type === "nocta_sweat") return noctaSweatProducts;
              if (params.slug === "nike-nocta-tshirt-pantalon-ensemble" || type === "nocta_tee") return noctaTeeEnsembleProducts;
              if (params.slug === "tshirt-oversize-jordan-minimalist" || type === "jordan") return jordanProducts;
              if (type === "debardeur" || params.slug === "debardeur-nike-dri-fit") return debardeurProducts;
              if (type === "bmw" || params.slug === "bmw-motorsport-ensemble") return bmwProducts;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  // Show loading until Supabase data arrives
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!productData) notFound();

  const fallbackVariants =
    params.slug === "pantalon-track-adidas-3-stripes-snap" || productData.showcaseType === "adidas_snap"
      ? adidasSnapProducts
      : params.slug === "pantalon-jogger-nike-straight-leg" || productData.showcaseType === "nike_jogger"
      ? nikeJoggerProducts
      : params.slug === "ensemble-ny-yankees-heavy-fleece" || productData.showcaseType === "ny"
      ? nyProducts
      : params.slug === "pull-polo-jordan-paris-jacquard" || productData.showcaseType === "jordan_paris"
      ? jordanParisProducts
      : params.slug === "ensemble-polo-ralph-lauren-premium" || productData.showcaseType === "polo"
      ? poloProducts
      : params.slug === "nike-nocta-sweatshirt-ensemble" || productData.showcaseType === "nocta_sweat"
      ? noctaSweatProducts
      : params.slug === "nike-nocta-tshirt-pantalon-ensemble" || productData.showcaseType === "nocta_tee"
      ? noctaTeeEnsembleProducts
      : params.slug === "tshirt-oversize-jordan-minimalist" || productData.showcaseType === "jordan"
      ? jordanProducts
      : params.slug === "debardeur-nike-dri-fit" || productData.showcaseType === "debardeur"
      ? debardeurProducts
      : productData.showcaseType === "bmw"
      ? bmwProducts
      : noctaProducts;
  const variants = dynamicVariants || fallbackVariants;

  return (
    <ProductShowcase
      variants={variants}
      singlePrice={productData.price}
      bundlePrice={productData.bundlePrice}
      triplePrice={productData.triplePrice}
      sizes={productData.sizes}
      hasColorSelector={variants.length > 1}
      hasSizeSelector={true}
      zonePrices={zonePrices}
      showReviews={true}
      productId={productData.id}
      productSlug={productData.slug}
      productName={productData.name}
      productCategory={productData.category}
    />
  );
}
