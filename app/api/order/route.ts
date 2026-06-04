import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    // Get client IP
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const clientIp = forwarded ? forwarded.split(",")[0].trim() : (headersList.get("x-real-ip") ?? "unknown");

    // Check if this IP already ordered in the last 48h
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

    const body = await request.json();
    const { name, phone, wilaya, commune, item, color, size, quantity, price, delivery, total } = body;

    // 1. Insert order into Supabase
    const { data: order, error: dbError } = await supabase
      .from("orders")
      .insert([{ name, phone, wilaya, commune, item, color, size, quantity: quantity || 1, price, delivery, total, status: "new" }])
      .select()
      .single();

    if (dbError) {
      console.error("Supabase Error:", dbError);
      return NextResponse.json({ error: "Failed to save order." }, { status: 500 });
    }

    // Record this IP for rate limiting
    await supabase.from("order_rate_limits").insert([{ ip_address: clientIp }]);

    // 2. Fetch Telegram credentials from store_settings
    const { data: settings } = await supabase.from("store_settings").select("*").eq("id", 1).single();

    const botToken = settings?.telegram_bot_token;
    const chatId = settings?.telegram_chat_id;

    if (!botToken || !chatId) {
      console.warn("Telegram credentials not set in Database.");
      return NextResponse.json({ success: true, warning: "Telegram not configured" });
    }

    // 3. Format price values
    const formatPrice = (val: number | string) => {
      if (typeof val === "number") return val.toLocaleString("en");
      return val;
    };

    // 4. Build Telegram message
    const message = `
🛒 *NOUVELLE COMMANDE ROVA* 🛒
━━━━━━━━━━━━━━━━━━
👤 *Client*: ${name}
📱 *Tél*: ${phone}
🗺️ *Adresse*: ${wilaya} - ${commune}

👕 *Article*: ${item} (${color})
🛍️ *Quantité*: ${quantity || 1} pièce(s)
📐 *Taille*: ${size}

💶 *Prix*: ${formatPrice(price)} DA
🚚 *Livraison*: ${delivery} DA
💎 *Total*: *${formatPrice(total)} DA*
`;

    // 5. Send to Telegram
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
