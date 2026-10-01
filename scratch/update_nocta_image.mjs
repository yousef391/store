import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Updating image in Supabase...");

  const { data: prodData, error: prodErr } = await supabase
    .from("products")
    .update({ images: ["/products/nocta_hoodie_new.jpg", "/products/nocta_hoodie_grey.jpg"] })
    .eq("id", 23)
    .select();

  if (prodErr) {
    console.error("Product update error:", prodErr);
  } else {
    console.log("Product updated successfully:", prodData);
  }

  const { data: varData, error: varErr } = await supabase
    .from("showcase_variants")
    .update({ image: "/products/nocta_hoodie_new.jpg" })
    .eq("product_id", 23)
    .eq("color_name", "Noir")
    .select();

  if (varErr) {
    console.error("Variants update error:", varErr);
  } else {
    console.log("Variants updated successfully:", varData);
  }
}

main().catch(console.error);
