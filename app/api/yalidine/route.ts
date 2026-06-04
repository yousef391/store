import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { orderId, overrides } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch the Order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.tracking_id) {
      return NextResponse.json({ error: "Order already has a tracking ID", tracking_id: order.tracking_id }, { status: 400 });
    }

    // 2. Fetch Yalidine API Credentials
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("yalidine_api_id, yalidine_api_token")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.yalidine_api_id || !settings?.yalidine_api_token) {
      return NextResponse.json({ error: "Yalidine API credentials not configured in settings." }, { status: 403 });
    }

    // 3. Format Data for Yalidine
    const finalName = overrides?.name || order.name;
    const rawPhone = overrides?.phone || order.phone;
    const normalizePhones = (phoneString: string) => {
      if (!phoneString) return "";
      return phoneString.split(/[,/;-|]+/).map(num => {
        let c = num.replace(/\D/g, "");
        if (c.startsWith("00213")) c = "0" + c.substring(5);
        else if (c.startsWith("213")) c = "0" + c.substring(3);
        else if (c.length === 9 && /^[5-7]/.test(c)) c = "0" + c;
        else if (c.startsWith("00")) c = "0" + c.substring(2);
        return c;
      }).filter(c => c.length >= 9).join(",") || phoneString.trim().substring(0, 50);
    };

    const finalPhone = normalizePhones(rawPhone);
    const finalWilaya = overrides?.wilaya || order.wilaya;
    const finalCommune = overrides?.commune || order.commune;
    const finalAddress = overrides?.address || order.commune || "Adresse non spécifiée";

    // Parse name
    const nameParts = finalName.trim().split(" ");
    const firstname = nameParts[0] || "Client";
    const familyname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Client";

    // Parse price
    let priceNumber = 0;
    if (overrides?.price !== undefined) {
      priceNumber = overrides.price;
    } else {
      priceNumber = typeof order.total === "number" ? order.total : parseInt(String(order.total).replace(/[^\d]/g, ""), 10) || 0;
    }

    // Yalidine Wilaya Names (accents required)
    const YALIDINE_WILAYAS: Record<number, string> = {
      1: "Adrar", 2: "Chlef", 3: "Laghouat", 4: "Oum El Bouaghi", 5: "Batna",
      6: "Béjaïa", 7: "Biskra", 8: "Béchar", 9: "Blida", 10: "Bouira",
      11: "Tamanrasset", 12: "Tébessa", 13: "Tlemcen", 14: "Tiaret", 15: "Tizi Ouzou",
      16: "Alger", 17: "Djelfa", 18: "Jijel", 19: "Sétif", 20: "Saïda",
      21: "Skikda", 22: "Sidi Bel Abbès", 23: "Annaba", 24: "Guelma", 25: "Constantine",
      26: "Médéa", 27: "Mostaganem", 28: "M'Sila", 29: "Mascara", 30: "Ouargla",
      31: "Oran", 32: "El Bayadh", 33: "Illizi", 34: "Bordj Bou Arreridj", 35: "Boumerdès",
      36: "El Tarf", 37: "Tindouf", 38: "Tissemsilt", 39: "El Oued", 40: "Khenchela",
      41: "Souk Ahras", 42: "Tipaza", 43: "Mila", 44: "Aïn Defla", 45: "Naâma",
      46: "Aïn Témouchent", 47: "Ghardaïa", 48: "Relizane", 49: "Timimoun", 50: "Bordj Badji Mokhtar",
      51: "Ouled Djellal", 52: "Béni Abbès", 53: "In Salah", 54: "In Guezzam", 55: "Touggourt",
      56: "Djanet", 57: "El M'Ghair", 58: "El Menia"
    };

    // Extract wilaya ID
    let wilayaId = 16;
    const wilayaIdMatch = finalWilaya.match(/^(\d+)/);
    if (wilayaIdMatch) {
      wilayaId = parseInt(wilayaIdMatch[1], 10);
    } else {
      const foundEntry = Object.entries(YALIDINE_WILAYAS).find(([, v]) => v.toLowerCase() === finalWilaya.toLowerCase().trim());
      if (foundEntry) wilayaId = parseInt(foundEntry[0], 10);
    }
    const strictWilayaName = YALIDINE_WILAYAS[wilayaId] || finalWilaya.trim();

    // Fetch communes for exact spelling + check deliverability
    let strictCommuneName = finalCommune.trim();
    let communeIsDeliverable = true;
    if (finalCommune) {
      try {
        const commRes = await fetch(`https://api.yalidine.app/v1/communes/?wilaya_id=${wilayaId}`, {
          headers: {
            "X-API-ID": settings.yalidine_api_id,
            "X-API-TOKEN": settings.yalidine_api_token
          }
        });
        const commData = await commRes.json();
        if (commData?.data?.length > 0) {
          const normalize = (str: string) => str.toLowerCase().replace(/[- ']/g, "");
          const match = commData.data.find((c: { name: string }) => normalize(c.name) === normalize(finalCommune));
          if (match) {
            strictCommuneName = match.name;
            communeIsDeliverable = match.is_deliverable === 1;
          }

          // If commune is not deliverable, try to find the closest deliverable one (wilaya capital or first deliverable)
          if (!communeIsDeliverable) {
            // Try wilaya capital (usually has same name as wilaya)
            const capitalMatch = commData.data.find((c: { name: string; is_deliverable: number }) =>
              c.is_deliverable === 1 && normalize(c.name) === normalize(strictWilayaName)
            );
            if (capitalMatch) {
              strictCommuneName = capitalMatch.name;
              communeIsDeliverable = true;
            } else {
              // Fallback: first deliverable commune with stop desk
              const anyDeliverable = commData.data.find((c: { is_deliverable: number; has_stop_desk: number }) =>
                c.is_deliverable === 1 && c.has_stop_desk === 1
              ) || commData.data.find((c: { is_deliverable: number }) => c.is_deliverable === 1);
              if (anyDeliverable) {
                strictCommuneName = anyDeliverable.name;
                communeIsDeliverable = true;
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch communes from Yalidine:", err);
      }
    }

    if (!communeIsDeliverable) {
      return NextResponse.json({ error: `La commune "${finalCommune}" n'est pas livrable par Yalidine. Veuillez choisir une commune livrable dans le formulaire.` }, { status: 400 });
    }

    const referenceId = order.order_number ? order.order_number.toString() : order.id.toString();

    let productDescription = overrides?.product_list || `${order.item} (${order.color}, ${order.size})`;
    if (overrides?.autorisation_ouverture) {
      productDescription += ` - Autorisation d'ouverture: OUI`;
    }

    const yalidinePayload = [{
      order_id: referenceId,
      from_wilaya_name: "Oran",
      firstname,
      familyname,
      contact_phone: finalPhone,
      address: finalAddress,
      to_commune_name: strictCommuneName,
      to_wilaya_name: strictWilayaName,
      product_list: productDescription,
      price: priceNumber,
      do_insurance: overrides?.do_insurance !== undefined ? overrides.do_insurance : true,
      declared_value: overrides?.declared_value !== undefined ? overrides.declared_value : priceNumber,
      freeshipping: false,
      is_stopdesk: overrides?.is_stopdesk || false,
      ...(overrides?.is_stopdesk && overrides?.stopdesk_id ? { stopdesk_id: overrides.stopdesk_id } : {}),
      has_exchange: false
    }];

    // 4. Send to Yalidine
    const yalidineResponse = await fetch("https://api.yalidine.app/v1/parcels/", {
      method: "POST",
      headers: {
        "X-API-ID": settings.yalidine_api_id,
        "X-API-TOKEN": settings.yalidine_api_token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(yalidinePayload)
    });

    const yalidineData = await yalidineResponse.json();
    const result = yalidineData[referenceId];

    if (!result || !result.success) {
      console.error("Yalidine Creation Failed:", result?.message || yalidineData);
      return NextResponse.json({ error: result?.message || "Failed to create parcel in Yalidine" }, { status: 400 });
    }

    // 5. Save tracking_id
    const trackingId = result.tracking;
    await supabase.from("orders").update({ tracking_id: trackingId }).eq("id", order.id);

    return NextResponse.json({ success: true, tracking_id: trackingId, yalidine_label: result.label });

  } catch (err: unknown) {
    console.error("Yalidine Route Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { orderId, trackingId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    if (trackingId) {
      const { data: settings } = await supabase
        .from("store_settings")
        .select("yalidine_api_id, yalidine_api_token")
        .eq("id", 1)
        .single();

      if (settings?.yalidine_api_id && settings?.yalidine_api_token) {
        await fetch(`https://api.yalidine.app/v1/parcels/${trackingId}`, {
          method: "DELETE",
          headers: {
            "X-API-ID": settings.yalidine_api_id,
            "X-API-TOKEN": settings.yalidine_api_token,
            "Content-Type": "application/json"
          }
        });
      }
    }

    const { data: deletedRows, error } = await supabase.from("orders").delete().eq("id", orderId).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (deletedRows && deletedRows.length === 0) {
      return NextResponse.json({ error: "RLS blocking deletion." }, { status: 403 });
    }

    return NextResponse.json({ success: true, deleted: deletedRows });
  } catch (err: unknown) {
    console.error("Yalidine Delete Route Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}
