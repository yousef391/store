"use client";

import { useState, useEffect } from "react";
import ProductShowcase from "@/components/product/ProductShowcase";
import {
  products as defaultProducts,
  noctaProducts,
  linProducts,
  tshirtProducts,
  bmwProducts,
  debardeurProducts,
  gtaProducts,
  jordanProducts,
  impossibleProducts,
  cartierProducts,
  sabrProducts,
  martinayProducts,
  alcProducts,
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
            sizes: (data.sizes || staticProduct?.sizes || ["M", "L", "XL"]).filter((s: string) => s !== "XXL"),
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
              if (params.slug === "baskets-alc-streetwear-premium" || type === "alc") return alcProducts;
              if (params.slug === "lunettes-martinay-diamond-cut" || type === "martinay") return martinayProducts;
              if (params.slug === "montre-sabr-edition-luxe" || type === "sabr") return sabrProducts;
              if (params.slug === "lunettes-cartier-diamond-cut" || type === "cartier") return cartierProducts;
              if (params.slug === "tshirt-oversize-impossible-is-nothing" || type === "impossible") return impossibleProducts;
              if (params.slug === "tshirt-oversize-jordan-minimalist" || type === "jordan") return jordanProducts;
              if (params.slug === "tshirt-oversize-san-andreas" || type === "gta") return gtaProducts;
              if (type === "debardeur" || params.slug === "debardeur-nike-dri-fit") return debardeurProducts;
              if (type === "tshirt") return tshirtProducts;
              if (type === "lin") return linProducts;
              if (type === "bmw") return bmwProducts;
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
    params.slug === "baskets-alc-streetwear-premium" || productData.showcaseType === "alc"
      ? alcProducts
      : params.slug === "lunettes-martinay-diamond-cut" || productData.showcaseType === "martinay"
      ? martinayProducts
      : params.slug === "montre-sabr-edition-luxe" || productData.showcaseType === "sabr"
      ? sabrProducts
      : params.slug === "lunettes-cartier-diamond-cut" || productData.showcaseType === "cartier"
      ? cartierProducts
      : params.slug === "tshirt-oversize-impossible-is-nothing" || productData.showcaseType === "impossible"
      ? impossibleProducts
      : params.slug === "tshirt-oversize-jordan-minimalist" || productData.showcaseType === "jordan"
      ? jordanProducts
      : params.slug === "tshirt-oversize-san-andreas" || productData.showcaseType === "gta"
      ? gtaProducts
      : params.slug === "debardeur-nike-dri-fit" || productData.showcaseType === "debardeur"
      ? debardeurProducts
      : productData.showcaseType === "tshirt"
      ? tshirtProducts
      : productData.showcaseType === "bmw"
      ? bmwProducts
      : productData.showcaseType === "nocta"
      ? noctaProducts
      : linProducts;
  const variants = dynamicVariants || fallbackVariants;

  const isSabr = params.slug === "montre-sabr-edition-luxe" || productData.showcaseType === "sabr";
  const isCartier = params.slug === "lunettes-cartier-diamond-cut" || productData.showcaseType === "cartier";
  const isMartinay = params.slug === "lunettes-martinay-diamond-cut" || productData.showcaseType === "martinay";
  const hideColorSelector = isSabr || isCartier || isMartinay;

  return (
    <ProductShowcase
      variants={variants}
      singlePrice={productData.price}
      bundlePrice={productData.bundlePrice}
      triplePrice={productData.triplePrice}
      sizes={productData.sizes}
      hasColorSelector={hideColorSelector ? false : variants.length > 1}
      hasSizeSelector={!isSabr && !isCartier && !isMartinay && productData.category !== "accessoires" && productData.category !== "accessories" && productData.category !== "lunettes" && productData.category !== "montres"}
      zonePrices={zonePrices}
      showReviews={true}
      productId={productData.id}
      productSlug={productData.slug}
      productName={productData.name}
      productCategory={productData.category}
    />
  );
}

