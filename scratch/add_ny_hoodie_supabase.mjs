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
    description: "طقم نيويورك يانكيز فخم هودي زيب وبنطلون (Ensemble NY Yankees Hoodie Zip & Pantalon) بقماش كوتون ملتون 3 iplik سميك ودافئ عالي الجودة مع تطريز رسمي بارز لشعار NY وأربطة بيضاء كونتراست وسحاب متين. قصة أوفر سايز عصرية توفر لك الأناقة والراحة المطلقة 🔥",
    price: 6400,
    bundle_price: 10500,
    images: [
      "/products/ny_brown_1.jpg",
      "/products/ny_brown_2.jpg",
      "/products/ny_brown_3.jpg"
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
      description: "طقم نيويورك يانكيز فخم هودي زيب وبنطلون (Ensemble NY Yankees Hoodie Zip & Jogger) بقماش كوتون ملتون 3 iplik سميك ودافئ عالي الجودة مع تطريز رسمي بارز لشعار NY. قصة أوفر سايز عصرية توفر لك الأناقة والراحة المطلقة 🔥",
      review: '"طقم NY روعة بزاف، القماش سميك ودافي والفينيسيون عالمية، والقصة طوب 🔥" — وليد ب.',
      product_type: "set",
      image: "/products/ny_brown_1.jpg",
      color_name: "Marron Chocolat",
      sort_order: 1
    },
    {
      product_id: 18,
      name: "Ensemble NY Yankees",
      bg: "#16110e",
      tag: "Vue Complète",
      swatch: "#4a2e1b",
      description: "إطلالة كاملة متناسقة لجميع الزوايا (Full Lookbook). هودي زيب بسحاب معدني متين وبنطلون وايد ليغ مع تفاصيل تطريز NY متقونة وفينيسيون ممتازة.",
      review: '"وصلني في 48 ساعة، القيس مضبوط والسلعة كيما في التصاور تماماً 🔥" — أمين ب.',
      product_type: "set",
      image: "/products/ny_brown_2.jpg",
      color_name: "Marron Chocolat",
      sort_order: 2
    },
    {
      product_id: 18,
      name: "Ensemble NY Yankees",
      bg: "#16110e",
      tag: "Vue Détails",
      swatch: "#4a2e1b",
      description: "تفاصيل متقونة وتطريز بارز عالي الجودة لشعار NY على الصدر والذراع والبنطلون، مع قماش 3 iplik ثقيل وفرو ناعم من الداخل يمنحك الدفء في أبرد الأيام.",
      review: '"التفاصيل والتطريز بزاف هايلين، القماش كوتون 100% نقي وسيرفيت متقونة 🔥" — سليم خ.',
      product_type: "set",
      image: "/products/ny_brown_3.jpg",
      color_name: "Marron Chocolat",
      sort_order: 3
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
