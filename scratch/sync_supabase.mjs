import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Checking products table in Supabase...");

  // 1. Check if product exists in Supabase
  const { data: existingProducts, error: fetchErr } = await supabase
    .from('products')
    .select('*')
    .eq('slug', 'nike-nocta-tshirt-pantalon-ensemble');

  if (fetchErr) {
    console.error("Fetch error:", fetchErr);
    return;
  }

  console.log("Existing products found:", existingProducts);

  const images = [
    "/products/nocta_ensemble_tee.jpg",
    "/products/nocta_ensemble_tee_2.jpg",
    "/products/nocta_ensemble_tee_3.jpg"
  ];

  const productPayload = {
    id: 21,
    slug: "nike-nocta-tshirt-pantalon-ensemble",
    name: "Ensemble Nike Nocta T-Shirt & Pantalon",
    description: "Ensemble T-shirt & Pantalon Nike Nocta. T-shirt col rond à manches courtes et pantalon assortis en coton 100% premium avec piping blanc contrasté signature et logos Nike & NOCTA. Coupe moderne et finition streetwear d'exception.",
    price: 5300,
    bundle_price: 8300,
    images: images,
    category: "ensembles",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Full Black", hex: "#111111" }],
    tag: "Full Black",
    status: "active",
    is_featured: true,
    rating: 4.9,
    review_count: 94,
    stock: 50,
    date_added: "2026-08-25",
    showcase_type: "nocta_tee"
  };

  if (existingProducts && existingProducts.length > 0) {
    console.log("Updating existing product in Supabase...");
    const { data: updateData, error: updateErr } = await supabase
      .from('products')
      .update({
        price: 5300,
        bundle_price: 8300,
        images: images,
        name: "Ensemble Nike Nocta T-Shirt & Pantalon",
        showcase_type: "nocta"
      })
      .eq('slug', 'nike-nocta-tshirt-pantalon-ensemble')
      .select();

    if (updateErr) {
      console.error("Update error:", updateErr);
    } else {
      console.log("Updated product successfully:", updateData);
    }
  } else {
    console.log("Inserting new product into Supabase...");
    const { data: insertData, error: insertErr } = await supabase
      .from('products')
      .upsert([productPayload])
      .select();

    if (insertErr) {
      console.error("Insert error:", insertErr);
    } else {
      console.log("Inserted product successfully:", insertData);
    }
  }

  // 2. Also check/sync showcase_variants table if used
  const { data: showcaseVars, error: showcaseErr } = await supabase
    .from('showcase_variants')
    .select('*')
    .eq('product_id', 21);

  console.log("Showcase variants check:", showcaseVars, showcaseErr);

  if (showcaseVars && showcaseVars.length > 0) {
    console.log("Updating showcase variants in Supabase...");
    // Delete existing variants for product 21 and insert 3 clean variants
    await supabase.from('showcase_variants').delete().eq('product_id', 21);
  }

  const variantsToInsert = [
    {
      product_id: 21,
      name: "Ensemble Nike Nocta T-Shirt & Pantalon",
      bg: "#050505",
      tag: "Full Black",
      swatch: "#111111",
      description: "Ensemble T-Shirt & Pantalon Nike Nocta. T-shirt col rond à manches courtes et pantalon assortis en coton 100% premium avec piping blanc contrasté signature et logos Nike & NOCTA.",
      review: '"طقم النوكتا تيشيرت وسروال روعة، القماش والفينيسيون عالمي 🔥" — أمين ب.',
      product_type: "set",
      image: "/products/nocta_ensemble_tee.jpg",
      color_name: "Full Black",
      sort_order: 1
    },
    {
      product_id: 21,
      name: "Ensemble Nike Nocta T-Shirt & Pantalon",
      bg: "#050505",
      tag: "Full Black",
      swatch: "#111111",
      description: "Vue détails & coupe. T-shirt Dri-FIT oversized et pantalon à coupe droite avec double bandes blanches, cordon de serrage et finitions Nike & NOCTA.",
      review: '"التفاصيل والتنقاس بزاف هايلين، القماش طوب" — سليم خ.',
      product_type: "set",
      image: "/products/nocta_ensemble_tee_2.jpg",
      color_name: "Full Black (Vue 2)",
      sort_order: 2
    },
    {
      product_id: 21,
      name: "Ensemble Nike Nocta T-Shirt & Pantalon",
      bg: "#050505",
      tag: "Full Black",
      swatch: "#111111",
      description: "Vue complète multi-angles. Finitions officielles Nike Dri-FIT & NOCTA avec détails logo brodés sur la manche et les chevilles.",
      review: '"اللبسة تخرج خيالية والجودة فور بزاف" — ياسين م.',
      product_type: "set",
      image: "/products/nocta_ensemble_tee_3.jpg",
      color_name: "Full Black (Vue 3)",
      sort_order: 3
    }
  ];

  const { data: insertedVariants, error: varInsertErr } = await supabase
    .from('showcase_variants')
    .upsert(variantsToInsert)
    .select();

  if (varInsertErr) {
    console.error("Variants insert error (table may not exist or RLS):", varInsertErr);
  } else {
    console.log("Successfully updated showcase_variants in Supabase:", insertedVariants);
  }
}

main().catch(console.error);
