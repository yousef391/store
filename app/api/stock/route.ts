import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SIZES, normalizeSize, matchProductByName } from "@/lib/stock";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// GET /api/stock -> returns products with size stock & logs
export async function GET() {
  try {
    const supabase = getAdminClient();

    const { data: rawProducts, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .order("id");

    if (prodErr) throw prodErr;

    // Check fallback in store_settings
    let fallbackSizeStocks: Record<string | number, Record<string, number>> = {};
    try {
      const { data: settings } = await supabase
        .from("store_settings")
        .select("zone_prices")
        .eq("id", 1)
        .single();

      if (settings?.zone_prices && typeof settings.zone_prices === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fallbackSizeStocks = (settings.zone_prices as any).size_stocks || {};
      }
    } catch {
      // Ignore
    }

    const products = (rawProducts || []).map((p) => {
      const sizes: string[] = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : [...DEFAULT_SIZES];

      let size_stock: Record<string, number> = {};
      if (p.size_stock && typeof p.size_stock === "object" && Object.keys(p.size_stock).length > 0) {
        size_stock = { ...p.size_stock };
      } else if (fallbackSizeStocks[p.id]) {
        size_stock = { ...fallbackSizeStocks[p.id] };
      } else {
        const total = typeof p.stock === "number" ? p.stock : 0;
        const perSize = sizes.length > 0 ? Math.floor(total / sizes.length) : total;
        const remainder = sizes.length > 0 ? total % sizes.length : 0;
        sizes.forEach((s, idx) => {
          size_stock[s] = perSize + (idx === 0 ? remainder : 0);
        });
      }

      sizes.forEach((s) => {
        if (size_stock[s] === undefined) {
          size_stock[s] = 0;
        }
      });

      const computedStock = Object.values(size_stock).reduce((acc, qty) => acc + (Number(qty) || 0), 0);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status || (computedStock > 0 ? "active" : "out_of_stock"),
        price: p.price || 0,
        bundle_price: p.bundle_price,
        images: Array.isArray(p.images) ? p.images : [],
        category: p.category || "General",
        sizes,
        size_stock,
        stock: computedStock,
        updated_at: p.updated_at,
      };
    });

    // Try fetching recent stock histories
    let logs: unknown[] = [];
    try {
      const { data: historyLogs } = await supabase
        .from("histories")
        .select("*")
        .like("action", "stock_%")
        .order("timestamp", { ascending: false })
        .limit(20);
      logs = historyLogs || [];
    } catch {
      // Ignore
    }

    return NextResponse.json({ success: true, products, logs });
  } catch (err: unknown) {
    console.error("GET /api/stock error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur chargement stock" },
      { status: 500 }
    );
  }
}

// POST /api/stock -> adjusts stock manually or on order status change
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { action } = body;

    // 1. Manual product stock update
    if (action === "update_product") {
      const { productId, size_stock, status, sizes, userEmail } = body;

      if (!productId || !size_stock || typeof size_stock !== "object") {
        return NextResponse.json({ error: "productId and size_stock required" }, { status: 400 });
      }

      const totalStock = Object.values(size_stock).reduce(
        (sum: number, qty) => sum + Math.max(0, Number(qty) || 0),
        0
      );
      const newStatus = status || (totalStock > 0 ? "active" : "out_of_stock");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        stock: totalStock,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (sizes && Array.isArray(sizes)) {
        updates.sizes = sizes;
      }

      // Try update with size_stock column
      let res = await supabase
        .from("products")
        .update({ ...updates, size_stock })
        .eq("id", productId)
        .select()
        .single();

      // Fallback if column missing
      if (res.error && (res.error.code === "42703" || res.error.message?.includes("column"))) {
        res = await supabase
          .from("products")
          .update(updates)
          .eq("id", productId)
          .select()
          .single();

        try {
          const { data: settings } = await supabase
            .from("store_settings")
            .select("zone_prices")
            .eq("id", 1)
            .single();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const zonePrices = (settings?.zone_prices as any) || {};
          const sizeStocks = zonePrices.size_stocks || {};
          sizeStocks[productId] = size_stock;

          await supabase
            .from("store_settings")
            .update({ zone_prices: { ...zonePrices, size_stocks: sizeStocks } })
            .eq("id", 1);
        } catch (e) {
          console.warn("Fallback persistence error:", e);
        }
      }

      if (res.error) throw res.error;

      // Log in histories
      try {
        await supabase.from("histories").insert({
          action: "stock_manual_update",
          description: `Stock mis à jour pour ${res.data?.name || `Produit #${productId}`} (Total: ${totalStock} pièces)`,
          user: userEmail || "Admin",
          details: JSON.stringify({ product_id: productId, size_stock, total: totalStock }),
        });
      } catch (hErr) {
        console.warn("History write error:", hErr);
      }

      return NextResponse.json({ success: true, product: res.data, totalStock });
    }

    // 2. Adjust for order transition (expedie / retourne)
    if (action === "adjust_for_order") {
      const {
        orderId,
        orderNumber,
        itemName,
        size: rawSize,
        quantity = 1,
        previousStatus,
        newStatus,
        isDeducted = false,
        orderNote = "",
        userEmail,
      } = body;

      const wasAlreadyDeducted =
        isDeducted === true || (typeof orderNote === "string" && orderNote.includes("[STOCK_DEDUCTED]"));

      const shouldDeduct = newStatus === "expedie" && previousStatus !== "expedie" && !wasAlreadyDeducted;
      const shouldRestore = newStatus === "retourne" && previousStatus !== "retourne" && wasAlreadyDeducted;

      if (!shouldDeduct && !shouldRestore) {
        return NextResponse.json({
          actionTaken: "none",
          change: 0,
          newStockDeductedStatus: wasAlreadyDeducted,
        });
      }

      const qty = Math.max(1, quantity || 1);
      const change = shouldDeduct ? -qty : qty;
      const targetSize = normalizeSize(rawSize);

      // Fetch products
      const { data: rawProducts } = await supabase.from("products").select("*").order("id");
      const matched = matchProductByName(itemName, rawProducts || []);

      if (!matched) {
        return NextResponse.json({
          actionTaken: "none",
          change: 0,
          newStockDeductedStatus: shouldDeduct ? true : false,
          message: `Produit "${itemName}" introuvable`,
        });
      }

      // Check fallback size stock
      let size_stock: Record<string, number> = {};
      if (matched.size_stock && typeof matched.size_stock === "object") {
        size_stock = { ...matched.size_stock };
      } else {
        const { data: settings } = await supabase
          .from("store_settings")
          .select("zone_prices")
          .eq("id", 1)
          .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fallback = (settings?.zone_prices as any)?.size_stocks || {};
        size_stock = (matched.id ? fallback[matched.id] : {}) || {};
      }

      // Find or initialize matching size
      const foundKey = Object.keys(size_stock).find(
        (k) => k.trim().toUpperCase() === targetSize.trim().toUpperCase()
      );
      const fallbackKey = targetSize !== "Standard" ? targetSize : (matched.sizes?.[0] || "Standard");
      const sizeKey: string = foundKey || fallbackKey;

      if (size_stock[sizeKey] === undefined) {
        size_stock[sizeKey] = 0;
      }

      const currentQty = Number(size_stock[sizeKey]) || 0;
      const newQty = Math.max(0, currentQty + change);
      size_stock[sizeKey] = newQty;

      const totalStock = Object.values(size_stock).reduce(
        (sum, q) => sum + Math.max(0, Number(q) || 0),
        0
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        stock: totalStock,
        status: totalStock > 0 ? "active" : "out_of_stock",
        updated_at: new Date().toISOString(),
      };

      const updateRes = await supabase
        .from("products")
        .update({ ...updates, size_stock })
        .eq("id", matched.id);

      if (updateRes.error && (updateRes.error.code === "42703" || updateRes.error.message?.includes("column"))) {
        await supabase.from("products").update(updates).eq("id", matched.id);
        try {
          const { data: settings } = await supabase
            .from("store_settings")
            .select("zone_prices")
            .eq("id", 1)
            .single();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const zonePrices = (settings?.zone_prices as any) || {};
          const sizeStocks = zonePrices.size_stocks || {};
          sizeStocks[matched.id] = size_stock;
          await supabase
            .from("store_settings")
            .update({ zone_prices: { ...zonePrices, size_stocks: sizeStocks } })
            .eq("id", 1);
        } catch (e) {
          console.warn("Fallback persistence error:", e);
        }
      }

      // Log in histories
      try {
        const desc = shouldDeduct
          ? `Stock déduit (-${qty} ${sizeKey}) pour Commande #${orderNumber || orderId} expédiée (${matched.name})`
          : `Stock réintégré (+${qty} ${sizeKey}) pour Commande #${orderNumber || orderId} retournée (${matched.name})`;

        await supabase.from("histories").insert({
          action: shouldDeduct ? "stock_order_expedie" : "stock_order_retourne",
          description: desc,
          user: userEmail || "Système",
          details: JSON.stringify({
            order_id: orderId,
            order_number: orderNumber,
            product_id: matched.id,
            size: sizeKey,
            change,
            new_stock: totalStock,
          }),
        });
      } catch (hErr) {
        console.warn("History write error:", hErr);
      }

      return NextResponse.json({
        success: true,
        actionTaken: shouldDeduct ? "deducted" : "restored",
        change,
        newStockDeductedStatus: shouldDeduct ? true : false,
        size: sizeKey,
        newSizeQty: newQty,
        totalStock,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("POST /api/stock error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur traitement stock" },
      { status: 500 }
    );
  }
}
