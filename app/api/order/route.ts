import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Get client IP
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : (headersList.get("x-real-ip") ?? "unknown");

    const body = await request.json();
    const { name, phone, wilaya, commune, deliveryType, item, color, size, quantity, price, delivery, total, isUpsell } = body;

    // Check if this IP already ordered in the last 48h (bypassed for companion upsell orders)
    if (!isUpsell) {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("order_rate_limits")
        .select("id")
        .eq("ip_address", clientIp)
        .gte("created_at", fortyEightHoursAgo)
        .limit(1);

      if (recentOrders && recentOrders.length > 0) {
        return NextResponse.json(
          { error: "لقد قمت بطلب مؤخراً. يرجى المحاولة بعد 48 ساعة." },
          { status: 429 }
        );
      }
    }

    const formattedCommune = deliveryType === "stopdesk" && commune && !commune.includes("[Stopdesk]")
      ? `${commune} [Stopdesk]`
      : commune;

    const finalItemTitle = isUpsell && !item?.startsWith("[UPSELL]") ? `[UPSELL] ${item}` : item;
    const finalDelivery = isUpsell ? 0 : delivery;

    // 1. Insert order into Supabase
    const { data: order, error: dbError } = await supabase
      .from("orders")
      .insert([{
        name,
        phone,
        wilaya,
        commune: formattedCommune,
        item: finalItemTitle,
        color: color || null,
        size: size || null,
        quantity: quantity || 1,
        price,
        delivery: finalDelivery,
        total,
        status: "new"
      }])
      .select()
      .single();

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Failed to save order." }, { status: 500 });
    }

    // Record this IP for rate limiting (only for primary orders)
    if (!isUpsell) {
      await supabase.from("order_rate_limits").insert([{ ip_address: clientIp }]);
    }

    // 2. Fetch Telegram credentials from store_settings
    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", 1).single();

    const botToken = settings?.telegram_bot_token;
    const chatId = settings?.telegram_chat_id;

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not set in Database.");
      return NextResponse.json({ success: true, warning: "Telegram not configured" });
    }

    // 3. Resolve wilaya name from ID
    let wilayaDisplay = wilaya;
    try {
      const algeriaData = await import("@/data/algeria.json");
      const wilayaObj = algeriaData.wilayas.find(
        (w: { wilaya_id: string; wilaya_name_latin: string }) => w.wilaya_id.toString() === String(wilaya)
      );
      if (wilayaObj) {
        wilayaDisplay = `${wilayaObj.wilaya_id} - ${wilayaObj.wilaya_name_latin}`;
      }
    } catch {
      // fallback to raw value
    }

    const cleanCommune = commune ? commune.replace(/\s*\[Stopdesk\]/i, "") : "";
    const locationDisplay = cleanCommune ? `${wilayaDisplay} - ${cleanCommune}` : wilayaDisplay;
    const itemDisplay = color && !finalItemTitle.includes(color) ? `${finalItemTitle} (${color})` : finalItemTitle;
    const isStopdesk = deliveryType === "stopdesk" || (commune && commune.includes("[Stopdesk]"));
    const deliveryTypeTag = isStopdesk ? "🏢 استلام من المكتب (Stopdesk)" : "🏠 توصيل للمنزل (Domicile)";

    // 4. Format price values
    const formatPrice = (val: number | string) => {
      if (typeof val === "number") return val.toLocaleString("en");
      return val;
    };

    const headerTitle = isUpsell ? "🎁 NEW UPSELL ORDER" : "🚨 NEW CHECKOUT ORDER";
    const deliveryDetail = isUpsell
      ? "0 DA (Livré avec la commande principale)"
      : `${formatPrice(delivery)} DA (${isStopdesk ? "Stopdesk" : "Domicile"})`;

    // 5. Build Telegram message
    const message = `${headerTitle}
━━━━━━━━━━━━━━━━━━
👤 Name: ${name}
📞 Phone: ${phone}
📍 Location: ${locationDisplay}
🚚 Mode: ${deliveryTypeTag}

${isUpsell ? "🎒" : "👕"} Item: ${itemDisplay}
📦 Quantity: ${quantity || 1} piece(s)
📏 Size: ${size || "N/A"}

💰 Product: ${formatPrice(price)} DA
🚚 Delivery: ${deliveryDetail}
🛒 Total: ${formatPrice(total)} DA`;

    // 6. Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });

    return NextResponse.json({ success: true, orderNumber: order?.order_number });
  } catch (error: unknown) {
    console.error("Error processing order:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
