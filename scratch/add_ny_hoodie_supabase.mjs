import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Upserting Ensemble NY Yankees into Supabase...");

  const productPayload = {
    id: 18,
    slug: "ensemble-ny-yankees-heavy-fleece",
    name: "Ensemble NY Yankees",
    description: "",
    price: 6400,
    bundle_price: 10500,
    images: [
      "/products/ny_brown_2.jpg",
      "/products/ny_brown_4.jpg"
    ],
    category: "ensembles",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [{ name: "Marron Chocolat", hex: "#4a2e1b" }],
    tag: "Heavy Fleece",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 82,
    stock: 50,
    date_added: "2026-10-21",
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
  await supabase.from("showcase_variants").delete().eq("product_id", 18);

  const variantsPayload = [
    {
      product_id: 18,
      name: "Ensemble NY Yankees",
      bg: "#16110e",
      tag: "Marron Chocolat",
      swatch: "#4a2e1b",
      description: "",
      review: '"طقم NY روعة بزاف، القماش سميك ودافي والفينيسيون عالمية، والقصة طوب 🔥" — وليد ب.',
      product_type: "set",
      image: "/products/ny_brown_2.jpg",
      color_name: "Marron Chocolat",
      sort_order: 1
    },
    {
      product_id: 18,
      name: "Ensemble NY Yankees",
      bg: "#16110e",
      tag: "Coupe Unisexe",
      swatch: "#4a2e1b",
      description: "",
      review: '"لبسة شابة بزاف وكوبل طوب، القماش ثقيل والخدمة نقية ما شاء الله" — حسام وريمة',
      product_type: "set",
      image: "/products/ny_brown_4.jpg",
      color_name: "Marron Chocolat",
      sort_order: 2
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
