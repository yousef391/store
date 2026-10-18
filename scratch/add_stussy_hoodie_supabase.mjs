import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Upserting Stüssy Hoodie product into Supabase...");

  const productPayload = {
    id: 25,
    slug: "ensemble-stussy-hoodie",
    name: "Ensemble Stüssy",
    description: "طقم ستوسي فخم هودي وبنطلون (Ensemble Stüssy Hoodie & Pantalon) بقماش كوتون ملتون 3 iplik سميك ودافئ عالي الجودة مع تطريز رسمي لشعار Stüssy وأربطة بيضاء كونتراست. قصة أوفر سايز عصرية توفر لك الأناقة والراحة المطلقة 🔥",
    price: 5900,
    bundle_price: 9900,
    images: [
      "/products/stussy_brown_2.jpg",
      "/products/stussy_brown_1.png",
      "/products/stussy_brown_3.png"
    ],
    category: "ensembles",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [{ name: "Marron Chocolat", hex: "#4a2e1b" }],
    tag: "Heavy Fleece",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 78,
    stock: 50,
    date_added: "2026-10-18",
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
  await supabase.from("showcase_variants").delete().eq("product_id", 25);

  const variantsPayload = [
    {
      product_id: 25,
      name: "Ensemble Stüssy",
      bg: "#16110e",
      tag: "Marron Chocolat",
      swatch: "#4a2e1b",
      description: "طقم ستوسي فخم هودي وبنطلون (Ensemble Stüssy Hoodie & Pantalon) بقماش كوتون ملتون 3 iplik سميك ودافئ عالي الجودة مع تطريز رسمي لشعار Stüssy وأربطة بيضاء كونتراست. قصة أوفر سايز عصرية توفر لك الأناقة والراحة المطلقة 🔥",
      review: '"طقم ستوسي روعة بزاف، القماش سميك ودافي والفينيسيون عالمية، والقصة طوب 🔥" — وليد ب.',
      product_type: "set",
      image: "/products/stussy_brown_2.jpg",
      color_name: "Marron Chocolat",
      sort_order: 1
    },
    {
      product_id: 25,
      name: "Ensemble Stüssy",
      bg: "#16110e",
      tag: "Vue Détails",
      swatch: "#4a2e1b",
      description: "تفاصيل متقونة وقماش ملتون ممتاز يوفر الدفء والأناقة في نفس الوقت. هودي مع جيب كانغورو واسع وأربطة بيضاء متباينة، وبنطلون بأساور مرنة مريحة.",
      review: '"اللبسة تخرج خيالية والجودة فور بزااف، كوتون 100% نقي وسيرفيت متقونة 🔥" — سليم خ.',
      product_type: "set",
      image: "/products/stussy_brown_1.png",
      color_name: "Marron Chocolat",
      sort_order: 2
    },
    {
      product_id: 25,
      name: "Ensemble Stüssy",
      bg: "#16110e",
      tag: "Vue Complète",
      swatch: "#4a2e1b",
      description: "إطلالة كاملة متناسقة تناسب جميع الخرجات اليومية والأوقات الباردة. مظهر ستريتوير فخم يتماشى تماماً مع السنيكرز الأبيض.",
      review: '"وصلني في 48 ساعة، القيس مضبوط والسلعة كيما في التصاور تماماً 🔥" — ياسين م.',
      product_type: "set",
      image: "/products/stussy_brown_3.png",
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
