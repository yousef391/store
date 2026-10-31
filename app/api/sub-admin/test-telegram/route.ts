import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { chat_id } = await request.json();

    if (!chat_id) {
      return NextResponse.json({ error: "Chat ID is required." }, { status: 400 });
    }

    // Get Telegram bot token from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("telegram_bot_token")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.telegram_bot_token) {
      return NextResponse.json(
        { error: "Telegram bot token is not configured in Store Settings." },
        { status: 400 }
      );
    }

    const botToken = settings.telegram_bot_token;
    const testMessage = `🔔 *ROVA Store — Test Alert*\n\n✅ Your Telegram account is successfully connected!\nYou will receive order alerts for your assigned products here.`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: String(chat_id).trim(),
        text: testMessage,
        parse_mode: "Markdown",
      }),
    });

    const data = await res.json();

    if (!data.ok) {
      // Provide user-friendly explanation for common Telegram errors
      let advice = data.description || "Failed to send message";
      if (data.error_code === 403 || advice.toLowerCase().includes("bot can't initiate") || advice.toLowerCase().includes("blocked")) {
        advice = "The user has not pressed START on the bot yet. Please ask the user to open your Telegram bot and click Start (/start) first!";
      } else if (data.error_code === 400 && advice.toLowerCase().includes("chat not found")) {
        advice = "Chat not found. Please verify the Telegram Chat ID number, and make sure the user sent /start to your bot.";
      }

      return NextResponse.json(
        { error: advice, telegram_description: data.description },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

