import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Upserting Nike NOCTA Zip Hoodie product into Supabase...");

  const productPayload = {
    id: 23,
    slug: "nike-nocta-zip-hoodie-ensemble",
    name: "Ensemble Nike Nocta Zip Hoodie & Pantalon",
    description: "Ensemble Veste Zippée à Capuche & Pantalon Nike NOCTA d'exception. Veste zippée en coton molletonné épais 3 iplik avec piping blanc contrasté signature sur les manches et les jambes. Logos Nike Swoosh & NOCTA brodés. Coupe streetwear moderne et finition haut de gamme.",
    price: 5900,
    bundle_price: 9900,
    images: ["/products/nocta_hoodie_1.jpg"],
    category: "ensembles",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Full Black", hex: "#111111" }],
    tag: "Heavy Fleece Zip",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 86,
    stock: 50,
    date_added: "2026-08-29",
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
  await supabase.from("showcase_variants").delete().eq("product_id", 23);

  const variantsPayload = [
    {
      product_id: 23,
      name: "Ensemble Nike Nocta Zip Hoodie & Pantalon",
      bg: "#050505",
      tag: "Heavy Fleece Zip",
      swatch: "#111111",
      description: "Ensemble Veste Zippée à Capuche & Pantalon Nike NOCTA. Veste zippée en coton molletonné épais avec piping blanc contrasté sur les manches, logos Nike Swoosh et NOCTA. Pantalon à coupe droite avec bandes latérales et finitions premium.",
      review: '"طقم النوكتا الزيب هودي روعة بزاف، القماش سميك ودافئ والفينيسيون عالمية 🔥" — سليم خ.',
      product_type: "set",
      image: "/products/nocta_hoodie_1.jpg",
      color_name: "Full Black",
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
