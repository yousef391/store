export interface Order {
  id: string;
  orderNumber: number;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  item: string;
  color: string;
  size: string;
  quantity: number;
  price: string;
  delivery: number;
  total: string;
  status: "confirmed" | "cancelled" | "recall";
  createdAt: string;
}

export interface AbandonedLead {
  id: string;
  name: string;
  phone: string;
  wilaya: string | null;
  commune: string | null;
  item: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  original_price: string | null;
  delivery: number | null;
  original_total: string | null;
  reduced_price: string | null;
  reduced_total: string | null;
  status: string;
  contacted: boolean;
  contact_notes: string | null;
  converted: boolean;
  converted_order_id: string | null;
  ip_address: string | null;
  created_at: string;
  contacted_at: string | null;
}
