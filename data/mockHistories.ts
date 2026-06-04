import { HistoryEntry } from "@/types/dashboard";

export const mockHistories: HistoryEntry[] = [
  { id: "hist-001", action: "order_confirmed", description: "Order #1015 confirmed — إسلام بوعزيز", user: "Admin", timestamp: "2025-05-25T09:05:00Z", details: "Premium Jogger Set, Size M" },
  { id: "hist-002", action: "order_shipped", description: "Order #1009 shipped via delivery — بلال عدنان", user: "Admin", timestamp: "2025-05-24T16:30:00Z", details: "Essential Crew Tee x2" },
  { id: "hist-003", action: "settings_changed", description: "Delivery zone 2 price updated: 750 DA → 800 DA", user: "Admin", timestamp: "2025-05-24T14:00:00Z" },
  { id: "hist-004", action: "order_delivered", description: "Order #1011 marked as delivered — وليد خالد", user: "System", timestamp: "2025-05-24T11:20:00Z", details: "ROVA Sport Cap" },
  { id: "hist-005", action: "product_added", description: "New product added: Tech Cargo Shorts", user: "Admin", timestamp: "2025-05-23T10:00:00Z", details: "Category: Shorts, Price: 4,200 DA" },
  { id: "hist-006", action: "order_cancelled", description: "Order #1007 cancelled by customer — رؤوف مالك", user: "Admin", timestamp: "2025-05-22T15:45:00Z", details: "Reason: Changed mind" },
  { id: "hist-007", action: "price_updated", description: "Nike Nocta Ensemble bundle price: 8,500 DA → 8,200 DA", user: "Admin", timestamp: "2025-05-22T09:30:00Z" },
  { id: "hist-008", action: "order_confirmed", description: "Order #1006 confirmed — سفيان دحماني", user: "Admin", timestamp: "2025-05-21T17:15:00Z", details: "Nocta Athletic Shorts x2" },
  { id: "hist-009", action: "product_updated", description: "Ensemble Lin Premium stock updated: 40 → 32", user: "Admin", timestamp: "2025-05-21T11:00:00Z" },
  { id: "hist-010", action: "order_delivered", description: "Order #1005 marked as delivered — أمين لعريبي", user: "System", timestamp: "2025-05-20T16:00:00Z", details: "Premium Jogger Set" },
  { id: "hist-011", action: "order_returned", description: "Order #1013 returned — زكريا منصوري", user: "Admin", timestamp: "2025-05-20T10:30:00Z", details: "Reason: Wrong size" },
  { id: "hist-012", action: "settings_changed", description: "Facebook Pixel ID updated", user: "Admin", timestamp: "2025-05-19T14:20:00Z" },
  { id: "hist-013", action: "order_confirmed", description: "Order #1002 confirmed — محمد بوعلام", user: "Admin", timestamp: "2025-05-19T08:45:00Z", details: "Ensemble Lin Premium x2" },
  { id: "hist-014", action: "product_added", description: "New product added: ROVA Sport Cap", user: "Admin", timestamp: "2025-05-18T12:00:00Z", details: "Category: Accessories, Price: 1,800 DA" },
  { id: "hist-015", action: "order_delivered", description: "Order #1001 marked as delivered — أحمد بن علي", user: "System", timestamp: "2025-05-18T09:30:00Z", details: "Nike Nocta Ensemble" },
];
