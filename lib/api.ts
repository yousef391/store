import { supabase } from "./supabase";

// ──── PRODUCTS ────
export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id");
  if (error) throw error;
  return data;
}


export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: number, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: number) {
  try {
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    if (res.ok) return;
  } catch {
    // fallback if fetch / API route isn't reachable
  }

  const { error: showcaseError } = await supabase
    .from("showcase_variants")
    .delete()
    .eq("product_id", id);
  if (showcaseError) {
    console.warn("Could not delete showcase variants:", showcaseError);
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ──── SHOWCASE VARIANTS ────
export async function fetchShowcaseVariants(productId: number) {
  const { data, error } = await supabase
    .from("showcase_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");
  if (error) throw error;
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeOrder(order: any) {
  if (!order) return order;
  let status = order.status;
  // If order has tracking_id, it is dispatched (expédié) by default unless delivered/returned/cancelled
  if (order.tracking_id && (status === "confirmed" || status === "new" || status === "expedie" || !status)) {
    status = "expedie";
  } else if (status === "recall") {
    if (Array.isArray(order.recalls) && order.recalls.length > 0) {
      const lastRecall = order.recalls[order.recalls.length - 1];
      const num = lastRecall?.recall_number || 1;
      status = `recall_${num}`;
    } else {
      status = "recall_1";
    }
  }

  // Fallback to check if note contains Yalidine delivery updates
  if (status !== "livre" && status !== "retourne" && typeof order.note === "string") {
    const lowerNote = order.note.toLowerCase();
    if (lowerNote.includes("[yalidine: livré") || lowerNote.includes("[yalidine: livre")) {
      status = "livre";
    } else if (lowerNote.includes("[yalidine: retourné") || lowerNote.includes("[yalidine: retour")) {
      status = "retourne";
    }
  }

  return {
    ...order,
    status,
  };
}

// ──── ORDERS ────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(normalizeOrder);
}

export async function createOrder(order: {
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  item: string;
  color: string;
  size: string;
  quantity: number;
  price: number;
  delivery: number;
  total: number;
}) {
  const { data, error } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

export async function updateOrderStatus(id: string, status: string) {
  return updateOrder(id, { status });
}

export async function fetchOrderById(id: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return normalizeOrder(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateOrder(id: string, updates: Record<string, any>) {
  try {
    const res = await fetch("/api/order/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    const result = await res.json();
    if (res.ok && result.order) return normalizeOrder(result.order);
    if (result.error) throw new Error(result.error);
  } catch (apiErr) {
    console.warn("API update failed, trying direct supabase:", apiErr);
  }

  // Fallback to direct supabase update
  const payload = { ...updates };
  const { data, error } = await supabase
    .from("orders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error && (error.code === "23514" || error.message?.includes("check constraint"))) {
    if (typeof payload.status === "string" && payload.status.startsWith("recall_")) {
      payload.status = "recall";
    } else if (payload.status === "expedie") {
      payload.status = "confirmed";
    }
    const retry = await supabase
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (retry.error) throw retry.error;
    return normalizeOrder({ ...retry.data, status: updates.status });
  }

  if (error) throw error;
  return normalizeOrder(data);
}

export async function deleteOrder(id: string) {
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) throw error;
}

// ──── ABANDONED LEADS ────
export async function fetchAbandonedLeads() {
  const { data, error } = await supabase
    .from("abandoned_leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAbandonedLead(lead: {
  name: string;
  phone: string;
  wilaya?: string;
  commune?: string;
  item?: string;
  color?: string;
  size?: string;
  quantity?: number;
  original_price?: string;
  delivery?: number;
  original_total?: string;
}) {
  const { data, error } = await supabase
    .from("abandoned_leads")
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAbandonedLead(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("abandoned_leads")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAbandonedLead(id: string) {
  const { error } = await supabase.from("abandoned_leads").delete().eq("id", id);
  if (error) throw error;
}

// ──── HISTORY ────
export async function fetchHistories() {
  const { data, error } = await supabase
    .from("histories")
    .select("*")
    .order("timestamp", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createHistory(entry: {
  action: string;
  description: string;
  user?: string;
  details?: string;
}) {
  const { error } = await supabase.from("histories").insert(entry);
  if (error) throw error;
}

// ──── STORE SETTINGS ────
export async function fetchStoreSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

// ──── YALIDINE SYNC ────
export async function syncYalidineParcels(options?: {
  startDate?: string;
  endDate?: string;
  dateType?: "date_creation" | "date_last_status";
  trackings?: string[];
}) {
  const res = await fetch("/api/yalidine/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options || {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur de synchronisation Yalidine");
  return data;
}

export async function updateStoreSettings(updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("store_settings")
    .update(updates)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}
