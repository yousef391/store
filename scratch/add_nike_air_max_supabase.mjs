import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Upserting Nike Air Max product into Supabase...");

  const productPayload = {
    id: 24,
    slug: "nike-air-max-ensemble",
    name: "Ensemble Nike Air Max",
    description: "Ensemble Nike Air Max premium. Hoodie à capuche avec logo géant au dos et pantalon jogger assorti. Tissu molletonné ultra-doux pour un confort optimal.",
    price: 5900,
    bundle_price: 9900,
    images: ["/products/nike_air_max_grey.jpg"],
    category: "ensembles",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Gris", hex: "#9ca3af" }],
    tag: "Swoosh Oversize",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 45,
    date_added: "2026-09-22",
    showcase_type: "nocta"
  };

  const { data: prodData, error: prodErr } = await supabase
    .from("products")
    .upsert([productPayload])
    .select();

  if (prodErr) {
    console.error("Product upsert error:", prodErr);
  } else {
    console.log("Product upserted successfully:", prodData);
  }

  // Delete existing showcase variants if any, then insert new ones
  await supabase.from("showcase_variants").delete().eq("product_id", 24);

  const variantsPayload = [
    {
      product_id: 24,
      name: "Ensemble Nike Air Max",
      bg: "#0a0a0a",
      tag: "Gris",
      swatch: "#9ca3af",
      description: "Ensemble Nike Air Max en coton molletonné d'exception. Hoodie avec logo Swoosh oversize au dos et pantalon assorti avec détails Air Max. Style streetwear ultra-confortable.",
      review: '"طقم نايك خيالي، القماش والفينيسيون بزاف شابين" — وليد ب.',
      product_type: "set",
      image: "/products/nike_air_max_grey.jpg",
      color_name: "Gris",
      sort_order: 1
    }
  ];

  const { data: varData, error: varErr } = await supabase
    .from("showcase_variants")
    .upsert(variantsPayload)
    .select();

  if (varErr) {
    console.error("Variants upsert error:", varErr);
  } else {
    console.log("Variants upserted successfully:", varData);
  }
}

main().catch(console.error);
