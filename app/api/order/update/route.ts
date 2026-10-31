import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // Try full update first
    const { data: initialData, error } = await supabase
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    let data = initialData;

    // If note or recalls column does not exist in orders table yet, retry without them
    if (error && (error.message.includes("column") || error.code === "42703" || error.message.includes("schema cache"))) {
      const strippedPayload = { ...payload };
      delete strippedPayload.note;
      delete strippedPayload.recalls;

      const fallbackRes = await supabase
        .from("orders")
        .update(strippedPayload)
        .eq("id", id)
        .select()
        .single();

      if (fallbackRes.error) {
        return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 });
      }

      data = fallbackRes.data;

      // Save note in histories if note was provided
      if (savedNote) {
        await supabase.from("histories").insert({
          action: "order_note",
          description: `Note added to Order #${data.order_number}: ${savedNote}`,
          details: JSON.stringify({ order_id: id, note: savedNote }),
        });
      }

      // Save recall in histories if recall was updated
      if (savedRecalls && Array.isArray(savedRecalls) && savedRecalls.length > 0) {
        const latestRecall = savedRecalls[savedRecalls.length - 1];
        await supabase.from("histories").insert({
          action: `order_recall_${latestRecall.recall_number || 1}`,
          description: `Order #${data.order_number} marked as Recall ${latestRecall.recall_number || 1}`,
          details: JSON.stringify({ order_id: id, recalls: savedRecalls }),
        });
      }
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Attach in-memory note & recalls to returned order if columns weren't in table
    const resultOrder = {
      ...data,
      note: data?.note !== undefined ? data.note : savedNote,
      recalls: data?.recalls !== undefined ? data.recalls : savedRecalls,
    };

    return NextResponse.json({ success: true, order: resultOrder });
  } catch (err: unknown) {
    console.error("Order Update API Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}

