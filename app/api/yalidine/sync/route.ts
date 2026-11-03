import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mapYalidineStatus(rawStatus: string): { status: string; action: string; label: string } {
  const s = (rawStatus || "").trim().toLowerCase();

  if (s.includes("livré") || s.includes("livre") || s.includes("delivered")) {
    return { status: "livre", action: "order_delivered", label: "Livré" };
  }
  if (s.includes("retour") || s.includes("returned")) {
    return { status: "retourne", action: "order_returned", label: "Retourné" };
  }
  if (s.includes("sorti en livraison") || s.includes("en cours de livraison") || s.includes("en livraison")) {
    return { status: "en_livraison", action: "order_shipped", label: "En cours de livraison" };
  }
  if (
    s.includes("echèc") ||
    s.includes("échec") ||
    s.includes("echec") ||
    s.includes("alerte") ||
    s.includes("attente") ||
    s.includes("injoignable") ||
    s.includes("reporté")
  ) {
    return { status: "echoue", action: "order_failed", label: "Échec de livraison" };
  }
  if (
    s.includes("expédié") ||
    s.includes("expedie") ||
    s.includes("ramassé") ||
    s.includes("ramasse") ||
    s.includes("hub") ||
    s.includes("centre") ||
    s.includes("wilaya") ||
    s.includes("transfert")
  ) {
    return { status: "expedie", action: "order_shipped", label: "Expédié" };
  }

  return { status: "expedie", action: "order_shipped", label: rawStatus || "Mise à jour" };
}

// POST /api/yalidine/sync
// Syncs parcel statuses from Yalidine API into Supabase orders
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();

    // 1. Get Yalidine API Credentials from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("yalidine_api_id, yalidine_api_token")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.yalidine_api_id || !settings?.yalidine_api_token) {
      return NextResponse.json(
        { error: "Identifiants API Yalidine non configurés dans les paramètres." },
        { status: 403 }
      );
    }

    // Optional specific trackings from request body
    let targetTrackings: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.trackings)) {
        targetTrackings = body.trackings.filter(Boolean);
      }
    } catch {
      // No body or empty
    }

    // 2. Fetch orders from Supabase that have tracking_id
    let query = supabase
      .from("orders")
      .select("id, order_number, tracking_id, status, name, note")
      .not("tracking_id", "is", null);

    if (targetTrackings.length > 0) {
      query = query.in("tracking_id", targetTrackings);
    }

    const { data: ordersWithTracking, error: fetchErr } = await query;

    if (fetchErr || !ordersWithTracking || ordersWithTracking.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Aucun colis avec numéro de suivi à synchroniser.",
        synced: 0,
        updated: 0,
      });
    }

    // Map by tracking_id for instant O(1) lookup
    const orderMap = new Map<string, (typeof ordersWithTracking)[0]>();
    for (const o of ordersWithTracking) {
      if (o.tracking_id) {
        orderMap.set(o.tracking_id.trim().toLowerCase(), o);
      }
    }

    const allTrackingIds = Array.from(orderMap.keys());
    const batchSize = 25; // Group up to 25 trackings per GET request
    let totalUpdated = 0;
    const summary = { livre: 0, retourne: 0, en_livraison: 0, echoue: 0, expedie: 0 };
    const parcelDetails: Array<{
      tracking: string;
      order_number: number;
      last_status: string;
      date_last_status?: string;
      payment_status?: string;
      price?: number;
      delivery_fee?: number;
    }> = [];

    // 3. Process batches from Yalidine API
    for (let i = 0; i < allTrackingIds.length; i += batchSize) {
      const batch = allTrackingIds.slice(i, i + batchSize);
      const trackingQueryParam = batch.join(",");

      try {
        const yalidineRes = await fetch(
          `https://api.yalidine.app/v1/parcels/?tracking=${trackingQueryParam}`,
          {
            headers: {
              "X-API-ID": settings.yalidine_api_id,
              "X-API-TOKEN": settings.yalidine_api_token,
            },
          }
        );

        if (!yalidineRes.ok) {
          console.warn(`Yalidine batch fetch failed (${yalidineRes.status}):`, await yalidineRes.text());
          continue;
        }

        const yalidineData = await yalidineRes.json();
        const parcels = yalidineData?.data || [];

        for (const p of parcels) {
          const rawTracking = (p.tracking || "").toString().trim().toLowerCase();
          const order = orderMap.get(rawTracking);
          if (!order) continue;

          const rawStatus = (p.last_status || "").toString().trim();
          if (!rawStatus) continue;

          const mapping = mapYalidineStatus(rawStatus);

          parcelDetails.push({
            tracking: p.tracking,
            order_number: order.order_number,
            last_status: rawStatus,
            date_last_status: p.date_last_status,
            payment_status: p.payment_status,
            price: p.price,
            delivery_fee: p.delivery_fee,
          });

          // Only update if status or last_status has changed
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updates: Record<string, any> = {
            status: mapping.status,
            updated_at: new Date().toISOString(),
          };

          if (p.reason) {
            const noteStamp = `[Yalidine: ${rawStatus} - ${p.reason}]`;
            updates.note = order.note ? `${order.note} | ${noteStamp}` : noteStamp;
          }

          let updateRes = await supabase.from("orders").update(updates).eq("id", order.id);

          // Graceful fallback if orders_status_check blocks the new status
          if (
            updateRes.error &&
            (updateRes.error.code === "23514" || updateRes.error.message?.includes("check constraint"))
          ) {
            delete updates.status;
            const fallbackNote = `[Yalidine: ${rawStatus}]`;
            updates.note = order.note ? `${order.note} | ${fallbackNote}` : fallbackNote;
            updateRes = await supabase.from("orders").update(updates).eq("id", order.id);
          }

          if (!updateRes.error) {
            totalUpdated++;
            if (mapping.status in summary) {
              summary[mapping.status as keyof typeof summary]++;
            }
          }
        }
      } catch (batchErr) {
        console.error("Batch sync error:", batchErr);
      }
    }

    return NextResponse.json({
      success: true,
      synced: allTrackingIds.length,
      updated: totalUpdated,
      summary,
      parcels: parcelDetails,
    });
  } catch (err: unknown) {
    console.error("Yalidine Sync Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
