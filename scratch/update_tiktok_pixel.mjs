import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vlaaxmwvernmgwjhpuwn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYWF4bXd2ZXJubWd3amhwdXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTQ0MzQsImV4cCI6MjA5NTI3MDQzNH0.3rmeZ-x06s8Vr8uyXAmUY51dBXfj0lAOoN6B2ndIXmk"
);

const { data, error } = await supabase
  .from("store_settings")
  .update({ tiktok_pixel_id: "DAMM91JC77UEIIELKTF0" })
  .eq("id", 1)
  .select("tiktok_pixel_id")
  .single();

if (error) console.error("Error:", error.message);
else console.log("✅ TikTok Pixel ID reverted to:", data.tiktok_pixel_id);
