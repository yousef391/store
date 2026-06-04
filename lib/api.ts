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

// ──── ORDERS ────
export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
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
  return data;
}

export async function updateOrderStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
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
  wilaya: string;
  product: string;
  size: string;
  quantity: number;
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
