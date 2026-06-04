import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/yalidine/communes?wilaya_id=18
 * Returns only deliverable communes for a given wilaya from Yalidine API.
 */
export async function GET(req: NextRequest) {
  try {
    const wilayaId = req.nextUrl.searchParams.get("wilaya_id");
    if (!wilayaId) {
      return NextResponse.json({ error: "wilaya_id is required" }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from("store_settings")
      .select("yalidine_api_id, yalidine_api_token")
      .eq("id", 1)
      .single();

    if (!settings?.yalidine_api_id || !settings?.yalidine_api_token) {
      return NextResponse.json({ error: "Yalidine API not configured" }, { status: 403 });
    }

    const res = await fetch(`https://api.yalidine.app/v1/communes/?wilaya_id=${wilayaId}`, {
      headers: {
        "X-API-ID": settings.yalidine_api_id,
        "X-API-TOKEN": settings.yalidine_api_token
      }
    });

    const data = await res.json();
    const communes = (data?.data || []).map((c: { id: number; name: string; is_deliverable: number; has_stop_desk: number }) => ({
      id: c.id,
      name: c.name,
      is_deliverable: c.is_deliverable === 1,
      has_stop_desk: c.has_stop_desk === 1,
    }));

    return NextResponse.json({ communes });
  } catch (err) {
    console.error("Yalidine communes error:", err);
    return NextResponse.json({ error: "Failed to fetch communes" }, { status: 500 });
  }
}
