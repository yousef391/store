export interface HistoryEntry {
  id: string;
  action: "order_confirmed" | "order_cancelled" | "order_shipped" | "order_delivered" | "order_returned" | "product_added" | "product_updated" | "settings_changed" | "price_updated";
  description: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface StoreSettings {
  singlePrice: number;
  bundlePrice: number;
  zonePrices: Record<number, number>;
  fbPixelId: string;
}
