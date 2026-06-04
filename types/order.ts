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
  wilaya: string;
  product: string;
  size: string;
  quantity: number;
  createdAt: string;
  contacted: boolean;
}
