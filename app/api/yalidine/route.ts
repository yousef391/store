import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getYalidineAccount, getYalidineAccountsFromSettings } from "@/lib/yalidine";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const { orderId, overrides, accountId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    const targetAccountId = accountId || overrides?.account || overrides?.yalidine_account || "1";

    const supabase = getAdminClient();

    // 1. Fetch the Order
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

    // 2. Fetch Yalidine API Credentials (supports Account 1 and Account 2)
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({ error: "Store settings could not be loaded." }, { status: 500 });
    }

    const account = getYalidineAccount(settings, targetAccountId);

    if (!account.api_id || !account.api_token) {
      return NextResponse.json({
        error: `Yalidine API credentials not configured for Account ${targetAccountId}. Please check Settings.`
      }, { status: 403 });
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
      priceNumber = typeof order.price === "number" ? order.price : parseInt(String(order.price).replace(/[^\d]/g, ""), 10) || 0;
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
            "X-API-ID": account.api_id,
            "X-API-TOKEN": account.api_token
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

    let referenceId = order.order_number ? order.order_number.toString() : order.id.toString();
    if (overrides?.forceRetry) {
      referenceId = `${referenceId}-R${Math.floor(100 + Math.random() * 900)}`;
    }

    let productDescription = overrides?.product_list || `${order.item} (${order.color}, ${order.size})`;
    if (overrides?.autorisation_ouverture) {
      productDescription += ` - Autorisation d'ouverture: OUI`;
    }
    if (overrides?.has_delivery_time && overrides?.delivery_time) {
      productDescription += ` - Heure livraison: ${String(overrides.delivery_time).trim()}`;
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
      do_insurance: overrides?.do_insurance !== undefined ? Boolean(overrides.do_insurance) : false,
      declared_value: overrides?.declared_value !== undefined ? Number(overrides.declared_value) : 2000,
      freeshipping: false,
      is_stopdesk: overrides?.is_stopdesk || false,
      ...(overrides?.is_stopdesk && overrides?.stopdesk_id ? { stopdesk_id: overrides.stopdesk_id } : {}),
      has_exchange: false
    }];

    // 4. Send to Yalidine (using chosen Account 1 or 2)
    const yalidineResponse = await fetch("https://api.yalidine.app/v1/parcels/", {
      method: "POST",
      headers: {
        "X-API-ID": account.api_id,
        "X-API-TOKEN": account.api_token,
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

    // 5. Save tracking_id, status and dispatch note to orders
    const trackingId = result.tracking;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderUpdates: Record<string, any> = {
      tracking_id: trackingId,
      status: "expedie",
      yalidine_account: account.id,
    };

    const dispatchNotes: string[] = [];
    dispatchNotes.push(`Yalidine: Compte ${account.id}`);
    if (overrides?.autorisation_ouverture) {
      dispatchNotes.push("Autorisation d'ouverture: OUI");
    }
    if (overrides?.has_delivery_time && overrides?.delivery_time) {
      dispatchNotes.push(`Heure: ${String(overrides.delivery_time).trim()}`);
    }
    if (dispatchNotes.length > 0) {
      const noteBadge = `[${dispatchNotes.join(" · ")}]`;
      orderUpdates.note = order.note ? `${order.note} | ${noteBadge}` : noteBadge;
    }

    let updateRes = await supabase.from("orders").update(orderUpdates).eq("id", order.id);

    // If yalidine_account column doesn't exist, remove and retry
    if (updateRes.error && (updateRes.error.code === "42703" || updateRes.error.message.includes("column"))) {
      delete orderUpdates.yalidine_account;
      updateRes = await supabase.from("orders").update(orderUpdates).eq("id", order.id);
    }

    // If check constraint rejects 'expedie', save tracking_id
    if (updateRes.error && (updateRes.error.code === "23514" || updateRes.error.message.includes("check constraint"))) {
      console.warn("orders_status_check rejected 'expedie', saving tracking_id only:", updateRes.error.message);
      delete orderUpdates.status;
      updateRes = await supabase.from("orders").update(orderUpdates).eq("id", order.id);
    }

    if (updateRes.error) {
      console.error("Failed to save tracking_id in orders:", updateRes.error);
    }

    return NextResponse.json({
      success: true,
      tracking_id: trackingId,
      status: "expedie",
      account: account.id,
      account_name: account.name,
      yalidine_label: result.label
    });

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

    const supabase = getAdminClient();

    if (trackingId) {
      const { data: settings } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (settings) {
        const accounts = getYalidineAccountsFromSettings(settings);
        // Try each account until deleted or handled
        for (const acc of accounts) {
          if (acc.api_id && acc.api_token) {
            try {
              const delRes = await fetch(`https://api.yalidine.app/v1/parcels/${trackingId}`, {
                method: "DELETE",
                headers: {
                  "X-API-ID": acc.api_id,
                  "X-API-TOKEN": acc.api_token,
                  "Content-Type": "application/json"
                }
              });
              if (delRes.ok) break;
            } catch {
              // Try next account
            }
          }
        }
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
