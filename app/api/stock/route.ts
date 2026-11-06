import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SIZES } from "@/lib/stock";

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
        status: p.status || "active",
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

    // Fetch recent manual stock histories
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

// POST /api/stock -> manual product stock update
export async function POST(request: Request) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();
    const { action } = body;

    if (action === "update_product") {
      const { productId, size_stock, status, sizes, userEmail } = body;

      if (!productId || !size_stock || typeof size_stock !== "object") {
        return NextResponse.json({ error: "productId and size_stock required" }, { status: 400 });
      }

      const totalStock = Object.values(size_stock).reduce(
        (sum: number, qty) => sum + Math.max(0, Number(qty) || 0),
        0
      );
      const newStatus = status || "active";

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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("POST /api/stock error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur traitement stock" },
      { status: 500 }
    );
  }
}
