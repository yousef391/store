import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface WebhookEvent {
  tracking?: string;
  tracking_id?: string;
  order_id?: string | number;
  status?: string;
  last_status?: string;
  reason?: string;
  centre?: string;
  wilaya?: string;
  commune?: string;
  timestamp?: string;
  date?: string;
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

export async function OPTIONS() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Yalidine-Signature",
    },
  });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // 1. Verify HMAC Signature if secret is configured
    const providedSignature = request.headers.get("x-yalidine-signature") || request.headers.get("X-Yalidine-Signature");
    const webhookSecret = process.env.YALIDINE_WEBHOOK_SECRET;

    if (webhookSecret && providedSignature) {
      const computed = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (computed.toLowerCase() !== providedSignature.toLowerCase()) {
        console.warn("Invalid Yalidine webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    // 2. Parse payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
    }

    // Extract events
    let eventsList: WebhookEvent[] = [];
    if (Array.isArray(parsed)) {
      eventsList = parsed;
    } else if (parsed && Array.isArray(parsed.events)) {
      eventsList = parsed.events;
    } else if (parsed && Array.isArray(parsed.data)) {
      eventsList = parsed.data;
    } else if (parsed && typeof parsed === "object") {
      if (parsed.data && typeof parsed.data === "object") {
        eventsList = [parsed.data];
      } else {
        eventsList = [parsed];
      }
    }

    if (eventsList.length === 0) {
      return NextResponse.json({ success: true, message: "No events to process" });
    }

    const results: Array<{
      tracking?: string;
      order_id?: string | number;
      success: boolean;
      status?: string;
      message?: string;
    }> = [];

    // 3. Process events
    for (const ev of eventsList) {
      const tracking = (ev.tracking || ev.tracking_id || "").toString().trim();
      const orderRef = (ev.order_id || "").toString().trim();
      const rawStatus = (ev.status || ev.last_status || "").toString().trim();
      const reason = ev.reason ? ev.reason.toString().trim() : "";

      if (!tracking && !orderRef) {
        results.push({ success: false, message: "Missing tracking number and order_id" });
        continue;
      }

      // Find the order
      let orderQuery = supabase.from("orders").select("id, order_number, status, name, note, tracking_id");
      if (tracking) {
        orderQuery = orderQuery.eq("tracking_id", tracking);
      } else if (orderRef) {
        const numRef = parseInt(orderRef, 10);
        if (!isNaN(numRef)) {
          orderQuery = orderQuery.or(`order_number.eq.${numRef},id.eq.${orderRef}`);
        } else {
          orderQuery = orderQuery.eq("id", orderRef);
        }
      }

      const { data: matchedOrders, error: findError } = await orderQuery;

      if (findError || !matchedOrders || matchedOrders.length === 0) {
        console.warn(`Order not found for tracking: ${tracking}, ref: ${orderRef}`);
        results.push({ tracking, order_id: orderRef, success: false, message: "Order not found" });
        continue;
      }

      const order = matchedOrders[0];
      const mapping = mapYalidineStatus(rawStatus);

      // Prepare updates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        status: mapping.status,
        updated_at: new Date().toISOString(),
      };
      if (tracking && !order.tracking_id) {
        updates.tracking_id = tracking;
      }

      if (reason) {
        const noteStamp = `[Yalidine: ${rawStatus} - ${reason}]`;
        updates.note = order.note ? `${order.note} | ${noteStamp}` : noteStamp;
      }

      // Attempt update
      let updateRes = await supabase.from("orders").update(updates).eq("id", order.id).select().single();

      // Graceful fallback if check constraint orders_status_check blocks status
      if (updateRes.error && (updateRes.error.code === "23514" || updateRes.error.message?.includes("check constraint"))) {
        console.warn(`Constraint blocked status '${mapping.status}'. Falling back gracefully.`);
        delete updates.status;
        const fallbackNote = `[Yalidine: ${rawStatus}${reason ? ` - ${reason}` : ""}]`;
        updates.note = order.note ? `${order.note} | ${fallbackNote}` : fallbackNote;
        updateRes = await supabase.from("orders").update(updates).eq("id", order.id).select().single();
      }

      if (updateRes.error) {
        console.error(`Failed to update order ${order.id}:`, updateRes.error);
        results.push({ tracking, order_id: order.order_number, success: false, message: updateRes.error.message });
        continue;
      }

      // Record activity in histories
      try {
        await supabase.from("histories").insert({
          action: mapping.action,
          description: `Commande #${order.order_number} : statut Yalidine mis à jour vers "${rawStatus}" (${order.name})`,
          user: "Yalidine Webhook",
          details: JSON.stringify({
            tracking,
            raw_status: rawStatus,
            mapped_status: mapping.status,
            reason: reason || null,
            order_id: order.id,
          }),
        });
      } catch (histErr) {
        console.warn("Could not insert history record:", histErr);
      }

      results.push({
        tracking,
        order_id: order.order_number,
        success: true,
        status: mapping.status,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err: unknown) {
    console.error("Yalidine Webhook Route Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

