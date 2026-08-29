import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Upserting Chinese Jacket product into Supabase...");

  const productPayload = {
    id: 22,
    slug: "chinese-jacket",
    name: "Veste Chinese Style",
    description: "Veste Track Chinese Style d'exception. سلعة مستوردة ذات جودة عالية جداً (Importation High Quality - مشي كما السلعة اللوكال). تتميز بأزرار عُقد صينية تقليدية باللون الأبيض، 3 أشرطة جانبية، وسحاب متين وقماش راقي وعالي الجودة.",
    price: 8900,
    bundle_price: 15900,
    images: ["/products/chinese_jacket_1.jpg", "/products/chinese_jacket_2.jpg"],
    category: "ensembles",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Full Black", hex: "#111111" }],
    tag: "Importation High Quality",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 88,
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
  await supabase.from("showcase_variants").delete().eq("product_id", 22);

  const variantsPayload = [
    {
      product_id: 22,
      name: "Veste Chinese Style",
      bg: "#0a0a0a",
      tag: "Importation High Quality",
      swatch: "#111111",
      description: "سلعة مستوردة ذات جودة عالية جداً (Importation High Quality - مشي كما السلعة اللوكال). خامة ممتازة وأزرار عُقد صينية تقليدية باللون الأبيض مع سحاب متين وقماش راقي.",
      review: '"سلعة مستوردة جودة خيالية والفينيسيون طوب روعة، مشي كيمـا اللوكال 🔥" — كريم ر.',
      product_type: "set",
      image: "/products/chinese_jacket_1.jpg",
      color_name: "Full Black",
      sort_order: 1
    },
    {
      product_id: 22,
      name: "Veste Chinese Style",
      bg: "#0a0a0a",
      tag: "Détails Finition",
      swatch: "#111111",
      description: "تفاصيل العقد الصينية المتقنة والسحاب. خياطة وتنقاس عالي الجودة ومستورد 100%.",
      review: '"العقد الصينية وقماش السلعة المستوردة بزاف فور ما تندمش عليها" — أمين ب.',
      product_type: "set",
      image: "/products/chinese_jacket_2.jpg",
      color_name: "Full Black (Détails)",
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
