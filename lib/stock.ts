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
  sizes: string[]; // Stock sizes ONLY (independent from product view sizes)
  size_stock: Record<string, number>;
  stock: number;
  updated_at?: string;
}

export interface StockLog {
  id: string;
  product_id?: number;
  product_name: string;
  size: string;
  change: number;
  previous_stock?: number;
  new_stock?: number;
  reason: string;
  order_id?: string;
  order_number?: number;
  user_email?: string;
  created_at: string;
}

// Default standard sizes if stock has never been configured yet
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
 * Fetches all products with their independent stock sizes and stock quantities.
 * Does NOT overwrite or depend on product.sizes (customer view sizes).
 */
export async function fetchProductsWithStock(): Promise<ProductStock[]> {
  try {
    const { data: rawProducts, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .order("id");

    if (prodErr) throw prodErr;
    if (!rawProducts) return [];

    // Read isolated stock data from store_settings.zone_prices.stock_data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let stockDataStore: Record<string | number, any> = {};
    try {
      const { data: settings } = await supabase
        .from("store_settings")
        .select("zone_prices")
        .eq("id", 1)
        .single();

      if (settings?.zone_prices && typeof settings.zone_prices === "object") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const zp = settings.zone_prices as any;
        stockDataStore = zp.stock_data || zp.size_stocks || {};
      }
    } catch {
      // Ignore fallback lookup errors
    }

    return rawProducts.map((p) => {
      let stockSizes: string[] = [];
      let size_stock: Record<string, number> = {};

      const savedData = stockDataStore[p.id];
      if (savedData && typeof savedData === "object") {
        if (savedData.size_stock && typeof savedData.size_stock === "object") {
          size_stock = { ...savedData.size_stock };
          stockSizes = Array.isArray(savedData.sizes) && savedData.sizes.length > 0
            ? [...savedData.sizes]
            : Object.keys(size_stock);
        } else {
          size_stock = { ...savedData };
          stockSizes = Object.keys(size_stock);
        }
      } else if (p.size_stock && typeof p.size_stock === "object" && Object.keys(p.size_stock).length > 0) {
        size_stock = { ...p.size_stock };
        stockSizes = Object.keys(size_stock);
      }

      // If no stock sizes configured yet for this product, initialize with standard stock sizes
      if (stockSizes.length === 0) {
        stockSizes = [...DEFAULT_SIZES];
      }

      // Ensure every stock size exists in size_stock
      stockSizes.forEach((s) => {
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
        sizes: stockSizes, // INDEPENDENT stock sizes ONLY (never touches p.sizes)
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
 * Saves stock sizes and quantities completely independently from product view sizes.
 * NEVER modifies products.sizes or products.status!
 */
export async function saveProductSizeStock(
  productId: number,
  size_stock: Record<string, number>,
  options?: {
    sizes?: string[];
    status?: string;
    reason?: string;
    userEmail?: string;
  }
): Promise<{ success: boolean; totalStock: number }> {
  const stockSizes = options?.sizes && options.sizes.length > 0
    ? options.sizes
    : Object.keys(size_stock);

  const totalStock = Object.values(size_stock).reduce(
    (sum, qty) => sum + Math.max(0, Number(qty) || 0),
    0
  );

  // 1. Update total stock and size_stock in products table without touching products.sizes
  try {
    const res = await supabase
      .from("products")
      .update({
        stock: totalStock,
        size_stock,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (res.error && (res.error.code === "42703" || res.error.message?.includes("column"))) {
      await supabase
        .from("products")
        .update({
          stock: totalStock,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
    }
  } catch (pErr) {
    console.warn("Direct products stock update warning:", pErr);
  }

  // 2. Persist isolated stock data in store_settings (never affects product.sizes)
  try {
    const { data: settings } = await supabase
      .from("store_settings")
      .select("zone_prices")
      .eq("id", 1)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const zonePrices = (settings?.zone_prices as any) || {};
    const stockData = zonePrices.stock_data || {};
    stockData[productId] = {
      sizes: stockSizes,
      size_stock,
      total: totalStock,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("store_settings")
      .update({
        zone_prices: {
          ...zonePrices,
          stock_data: stockData,
          size_stocks: {
            ...(zonePrices.size_stocks || {}),
            [productId]: size_stock,
          },
        },
      })
      .eq("id", 1);
  } catch (e) {
    console.warn("Fallback stock_data persistence error:", e);
  }

  // 3. Log in activity history
  try {
    const { data: prod } = await supabase
      .from("products")
      .select("name")
      .eq("id", productId)
      .single();
    const productName = prod?.name || `Produit #${productId}`;

    await supabase.from("histories").insert({
      action: "stock_manual_update",
      description: `Stock mis à jour pour ${productName} (Total: ${totalStock} pièces)`,
      user: options?.userEmail || "Admin",
      details: JSON.stringify({
        product_id: productId,
        stock_sizes: stockSizes,
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
