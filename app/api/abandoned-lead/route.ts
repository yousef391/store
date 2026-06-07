import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : (headersList.get('x-real-ip') ?? 'unknown');

    const body = await request.json();
    const { name, phone, wilaya, commune, item, color, size, quantity, price, delivery, total } = body;

    // Don't save if critical info is missing
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    // Check if this phone already has a recent abandoned lead (within 2 hours) to avoid duplicates
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('abandoned_leads')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', twoHoursAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing lead with latest data instead of creating duplicate
      await supabase
        .from('abandoned_leads')
        .update({
          name, wilaya, commune, item, color, size,
          quantity: quantity || 1,
          original_price: price,
          delivery,
          original_total: total,
        })
        .eq('id', existing[0].id);

      return NextResponse.json({ success: true, updated: true });
    }

    // Also check if this phone has a completed order - no need to save as abandoned
    const { data: completedOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('phone', phone)
      .gte('created_at', twoHoursAgo)
      .limit(1);

    if (completedOrder && completedOrder.length > 0) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Insert abandoned lead
    const { error: dbError } = await supabase
      .from('abandoned_leads')
      .insert([{
        name,
        phone,
        wilaya: wilaya || null,
        commune: commune || null,
        item: item || null,
        color: color || null,
        size: size || null,
        quantity: quantity || 1,
        original_price: price || null,
        delivery: delivery || null,
        original_total: total || null,
        status: 'new',
        ip_address: clientIp,
      }]);

    if (dbError) {
      console.error("Supabase Error (abandoned lead):", dbError);
      return NextResponse.json({ error: "Failed to save lead." }, { status: 500 });
    }

    console.log("=== ABANDONED LEAD SAVED ===", { name, phone, wilaya });

    // Send a Telegram notification about the abandoned lead
    const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single();
    const botToken = settings?.telegram_bot_token;
    const chatId = settings?.telegram_chat_id;

    if (botToken && chatId) {
      const message = `
⚠️ *LEAD ABANDONNÉ* ⚠️
━━━━━━━━━━━━━━━━━━
👤 *Nom*: ${name}
📞 *Tél*: ${phone}
📍 *Wilaya*: ${wilaya || 'Non sélectionnée'}
🏘️ *Commune*: ${commune || 'Non sélectionnée'}

👕 *Article*: ${item || 'N/A'} (${color || 'N/A'})
📏 *Taille*: ${size || 'N/A'}
📦 *Quantité*: ${quantity || 1}

💰 *Prix vu*: ${total || 'Non calculé'}

_Le client a rempli ses infos mais n'a pas confirmé la commande._
`;

      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        });
      } catch (telegramErr) {
        console.error("Failed to send abandoned lead Telegram notification:", telegramErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error saving abandoned lead:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
