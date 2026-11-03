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

  // 1. "Prêt pour livreur" / Sorti en livraison -> En cours de livraison (NOT livré!)
  if (
    s.includes("livreur") ||
    s.includes("sorti en livraison") ||
    s.includes("en cours de livraison") ||
    s.includes("en livraison")
  ) {
    return { status: "en_livraison", action: "order_shipped", label: "En cours de livraison" };
  }

  // 2. Echèc livraison and all return stages are counted as Retour
  if (
    s.includes("retour") ||
    s.includes("returned") ||
    s.includes("echèc") ||
    s.includes("échec") ||
    s.includes("echec") ||
    s.includes("abandonné") ||
    s.includes("abandonne")
  ) {
    return { status: "retourne", action: "order_returned", label: "Retourné" };
  }

  // 3. Truly Delivered ("Livré", "Livré payé", "Livré non payé")
  if (
    s === "livré" ||
    s === "livre" ||
    s.startsWith("livré") ||
    s.startsWith("livre ") ||
    s.includes("livré payé") ||
    s.includes("livré non payé") ||
    s.includes("delivered")
  ) {
    return { status: "livre", action: "order_delivered", label: "Livré" };
  }

  // 4. Temporary issues / Pending
  if (
    s.includes("tentative") ||
    s.includes("alerte") ||
    s.includes("attente") ||
    s.includes("injoignable") ||
    s.includes("reporté")
  ) {
    return { status: "echoue", action: "order_failed", label: "Tentative / En attente" };
  }

  // 5. In transit
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
// Supports date range (date_creation or date_last_status) or specific tracking IDs
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

    // 2. Parse request parameters
    let startDate = "";
    let endDate = "";
    let dateType: "date_creation" | "date_last_status" = "date_creation";
    let targetTrackings: string[] = [];

    try {
      const body = await request.json();
      if (body?.startDate) startDate = String(body.startDate).trim();
      if (body?.endDate) endDate = String(body.endDate).trim();
      if (body?.dateType === "date_last_status") dateType = "date_last_status";
      if (Array.isArray(body?.trackings)) {
        targetTrackings = body.trackings.filter(Boolean);
      }
    } catch {
      // Empty or no JSON body
    }

    // Default to last 30 days if no date range or trackings provided
    if (!startDate && targetTrackings.length === 0) {
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now.toISOString().split("T")[0];
      startDate = past.toISOString().split("T")[0];
    } else if (startDate && !endDate) {
      endDate = startDate;
    }

    // 3. Fetch orders from Supabase for local matching
    const { data: existingOrders } = await supabase
      .from("orders")
      .select("id, order_number, tracking_id, status, name, note");

    interface ExistingOrder {
      id: string;
      order_number: number;
      tracking_id?: string | null;
      status: string;
      name?: string | null;
      note?: string | null;
    }

    const ordersByTracking = new Map<string, ExistingOrder>();
    const ordersByNumber = new Map<number, ExistingOrder>();
    const ordersById = new Map<string, ExistingOrder>();

    if (existingOrders) {
      for (const o of existingOrders) {
        if (o.tracking_id) ordersByTracking.set(o.tracking_id.trim().toLowerCase(), o);
        if (o.order_number) ordersByNumber.set(o.order_number, o);
        if (o.id) ordersById.set(o.id.toString(), o);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allParcels: any[] = [];
    let updatedCount = 0;
    const summary = { livre: 0, retourne: 0, en_livraison: 0, echoue: 0, expedie: 0 };

    // Helper to call Yalidine
    const fetchYalidine = async (endpointUrl: string) => {
      const res = await fetch(endpointUrl, {
        headers: {
          "X-API-ID": settings.yalidine_api_id,
          "X-API-TOKEN": settings.yalidine_api_token,
        },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Yalidine API error (${res.status}): ${errorText}`);
      }
      return res.json();
    };

    // 4. Case A: Query by Date Range
    if (startDate && endDate) {
      const dateParamValue = startDate === endDate ? startDate : `${startDate},${endDate}`;
      let page = 1;
      let hasMore = true;
      const maxPages = 5; // Safely fetch up to 500 parcels per sync

      while (hasMore && page <= maxPages) {
        const url = `https://api.yalidine.app/v1/parcels/?${dateType}=${dateParamValue}&page_size=100&page=${page}`;
        const data = await fetchYalidine(url);
        const parcels = data?.data || [];
        allParcels.push(...parcels);

        hasMore = Boolean(data?.has_more && parcels.length > 0);
        page++;
      }
    }
    // Case B: Query by Trackings list
    else if (targetTrackings.length > 0) {
      const batchSize = 25;
      for (let i = 0; i < targetTrackings.length; i += batchSize) {
        const batch = targetTrackings.slice(i, i + batchSize);
        const url = `https://api.yalidine.app/v1/parcels/?tracking=${batch.join(",")}`;
        try {
          const data = await fetchYalidine(url);
          const parcels = data?.data || [];
          allParcels.push(...parcels);
        } catch (err) {
          console.error("Batch tracking error:", err);
        }
      }
    }

    // 5. Match and Update Supabase Orders
    for (const p of allParcels) {
      const rawTracking = (p.tracking || "").toString().trim();
      const rawOrderId = (p.order_id || "").toString().trim();
      const rawStatus = (p.last_status || "").toString().trim();

      if (!rawStatus) continue;

      const mapping = mapYalidineStatus(rawStatus);

      // Try matching by tracking_id, order_number, or UUID id
      let matchedOrder = rawTracking ? ordersByTracking.get(rawTracking.toLowerCase()) : null;

      if (!matchedOrder && rawOrderId) {
        // Try parsed number (e.g. "166" or "#166")
        const cleanNum = parseInt(rawOrderId.replace(/[^\d]/g, ""), 10);
        if (!isNaN(cleanNum) && ordersByNumber.has(cleanNum)) {
          matchedOrder = ordersByNumber.get(cleanNum);
        } else if (ordersById.has(rawOrderId)) {
          matchedOrder = ordersById.get(rawOrderId);
        }
      }

      if (mapping.status in summary) {
        summary[mapping.status as keyof typeof summary]++;
      }

      if (matchedOrder) {
        // Prepare updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: Record<string, any> = {
          status: mapping.status,
          updated_at: new Date().toISOString(),
        };

        if (rawTracking && !matchedOrder.tracking_id) {
          updates.tracking_id = rawTracking;
        }

        if (p.reason) {
          const noteStamp = `[Yalidine: ${rawStatus} - ${p.reason}]`;
          updates.note = matchedOrder.note ? `${matchedOrder.note} | ${noteStamp}` : noteStamp;
        }

        let updateRes = await supabase.from("orders").update(updates).eq("id", matchedOrder.id);

        // Graceful fallback if check constraint orders_status_check blocks status
        if (
          updateRes.error &&
          (updateRes.error.code === "23514" || updateRes.error.message?.includes("check constraint"))
        ) {
          delete updates.status;
          const fallbackNote = `[Yalidine: ${rawStatus}${p.reason ? ` - ${p.reason}` : ""}]`;
          updates.note = matchedOrder.note ? `${matchedOrder.note} | ${fallbackNote}` : fallbackNote;
          updateRes = await supabase.from("orders").update(updates).eq("id", matchedOrder.id);
        }

        if (!updateRes.error) {
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalParcelsFound: allParcels.length,
      updatedOrdersCount: updatedCount,
      dateRange: startDate && endDate ? { startDate, endDate, dateType } : null,
      summary,
      parcels: allParcels.map((p) => ({
        tracking: p.tracking,
        order_id: p.order_id,
        firstname: p.firstname,
        familyname: p.familyname,
        contact_phone: p.contact_phone,
        to_wilaya_name: p.to_wilaya_name,
        to_commune_name: p.to_commune_name,
        product_list: p.product_list,
        price: p.price,
        delivery_fee: p.delivery_fee,
        last_status: p.last_status,
        date_last_status: p.date_last_status,
        date_creation: p.date_creation,
        payment_status: p.payment_status,
        label: p.label,
        reason: p.reason || null,
      })),
    });
  } catch (err: unknown) {
    console.error("Yalidine Date Sync Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
