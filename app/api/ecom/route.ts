import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { orderId, overrides } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch the Order from Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.tracking_id && !overrides?.forceRetry) {
      return NextResponse.json({ error: "Order already has a tracking ID", tracking_id: order.tracking_id }, { status: 400 });
    }

    // 2. Fetch Ecom API Credentials from store_settings
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const apiKey = settings?.ecom_api_key || settings?.zone_prices?.ecom_api_key;
    const apiToken = settings?.ecom_api_token || settings?.zone_prices?.ecom_api_token;
    const apiUrl = settings?.ecom_api_url || settings?.zone_prices?.ecom_api_url || "https://ecom-dz.net/Api_v1/Colis";

    if (settingsError || !apiKey || !apiToken) {
      return NextResponse.json({ error: "Ecom API credentials not configured in settings." }, { status: 403 });
    }

    // 3. Format Data for Ecom
    const finalName = overrides?.name || order.name;
    const finalPhone = overrides?.phone || order.phone;
    const finalWilaya = overrides?.wilaya || order.wilaya; // Wilaya ID string e.g., "16"
    const rawCommune = overrides?.commune || order.commune || "";
    const cleanCommune = rawCommune.replace(/\s*\[Stopdesk\]/i, "").trim();
    const finalAddress = overrides?.address || cleanCommune || "Adresse non spécifiée";
    
    // Parse price
    let priceNumber = 0;
    if (overrides?.price !== undefined) {
      priceNumber = overrides.price;
    } else {
      priceNumber = typeof order.total === "number" ? order.total : parseInt(String(order.total).replace(/[^\d]/g, ""), 10) || 0;
    }

    // Extract Wilaya ID (Assuming string format "16" or "16 - Alger")
    let wilayaId = "16"; // Default
    const wilayaIdMatch = String(finalWilaya).match(/^(\d+)/);
    if (wilayaIdMatch) {
      wilayaId = wilayaIdMatch[1];
    }

    const isStopdeskOrder = overrides?.is_stopdesk !== undefined
      ? Boolean(overrides.is_stopdesk)
      : Boolean(order.commune?.includes("[Stopdesk]") || order.delivery_type === "stopdesk");

    const referenceId = order.order_number ? order.order_number.toString() : order.id.toString();

    const ecomPayload = {
      Colis: [
        {
          Echange: overrides?.has_exchange ? 1 : 0,
          Stopdesk: isStopdeskOrder ? 1 : 0,
          CodeStopdesk: isStopdeskOrder ? (overrides?.stopdesk_id || "") : "",
          NomComplet: finalName,
          Mobile_1: finalPhone,
          Mobile_2: "",
          Adresse: finalAddress,
          Wilaya: wilayaId,
          Commune: cleanCommune,
          Article: overrides?.product_list || `${order.item} - ${order.color} - ${order.size}`,
          Ref_Article: order.item || "",
          NoteFournisseur: overrides?.note || "",
          Total: priceNumber.toString(),
          ID_Externe: referenceId,
          Source: "Dashboard"
        }
      ]
    };

    // 4. Send Request to Ecom API
    const ecomResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Key": apiKey,
        "Token": apiToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ecomPayload)
    });

    const ecomData = await ecomResponse.json();

    // 5. Parse Ecom Response
    if (!ecomData || !ecomData.Colis || ecomData.Colis.length === 0) {
      console.error("Ecom Creation Failed:", ecomData);
      return NextResponse.json({ error: ecomData?.message || "Failed to create parcel in Ecom" }, { status: 400 });
    }

    const result = ecomData.Colis[0];

    if (!result.Tracking) {
       console.error("Ecom Creation Failed, no tracking:", result);
       return NextResponse.json({ error: result.message || "Failed to create parcel in Ecom, no tracking returned" }, { status: 400 });
    }

    // 6. Save tracking_id to Database
    const trackingId = result.Tracking;
    
    await supabase
      .from("orders")
      .update({ tracking_id: trackingId })
      .eq("id", order.id);

    return NextResponse.json({ success: true, tracking_id: trackingId, label: result.label });

  } catch (err: unknown) {
    console.error("Ecom Route Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const { data: deletedRows, error } = await supabase.from("orders").delete().eq("id", orderId).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: deletedRows });
  } catch (err: unknown) {
    console.error("Ecom Delete Route Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}
