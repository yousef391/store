import { supabase } from "./supabase";

export interface ProductStock {
  id: number;
  name: string;
  slug: string;
  status: "active" | "out_of_stock" | "draft" | string;
  price: number;
  bundle_price?: number;
  images: string[];
  category: string;
  sizes: string[];
  size_stock: Record<string, number>;
  stock: number;
  updated_at?: string;
}

export interface StockLog {
  id: string;
  product_id?: number;
  product_name: string;
  size: string;
  change: number; // e.g. -1, +1, +10
  previous_stock?: number;
  new_stock?: number;
  reason: string;
  order_id?: string;
  order_number?: number;
  user_email?: string;
  created_at: string;
}

// Default standard sizes if a product has no sizes defined
export const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

/**
 * Normalizes size strings for robust display (e.g. "Taille M" -> "M", "xl" -> "XL")
 */
export function normalizeSize(rawSize?: string | null): string {
  if (!rawSize) return "Standard";
  let s = rawSize.trim().toUpperCase();
  s = s.replace(/^(TAILLE|SIZE)\s*[:\-]?\s*/i, "").trim();
  if (s.includes("/")) {
    s = s.split("/")[0].trim();
  }
  return s || "Standard";
}

/**
 * Fetches all products with complete size-level stock
 * Uses products table, with fallback to store_settings if size_stock column isn't yet migrated.
 */
export async function fetchProductsWithStock(): Promise<ProductStock[]> {
  try {
    const { data: rawProducts, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .order("id");

    if (prodErr) throw prodErr;
    if (!rawProducts) return [];

    // Check fallback stored in store_settings if size_stock isn't present
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
      // Ignore fallback lookup errors
    }

    return rawProducts.map((p) => {
      const sizes: string[] = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : [...DEFAULT_SIZES];

      // Parse or build size_stock object
      let size_stock: Record<string, number> = {};
      if (p.size_stock && typeof p.size_stock === "object" && Object.keys(p.size_stock).length > 0) {
        size_stock = { ...p.size_stock };
      } else if (fallbackSizeStocks[p.id]) {
        size_stock = { ...fallbackSizeStocks[p.id] };
      } else {
        // Initialize sizes from total stock
        const total = typeof p.stock === "number" ? p.stock : 0;
        const perSize = sizes.length > 0 ? Math.floor(total / sizes.length) : total;
        const remainder = sizes.length > 0 ? total % sizes.length : 0;

        sizes.forEach((s, idx) => {
          size_stock[s] = perSize + (idx === 0 ? remainder : 0);
        });
      }

      // Ensure every size key exists in size_stock
      sizes.forEach((s) => {
        if (size_stock[s] === undefined) {
          size_stock[s] = 0;
        }
      });

      // Compute total stock from size_stock
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
  } catch (err) {
    console.error("fetchProductsWithStock error:", err);
    throw err;
  }
}

/**
 * Saves size stock for a product manually from the dashboard
 */
export async function saveProductSizeStock(
  productId: number,
  size_stock: Record<string, number>,
  options?: {
    sizes?: string[];
    status?: "active" | "out_of_stock" | "draft" | string;
    reason?: string;
    userEmail?: string;
  }
): Promise<{ success: boolean; totalStock: number }> {
  const totalStock = Object.values(size_stock).reduce((sum, qty) => sum + Math.max(0, Number(qty) || 0), 0);
  const status = options?.status || "active";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {
    stock: totalStock,
    status,
    updated_at: new Date().toISOString(),
  };

  if (options?.sizes && Array.isArray(options.sizes)) {
    updates.sizes = options.sizes;
  }

  // First attempt: direct update with size_stock column
  let res = await supabase
    .from("products")
    .update({ ...updates, size_stock })
    .eq("id", productId)
    .select()
    .single();

  // Fallback if column size_stock does not exist in products table yet
  if (res.error && (res.error.code === "42703" || res.error.message?.includes("column"))) {
    // 1. Update total stock in products table
    res = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select()
      .single();

    // 2. Persist size_stock in store_settings fallback
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
        .update({
          zone_prices: {
            ...zonePrices,
            size_stocks: sizeStocks,
          },
        })
        .eq("id", 1);
    } catch (e) {
      console.warn("Fallback size_stock persistence warning:", e);
    }
  }

  if (res.error) {
    console.error("Failed to save product stock:", res.error);
    throw res.error;
  }

  // Log in activity history
  try {
    const productName = res.data?.name || `Produit #${productId}`;
    await supabase.from("histories").insert({
      action: "stock_manual_update",
      description: `Stock mis à jour pour ${productName} (Total: ${totalStock} pièces)`,
      user: options?.userEmail || "Admin",
      details: JSON.stringify({
        product_id: productId,
        size_stock,
        total: totalStock,
        reason: options?.reason || "Mise à jour manuelle",
      }),
    });
  } catch (hErr) {
    console.warn("Could not write stock history entry:", hErr);
  }

  return { success: true, totalStock };
}
