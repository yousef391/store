import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getYalidineAccount, getYalidineAccountsFromSettings } from "@/lib/yalidine";

export const dynamic = 'force-dynamic';

/**
 * GET /api/yalidine/communes?wilaya_id=18&account=1
 * Returns only deliverable communes for a given wilaya from Yalidine API.
 * Automatically tries the active account with fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const wilayaId = req.nextUrl.searchParams.get("wilaya_id");
    const accountParam = req.nextUrl.searchParams.get("account") || "1";

    if (!wilayaId) {
      return NextResponse.json({ error: "wilaya_id is required" }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (!settings) {
      return NextResponse.json({ error: "Yalidine API not configured" }, { status: 403 });
    }

    const primaryAccount = getYalidineAccount(settings, accountParam);
    const allAccounts = getYalidineAccountsFromSettings(settings);

    // List of accounts to try (primary first, then fallback)
    const accountsToTry = [
      primaryAccount,
      ...allAccounts.filter((a) => a.id !== primaryAccount.id),
    ].filter((a) => a.api_id && a.api_token);

    if (accountsToTry.length === 0) {
      return NextResponse.json({ error: "No configured Yalidine account found." }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastData: any = null;
    for (const acc of accountsToTry) {
      try {
        const res = await fetch(`https://api.yalidine.app/v1/communes/?wilaya_id=${wilayaId}`, {
          headers: {
            "X-API-ID": acc.api_id,
            "X-API-TOKEN": acc.api_token,
          },
        });
        if (res.ok) {
          lastData = await res.json();
          if (lastData?.data) break;
        }
      } catch {
        // try next account
      }
    }

    const communes = (lastData?.data || []).map((c: { id: number; name: string; is_deliverable: number; has_stop_desk: number }) => ({
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
