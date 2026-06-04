import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from("store_settings")
      .select("admin_password")
      .eq("id", 1)
      .single();

    if (!settings?.admin_password) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    if (password === settings.admin_password) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
  } catch (err) {
    console.error("[auth] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
