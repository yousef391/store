import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adjustStockForOrderStatus } from "@/lib/stock";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { id, updates } = await request.json();

    if (!id || !updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Order ID and updates are required" }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Prepare payload
    const payload = { ...updates };
    const savedNote = payload.note;
    const savedRecalls = payload.recalls;
    const requestedStatus = payload.status;

    // Helper to attempt update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attemptUpdate = async (p: Record<string, any>) => {
      return supabase.from("orders").update(p).eq("id", id).select().single();
    };

    // Fetch current order state before update to detect status transition & stock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentOrder: any = null;
    if (requestedStatus) {
      try {
        const { data: ord } = await supabase
          .from("orders")
          .select("id, order_number, item, size, quantity, status, note, stock_deducted")
          .eq("id", id)
          .single();
        currentOrder = ord;
      } catch {
        // Ignore lookup error
      }
    }

    const currentPayload = { ...payload };
    let res = await attemptUpdate(currentPayload);

    // 1. If check constraint fails (e.g. recall_1..5 or expedie not in orders_status_check yet)
    if (res.error && (res.error.code === "23514" || res.error.message.includes("check constraint"))) {
      if (typeof currentPayload.status === "string" && currentPayload.status.startsWith("recall_")) {
        currentPayload.status = "recall";
      } else if (currentPayload.status === "confirme_reporte" || currentPayload.status === "expedie" || currentPayload.status === "en_livraison" || currentPayload.status === "livre") {
        currentPayload.status = "confirmed";
      } else if (currentPayload.status === "retourne" || currentPayload.status === "echoue") {
        currentPayload.status = "cancelled";
      }
      res = await attemptUpdate(currentPayload);
    }

    // 2. If column note/recalls doesn't exist in orders table
    if (res.error && (res.error.message.includes("column") || res.error.code === "42703" || res.error.message.includes("schema cache"))) {
      delete currentPayload.note;
      delete currentPayload.recalls;
      res = await attemptUpdate(currentPayload);

      // Save note to histories if provided
      if (!res.error && savedNote) {
        await supabase.from("histories").insert({
          action: "order_note",
          description: `Note added to Order #${res.data.order_number}: ${savedNote}`,
          details: JSON.stringify({ order_id: id, note: savedNote }),
        });
      }

      // Save recall to histories if provided
      if (!res.error && savedRecalls && Array.isArray(savedRecalls) && savedRecalls.length > 0) {
        const latestRecall = savedRecalls[savedRecalls.length - 1];
        await supabase.from("histories").insert({
          action: `order_recall_${latestRecall.recall_number || 1}`,
          description: `Order #${res.data.order_number} marked as Recall ${latestRecall.recall_number || 1}`,
          details: JSON.stringify({ order_id: id, recalls: savedRecalls }),
        });
      }
    }

    if (res.error) {
      return NextResponse.json({ error: res.error.message }, { status: 500 });
    }

    // Trigger automatic stock adjustment on status transitions to expedie or retourne
    if (currentOrder && requestedStatus && requestedStatus !== currentOrder.status) {
      if (requestedStatus === "expedie" || requestedStatus === "retourne") {
        try {
          const stockRes = await adjustStockForOrderStatus({
            orderId: id,
            orderNumber: currentOrder.order_number,
            itemName: currentOrder.item,
            size: currentOrder.size,
            quantity: currentOrder.quantity,
            previousStatus: currentOrder.status,
            newStatus: requestedStatus,
            isDeducted: currentOrder.stock_deducted,
            orderNote: currentOrder.note,
          });

          if (stockRes.actionTaken === "deducted") {
            try {
              await supabase.from("orders").update({ stock_deducted: true }).eq("id", id);
            } catch {}
          } else if (stockRes.actionTaken === "restored") {
            try {
              await supabase.from("orders").update({ stock_deducted: false }).eq("id", id);
            } catch {}
          }
        } catch (stockErr) {
          console.warn("Stock sync warning:", stockErr);
        }
      }
    }

    const data = res.data;

    // Attach in-memory note, recalls & requested status to returned order
    const resultOrder = {
      ...data,
      status: requestedStatus !== undefined ? requestedStatus : data.status,
      note: data?.note !== undefined ? data.note : savedNote,
      recalls: data?.recalls !== undefined ? data.recalls : savedRecalls,
    };

    return NextResponse.json({ success: true, order: resultOrder });
  } catch (err: unknown) {
    console.error("Order Update API Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}

