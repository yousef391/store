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

// ── GET: Handles Yalidine CRC Token Handshake & Healthcheck ──
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const crcToken = searchParams.get("crc_token");

    // Yalidine validation test requires returning the crc_token as plain text with 200 OK
    if (crcToken) {
      return new Response(crcToken, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("ok", {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Yalidine Webhook GET Error:", err);
    return new Response("ok", { status: 200 });
  }
}

// ── OPTIONS: Preflight CORS ──
export async function OPTIONS() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Yalidine-Signature",
    },
  });
}

// ── POST: Handles live events & CRC token validation via POST ──
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const queryCrc = url.searchParams.get("crc_token");
    if (queryCrc) {
      return new Response(queryCrc, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const rawBody = await request.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // If plain text body was sent as crc_token
      return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
    }

    // If body contains crc_token
    if (parsed && parsed.crc_token) {
      return new Response(String(parsed.crc_token), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const supabase = getAdminClient();

    // Verify HMAC Signature if secret is configured and header provided
    const providedSignature = request.headers.get("x-yalidine-signature") || request.headers.get("X-Yalidine-Signature");
    const webhookSecret = process.env.YALIDINE_WEBHOOK_SECRET;

    if (webhookSecret && providedSignature) {
      const computed = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      if (computed.toLowerCase() !== providedSignature.toLowerCase()) {
        console.warn("Invalid Yalidine webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
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

    // Process events
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
