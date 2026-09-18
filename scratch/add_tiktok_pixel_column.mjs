import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vlaaxmwvernmgwjhpuwn.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Step 1: Store the TikTok Pixel ID in store_settings (using the existing row)
// Since we can't ALTER TABLE via the anon key, we'll just update the row
// and add the tiktok_pixel_id as a field. If the column doesn't exist yet,
// we need to add it via the Supabase dashboard.

// First, let's check what columns exist
const { data, error } = await supabase
  .from("store_settings")
  .select("*")
  .eq("id", 1)
  .single();

if (error) {
  console.error("Error fetching store_settings:", error);
} else {
  console.log("Current store_settings columns:", Object.keys(data));
  console.log("Full data:", JSON.stringify(data, null, 2));
}

// Try to update with tiktok_pixel_id
const { data: updated, error: updateError } = await supabase
  .from("store_settings")
  .update({ tiktok_pixel_id: "DAMM91JC77UEIIELKTF0" })
  .eq("id", 1)
  .select()
  .single();

if (updateError) {
  console.error("Update error (column may not exist yet):", updateError.message);
  console.log("\n⚠️  You need to add the 'tiktok_pixel_id' column to the store_settings table.");
  console.log("Go to Supabase Dashboard > Table Editor > store_settings > Add Column:");
  console.log("  - Name: tiktok_pixel_id");
  console.log("  - Type: text");
  console.log("  - Default: null");
} else {
  console.log("\n✅ Successfully stored TikTok Pixel ID:", updated.tiktok_pixel_id);
}
