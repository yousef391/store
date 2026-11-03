import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-yalidine-signature",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

async function verifyHmacSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computedSignature.toLowerCase() === signature.toLowerCase();
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Handle GET (Yalidine CRC Token Handshake & Healthcheck)
  const url = new URL(req.url);
  const queryCrc = url.searchParams.get("crc_token");

  if (req.method === "GET") {
    if (queryCrc) {
      return new Response(queryCrc, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }
    return new Response("ok", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // 3. Handle POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use GET or POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (queryCrc) {
      return new Response(queryCrc, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return new Response("ok", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return new Response("ok", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // If body contains crc_token
    if (parsed && parsed.crc_token) {
      return new Response(String(parsed.crc_token), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Supabase Client Setup
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Secret Verification (optional if webhook secret configured in Yalidine)
    const webhookSecret = Deno.env.get("YALIDINE_WEBHOOK_SECRET");
    const providedSignature = req.headers.get("x-yalidine-signature");

    if (webhookSecret && providedSignature) {
      const isValid = await verifyHmacSignature(rawBody, providedSignature, webhookSecret);
      if (!isValid) {
        console.warn("Invalid Yalidine HMAC signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract list of events
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
      return new Response(JSON.stringify({ success: true, message: "No events to process" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ tracking?: string; order_id?: string | number; success: boolean; status?: string; message?: string }> = [];

    // Process Each Event
    for (const ev of eventsList) {
      const tracking = (ev.tracking || ev.tracking_id || "").toString().trim();
      const orderRef = (ev.order_id || "").toString().trim();
      const rawStatus = (ev.status || ev.last_status || "").toString().trim();
      const reason = ev.reason ? ev.reason.toString().trim() : "";

      if (!tracking && !orderRef) {
        results.push({ success: false, message: "Missing tracking number and order_id" });
        continue;
      }

      // Find the order in Supabase
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

      // Attempt status update
      let updateRes = await supabase.from("orders").update(updates).eq("id", order.id).select().single();

      // Fallback if PostgreSQL check constraint orders_status_check blocks the status
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

      // Record activity in histories table
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

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    console.error("Yalidine Webhook Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
