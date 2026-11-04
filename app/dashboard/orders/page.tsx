"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Copy,
  Check,
  X,
  Truck,
  RefreshCw,
  Clock,
  PhoneCall,
  StickyNote,
  Pencil,
  Eye,
} from "lucide-react";
import { fetchOrders, updateOrderStatus, updateOrder, createHistory } from "@/lib/api";
import { useAuth } from "@/components/dashboard/AuthGuard";
import { matchesAssignedProduct } from "@/lib/auth";
import { products } from "@/data/products";
import algeriaData from "@/data/algeria.json";
import EditOrderModal, { type Order, type RecallRecord } from "@/components/dashboard/EditOrderModal";
import OrderDetailModal from "@/components/dashboard/OrderDetailModal";

const STATUS_OPTIONS = [
  "new",
  "confirmed",
  "expedie",
  "en_livraison",
  "livre",
  "echoue",
  "retourne",
  "recall_1",
  "recall_2",
  "recall_3",
  "recall_4",
  "recall_5",
  "cancelled",
] as const;

const statusColors: Record<
  string,
  { bg: string; text: string; border: string; dot: string; label: string }
> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400", label: "New" },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400", label: "Confirmed" },
  expedie: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", dot: "bg-purple-400", label: "Expédié" },
  en_livraison: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30", dot: "bg-cyan-400", label: "En livraison" },
  livre: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/40", dot: "bg-emerald-400", label: "Livré" },
  echoue: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400", label: "Échec livraison" },
  retourne: { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30", dot: "bg-rose-400", label: "Retourné" },
  recall_1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400", label: "Recall 1" },
  recall_2: { bg: "bg-amber-600/15", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-500", label: "Recall 2" },
  recall_3: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400", label: "Recall 3" },
  recall_4: { bg: "bg-orange-600/15", text: "text-orange-300", border: "border-orange-600/30", dot: "bg-orange-500", label: "Recall 4" },
  recall_5: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400", label: "Recall 5" },
  recall: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400", label: "Recall 1" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400", label: "Cancelled" },
};

export default function OrdersPage() {
  const { role, assignedProducts, userEmail } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Filters with internal cache
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");
  const [currentPage, setCurrentPage] = useState(1);

  // Mobile Pull-to-refresh
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulking, setIsBulking] = useState(false);
  const rowsPerPage = 10;

  // Modals for editing & details view
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);

  // Dispatch (Yalidine & Ecom Delivery)
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [editingDispatchOrder, setEditingDispatchOrder] = useState<Order | null>(null);
  const [dispatchProvider, setDispatchProvider] = useState<"ecom" | "yalidine">("ecom");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dispatchData, setDispatchData] = useState<any>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [yalidineCommunes, setYalidineCommunes] = useState<{ id: number; name: string; is_deliverable: boolean; has_stop_desk: boolean }[]>([]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  // Load orders from API
  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchOrders();
      let list: Order[] = data || [];
      if (role === "sub_admin") {
        list = list.filter((o) => matchesAssignedProduct(o.item, assignedProducts));
      }
      setOrders(list);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [role, assignedProducts]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const reloadOrders = useCallback(async () => {
    setIsRefreshing(true);
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(35);
      } catch {}
    }
    await loadOrders();
  }, [loadOrders]);

  // Load cached filters from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem("orders_filters_cache");
      if (cached) {
        const f = JSON.parse(cached);
        if (typeof f.statusFilter === "string") setStatusFilter(f.statusFilter);
        if (typeof f.productFilter === "string") setProductFilter(f.productFilter);
        if (typeof f.dateFilter === "string") setDateFilter(f.dateFilter);
        if (typeof f.searchQuery === "string") setSearchQuery(f.searchQuery);
        if (typeof f.currentPage === "number" && f.currentPage > 0) setCurrentPage(f.currentPage);
      }
    } catch (e) {
      console.warn("Failed to load cached filters:", e);
    } finally {
      setFiltersLoaded(true);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (!filtersLoaded) return;
    try {
      localStorage.setItem(
        "orders_filters_cache",
        JSON.stringify({
          statusFilter,
          productFilter,
          dateFilter,
          searchQuery,
          currentPage,
        })
      );
    } catch (e) {
      console.warn("Failed to cache filters:", e);
    }
  }, [statusFilter, productFilter, dateFilter, searchQuery, currentPage, filtersLoaded]);

  // Reset page when user actively changes search, status, product, or date
  useEffect(() => {
    if (!filtersLoaded) return;
    setCurrentPage(1);
  }, [searchQuery, statusFilter, productFilter, dateFilter, filtersLoaded]);

  const handleResetFilters = () => {
    setStatusFilter("all");
    setProductFilter("all");
    setDateFilter("today");
    setSearchQuery("");
    setCurrentPage(1);
    try {
      localStorage.removeItem("orders_filters_cache");
    } catch {}
  };

  // Mobile Pull-to-Refresh Gesture (Swipe down to refresh)
  useEffect(() => {
    let startY = 0;
    let isTracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 2 && !isRefreshing) {
        startY = e.touches[0].clientY;
        isTracking = true;
      } else {
        isTracking = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTracking || isRefreshing) return;
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY;

      if (delta > 0 && window.scrollY <= 2) {
        const pull = Math.min(delta * 0.42, 85);
        setPullDistance(pull);
        setIsPulling(true);
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    const onTouchEnd = () => {
      if (!isTracking || isRefreshing) return;
      isTracking = false;
      setIsPulling(false);

      setPullDistance((prev) => {
        if (prev >= 55) {
          reloadOrders();
          return 60;
        }
        return 0;
      });
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isRefreshing, reloadOrders]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1500);
    });
  };

  // Format exact date & time
  const formatOrderDateTime = (iso: string) => {
    if (!iso) return "---";
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} à ${timeStr}`;
  };

  // Product counts and distinct list
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.item) {
        counts[o.item] = (counts[o.item] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  const productOptions = useMemo(() => {
    if (role === "sub_admin") {
      return (assignedProducts || []).slice().sort();
    }
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.name) set.add(p.name);
    });
    orders.forEach((o) => {
      if (o.item) set.add(o.item);
    });
    return Array.from(set).sort();
  }, [orders, role, assignedProducts]);

  const phoneCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.phone) {
        counts[o.phone] = (counts[o.phone] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  const { startOfToday, startOfYesterday, startOfWeek, startOfMonth } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const week = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startOfToday: today, startOfYesterday: yesterday, startOfWeek: week, startOfMonth: month };
  }, []);

  const todayCount = useMemo(() => orders.filter((o) => new Date(o.created_at) >= startOfToday).length, [orders, startOfToday]);
  const yesterdayCount = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= startOfYesterday && d < startOfToday;
      }).length,
    [orders, startOfYesterday, startOfToday]
  );

  const filteredOrders = orders.filter((o) => {
    const d = new Date(o.created_at);
    let matchesDate = true;
    if (dateFilter === "today") matchesDate = d >= startOfToday;
    else if (dateFilter === "yesterday") matchesDate = d >= startOfYesterday && d < startOfToday;
    else if (dateFilter === "week") matchesDate = d >= startOfWeek;
    else if (dateFilter === "month") matchesDate = d >= startOfMonth;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.name?.toLowerCase().includes(q) ||
      o.phone?.includes(q) ||
      o.wilaya?.toLowerCase().includes(q) ||
      o.commune?.toLowerCase().includes(q) ||
      o.item?.toLowerCase().includes(q) ||
      o.color?.toLowerCase().includes(q) ||
      o.size?.toLowerCase().includes(q) ||
      String(o.order_number).includes(q) ||
      (o.tracking_id && o.tracking_id.toLowerCase().includes(q)) ||
      (o.note && o.note.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === "all") {
      matchesStatus = true;
    } else if (statusFilter === "recall") {
      // Matches all 5 recalls
      matchesStatus = o.status === "recall" || o.status.startsWith("recall_");
    } else {
      matchesStatus = o.status === statusFilter;
    }

    const matchesProduct =
      productFilter === "all" ||
      o.item === productFilter ||
      o.item?.toLowerCase().includes(productFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesProduct && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  // Status Update & Recall Tracking
  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const order = orders.find((o) => o.id === id);
      const updatedRecalls = order?.recalls ? [...order.recalls] : [];

      if (status.startsWith("recall_") || status === "recall") {
        const recallNum = status === "recall" ? 1 : (parseInt(status.replace("recall_", ""), 10) || 1);
        const now = new Date();
        const newRecord: RecallRecord = {
          recall_number: recallNum,
          timestamp: now.toISOString(),
          date_formatted: now.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          user: userEmail || (role === "sub_admin" ? "Sub-Admin" : "Admin"),
        };
        const idx = updatedRecalls.findIndex((r) => r.recall_number === recallNum);
        if (idx >= 0) updatedRecalls[idx] = newRecord;
        else updatedRecalls.push(newRecord);
      }

      const targetStatus = status === "recall" ? "recall_1" : status;
      const updatedRes = await updateOrder(id, { status: targetStatus, recalls: updatedRecalls });
      const finalStatus = updatedRes?.status || targetStatus;
      const finalRecalls = updatedRes?.recalls || updatedRecalls;

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: finalStatus, recalls: finalRecalls } : o))
      );

      if (selectedDetailOrder?.id === id) {
        setSelectedDetailOrder((prev) => (prev ? { ...prev, status: finalStatus, recalls: finalRecalls } : null));
      }

      if (order) {
        await createHistory({
          action: `order_${finalStatus}`,
          description: `Order #${order.order_number} marked as ${statusColors[finalStatus]?.label || finalStatus} — ${order.name}`,
          details: order.item,
        });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleSaveOrder = async (updatedOrder: Order) => {
    try {
      await updateOrder(updatedOrder.id, { ...updatedOrder });
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
      if (selectedDetailOrder?.id === updatedOrder.id) {
        setSelectedDetailOrder(updatedOrder);
      }
      await createHistory({
        action: "order_updated",
        description: `Order #${updatedOrder.order_number} details updated manually`,
        details: updatedOrder.item,
      }).catch(console.error);
    } catch (err) {
      console.error("Failed to update order:", err);
      throw err;
    }
  };

  const handleTriggerRecall = async (orderId: string, recallNum: number) => {
    await handleUpdateStatus(orderId, `recall_${recallNum}`);
  };

  const handleDelete = async (id: string, trackingId?: string | null) => {
    if (!window.confirm("Delete this order?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/yalidine", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, trackingId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete order");
      }
      setOrders((prev) => prev.filter((o) => o.id !== id));
      if (selectedDetailOrder?.id === id) setSelectedDetailOrder(null);
    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedOrderIds(next);
  };

  const toggleAll = () => {
    if (selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(paginatedOrders.map((o) => o.id)));
    }
  };

  const handleBulkStatus = async (status: string) => {
    setIsBulking(true);
    let updated = 0;
    for (const id of Array.from(selectedOrderIds)) {
      try {
        await handleUpdateStatus(id, status);
        updated++;
      } catch (err) {
        console.error("Bulk status error", err);
      }
    }
    setSelectedOrderIds(new Set());
    setIsBulking(false);
    alert(`Updated ${updated} orders to ${status}.`);
  };

  const handleBulkDispatch = async (provider: "ecom" | "yalidine") => {
    setIsBulking(true);
    let success = 0;
    let failed = 0;
    const newOrders = [...orders];
    const endpoint = provider === "ecom" ? "/api/ecom" : "/api/yalidine";

    for (const id of Array.from(selectedOrderIds)) {
      const orderIndex = newOrders.findIndex((o) => o.id === id);
      if (orderIndex === -1) continue;
      const order = newOrders[orderIndex];
      if (order.tracking_id) continue;

      const wilayaMatch = order.wilaya.match(/^(\d+)/);
      const defaultWilayaId = wilayaMatch ? wilayaMatch[1] : "";
      const priceNumber = typeof order.price === "number" ? order.price : parseInt(String(order.price).replace(/[^\d]/g, ""), 10) || 0;
      const deliveryNumber = typeof order.delivery === "number" ? order.delivery : parseInt(String(order.delivery).replace(/[^\d]/g, ""), 10) || 0;
      const defaultIncludeDelivery = provider === "ecom";
      let initialPrice = priceNumber > 200 ? priceNumber - 200 : priceNumber;
      if (defaultIncludeDelivery) initialPrice += deliveryNumber;

      const isStopdeskOrder = Boolean(order.commune?.includes("[Stopdesk]"));
      const cleanCommune = (order.commune || "").replace(/\s*\[Stopdesk\]/i, "").trim();

      const dispatchData = {
        name: order.name,
        phone: order.phone,
        wilaya: defaultWilayaId || order.wilaya,
        commune: cleanCommune,
        address: cleanCommune || "",
        product_list: `${order.item} - ${order.color} - ${order.size}`,
        originalPrice: priceNumber,
        deliveryFee: deliveryNumber,
        include_delivery: defaultIncludeDelivery,
        discount: 200,
        price: initialPrice,
        do_insurance: false,
        declared_value: 2000,
        is_stopdesk: isStopdeskOrder,
        stopdesk_id: "",
        autorisation_ouverture: true,
        forceRetry: true,
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, overrides: dispatchData }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          failed++;
        } else {
          // Auto-mark as expedie when pushed to Yalidine/Ecom!
          const noteStamp = "[Autorisation d'ouverture: OUI]";
          newOrders[orderIndex].tracking_id = data.tracking_id;
          newOrders[orderIndex].status = "expedie";
          newOrders[orderIndex].note = newOrders[orderIndex].note
            ? `${newOrders[orderIndex].note} | ${noteStamp}`
            : noteStamp;
          await updateOrderStatus(order.id, "expedie");
          await createHistory({
            action: "order_expedie",
            description: `Order #${order.order_number} auto-marked as Expédié on dispatch to ${provider} (Bulk)`,
            details: order.item,
          });
          success++;
        }
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
    setOrders(newOrders);
    setSelectedOrderIds(new Set());
    setIsBulking(false);
    alert(`Bulk Dispatch to ${provider} complete! ${success} succeeded, ${failed} failed.`);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedOrderIds.size} orders? This cannot be undone.`)) return;
    setIsBulking(true);
    let success = 0;
    let failed = 0;
    const idsToDelete = Array.from(selectedOrderIds);
    let currentOrders = [...orders];

    for (const id of idsToDelete) {
      const order = currentOrders.find((o) => o.id === id);
      if (!order) continue;
      try {
        const res = await fetch("/api/yalidine", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, trackingId: order.tracking_id }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          failed++;
        } else {
          currentOrders = currentOrders.filter((o) => o.id !== id);
          success++;
        }
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
    setOrders(currentOrders);
    setSelectedOrderIds(new Set());
    setIsBulking(false);
    alert(`Bulk Delete complete! ${success} deleted, ${failed} failed.`);
  };

  // Dispatch Modal
  const openDispatchModal = (order: Order, provider: "ecom" | "yalidine" = "ecom") => {
    setEditingDispatchOrder(order);
    setDispatchProvider(provider);
    const wilayaMatch = order.wilaya.match(/^(\d+)/);
    const defaultWilayaId = wilayaMatch ? wilayaMatch[1] : "";
    const priceNumber = typeof order.price === "number" ? order.price : parseInt(String(order.price).replace(/[^\d]/g, ""), 10) || 0;
    const deliveryNumber = typeof order.delivery === "number" ? order.delivery : parseInt(String(order.delivery).replace(/[^\d]/g, ""), 10) || 0;
    const defaultDiscount = 200;
    const defaultIncludeDelivery = provider === "ecom";

    let initialPrice = priceNumber > defaultDiscount ? priceNumber - defaultDiscount : priceNumber;
    if (defaultIncludeDelivery) initialPrice += deliveryNumber;

    const isStopdeskOrder = Boolean(order.commune?.includes("[Stopdesk]"));
    const cleanCommune = (order.commune || "").replace(/\s*\[Stopdesk\]/i, "").trim();

    setDispatchData({
      name: order.name,
      phone: order.phone,
      wilaya: defaultWilayaId || order.wilaya,
      commune: cleanCommune,
      address: cleanCommune || "",
      product_list: `${order.item} - ${order.color} - ${order.size}`,
      originalPrice: priceNumber,
      deliveryFee: deliveryNumber,
      include_delivery: defaultIncludeDelivery,
      discount: defaultDiscount,
      price: initialPrice,
      do_insurance: false,
      declared_value: 2000,
      is_stopdesk: isStopdeskOrder,
      stopdesk_id: "",
      autorisation_ouverture: true,
      has_delivery_time: false,
      delivery_time: "",
      forceRetry: true,
    });

    fetchYalidineCommunes(defaultWilayaId || order.wilaya);
  };

  const fetchYalidineCommunes = useCallback(async (wilayaId: string) => {
    if (!wilayaId) return;
    setLoadingCommunes(true);
    try {
      const res = await fetch(`/api/yalidine/communes?wilaya_id=${wilayaId}`);
      const data = await res.json();
      setYalidineCommunes(data.communes || []);
    } catch {
      setYalidineCommunes([]);
    } finally {
      setLoadingCommunes(false);
    }
  }, []);

  const deliverableCommunes = yalidineCommunes.filter((c) => c.is_deliverable);

  const handleDispatchPush = async () => {
    if (!editingDispatchOrder) return;
    setPushingId(editingDispatchOrder.id);
    const endpoint = dispatchProvider === "ecom" ? "/api/ecom" : "/api/yalidine";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: editingDispatchOrder.id, overrides: dispatchData }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || `Failed to push to ${dispatchProvider === "ecom" ? "Ecom Delivery" : "Yalidine"}.`);
      } else {
        alert(`Successfully dispatched to ${dispatchProvider === "ecom" ? "Ecom Delivery" : "Yalidine"}! Tracking ID: ${data.tracking_id}`);

        // Update local state: tracking ID, status and dispatch notes
        const dispatchNoteTags: string[] = [];
        if (dispatchData.autorisation_ouverture) dispatchNoteTags.push("Autorisation d'ouverture: OUI");
        if (dispatchData.has_delivery_time && dispatchData.delivery_time) {
          dispatchNoteTags.push(`Heure: ${String(dispatchData.delivery_time).trim()}`);
        }
        const noteBadge = dispatchNoteTags.length > 0 ? `[${dispatchNoteTags.join(" · ")}]` : "";
        const updatedNote = editingDispatchOrder.note
          ? (noteBadge ? `${editingDispatchOrder.note} | ${noteBadge}` : editingDispatchOrder.note)
          : (noteBadge || null);

        setOrders(
          orders.map((o) =>
            o.id === editingDispatchOrder.id
              ? { ...o, tracking_id: data.tracking_id, status: "expedie", note: updatedNote }
              : o
          )
        );

        // Auto-mark as expedie in background
        updateOrderStatus(editingDispatchOrder.id, "expedie").catch(console.error);
        createHistory({
          action: "order_expedie",
          description: `Order #${editingDispatchOrder.order_number} auto-marked as Expédié on dispatch to ${dispatchProvider}`,
          details: editingDispatchOrder.item,
        }).catch(console.error);

        setEditingDispatchOrder(null);
      }
    } catch (err) {
      console.error(err);
      alert(`Network error pushing to ${dispatchProvider === "ecom" ? "Ecom Delivery" : "Yalidine"}.`);
    } finally {
      setPushingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      style={{
        transform: isPulling || isRefreshing ? `translateY(${pullDistance * 0.35}px)` : undefined,
        transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        overscrollBehaviorY: "contain",
      }}
      className="flex flex-col gap-4 lg:gap-6 max-w-7xl relative"
    >
      {/* Mobile Pull-to-Refresh Floating Pill */}
      <div
        style={{
          transform: `translate(-50%, ${isRefreshing ? 60 : pullDistance}px)`,
          transition: isPulling ? "none" : "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s",
          opacity: pullDistance > 8 || isRefreshing ? 1 : 0,
        }}
        className="fixed top-2 left-1/2 z-50 pointer-events-none flex items-center justify-center transition-opacity"
      >
        <div className="bg-[#141720]/95 border border-white/20 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2.5 backdrop-blur-md">
          <RefreshCw
            size={14}
            className={`text-accent ${isRefreshing ? "animate-spin" : ""}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullDistance * 4.5}deg)`,
            }}
          />
          <span className="text-[11px] font-semibold text-white tracking-wide">
            {isRefreshing
              ? "Actualisation en cours..."
              : pullDistance >= 55
              ? "Relâcher pour actualiser"
              : "Glisser pour actualiser"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{filteredOrders.length} results</p>
        </div>
        <button
          onClick={reloadOrders}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-gray-300 transition-colors cursor-pointer disabled:opacity-50"
          title="Actualiser les commandes"
        >
          <RefreshCw size={13} className={isRefreshing ? "animate-spin text-accent" : ""} />
          <span className="hidden sm:inline">Actualiser</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Today&apos;s Orders</p>
          <p className="text-2xl font-black text-white">{todayCount}</p>
        </div>
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Yesterday&apos;s Orders</p>
          <p className="text-2xl font-black text-white">{yesterdayCount}</p>
        </div>
      </div>

      {/* Search + Product Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Search orders by name, phone, wilaya, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer"
        >
          <option value="all">All Products</option>
          {productOptions.map((p) => (
            <option key={p} value={p}>
              {p} {productCounts[p] ? `(${productCounts[p]})` : ""}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as "today" | "yesterday" | "week" | "month" | "all")}
          className="bg-surface border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer"
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Status Pills & Active Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 bg-white/5 p-1 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === "all" ? "bg-accent text-black" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("new")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
              statusFilter === "new" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            New
          </button>
          <button
            onClick={() => setStatusFilter("confirmed")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
              statusFilter === "confirmed" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Confirmed
          </button>
          <button
            onClick={() => setStatusFilter("expedie")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
              statusFilter === "expedie" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Expédié
          </button>
          <button
            onClick={() => setStatusFilter("recall")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
              statusFilter === "recall" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Recalls (1-5)
          </button>
          <button
            onClick={() => setStatusFilter("cancelled")}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
              statusFilter === "cancelled" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Cancelled
          </button>
        </div>

        {/* Reset Active Filters Button */}
        {(productFilter !== "all" || statusFilter !== "all" || searchQuery || dateFilter !== "today") && (
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors cursor-pointer"
          >
            <X size={13} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} className="w-5 h-5 rounded border border-accent flex items-center justify-center bg-accent text-black">
              <Check size={12} />
            </button>
            <span className="text-sm font-bold text-accent">{selectedOrderIds.size} orders selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkStatus(e.target.value);
                  e.target.value = "";
                }
              }}
              className="bg-surface border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="">Set Status...</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusColors[s]?.label || s}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleBulkDispatch("ecom")}
              disabled={isBulking}
              className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {isBulking ? "Pushing..." : "Push Ecom"}
            </button>
            <button
              onClick={() => handleBulkDispatch("yalidine")}
              disabled={isBulking}
              className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-500/20 transition-colors disabled:opacity-50"
            >
              {isBulking ? "Pushing..." : "Push Yalidine (Expédié)"}
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isBulking}
              className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Orders Table & Mobile Cards */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {paginatedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <Filter className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No orders found.</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MOBILE CARDS VIEW (ENHANCED FOR MOBILE DASHBOARD)           */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="md:hidden flex flex-col gap-2.5 p-2.5">
              {paginatedOrders.map((order) => {
                const currentStatus = statusColors[order.status] || statusColors.recall || {
                  bg: "bg-gray-500/10",
                  text: "text-gray-400",
                  border: "border-white/10",
                  dot: "bg-gray-400",
                  label: order.status,
                };

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border transition-all p-3.5 flex flex-col gap-2.5 ${
                      selectedOrderIds.has(order.id)
                        ? "bg-accent/5 border-accent/30"
                        : "bg-white/[0.02] border-white/5 hover:border-white/10"
                    }`}
                  >
                    {/* Top Row: Checkbox, Name, Order #, Total */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => toggleSelection(order.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            selectedOrderIds.has(order.id) ? "bg-accent border-accent text-black" : "border-white/20 hover:border-white/40"
                          }`}
                        >
                          {selectedOrderIds.has(order.id) && <Check size={10} />}
                        </button>
                        <button
                          onClick={() => setSelectedDetailOrder(order)}
                          className="text-sm font-bold text-white hover:text-accent truncate text-left transition-colors"
                        >
                          {order.name}
                        </button>
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
                          #{order.order_number}
                        </span>
                      </div>
                      <span className="text-sm font-black text-white tabular-nums shrink-0">
                        {order.total.toLocaleString()} DA
                      </span>
                    </div>

                    {/* Date & Exact Time Badge (Mobile) */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-300">
                        <Clock size={12} className="text-accent shrink-0" />
                        <span>{formatOrderDateTime(order.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {order.source === "meta" && (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded">
                            Meta
                          </span>
                        )}
                        {order.source === "tiktok" && (
                          <span className="text-[9px] font-bold text-pink-400 bg-pink-400/10 border border-pink-400/20 px-1.5 py-0.5 rounded">
                            TikTok
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Phone + Direct Call Button */}
                    <div className="flex items-center justify-between gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          onClick={() => copyPhone(order.phone)}
                          className="flex items-center gap-1 text-xs text-blue-400 font-mono font-bold"
                          dir="ltr"
                        >
                          <span>{order.phone}</span>
                          {copiedPhone === order.phone ? (
                            <Check size={11} className="text-emerald-400" />
                          ) : (
                            <Copy size={11} className="text-gray-500 hover:text-gray-300" />
                          )}
                        </button>
                        {phoneCounts[order.phone] > 1 && (
                          <span
                            className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full"
                            title={`${phoneCounts[order.phone]} orders with this phone number`}
                          >
                            {phoneCounts[order.phone]}
                          </span>
                        )}
                      </div>

                      {/* 📞 Direct Call Button (Appel) */}
                      <a
                        href={`tel:${order.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 transition-all text-xs font-black shadow-md shadow-emerald-500/10"
                      >
                        <PhoneCall size={12} />
                        <span>Appeler</span>
                      </a>
                    </div>

                    {/* Item & Location details */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="truncate max-w-[200px] text-gray-200 font-medium">
                        {order.item} {order.size ? `(${order.size})` : ""}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <span>{order.wilaya}</span>
                        {order.commune?.includes("[Stopdesk]") ? (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded">
                            🏢 Stopdesk
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1 py-0.2 rounded">
                            🏠 Domicile
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges for Autorisation d'ouverture & Delivery Time */}
                    {order.note && (order.note.includes("Autorisation d'ouverture") || order.note.includes("Heure:")) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {order.note.includes("Autorisation d'ouverture: OUI") && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                            🔓 Ouverture OK
                          </span>
                        )}
                        {order.note.match(/Heure:\s*([^\]|]+)/) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                            🕒 {order.note.match(/Heure:\s*([^\]|]+)/)?.[1].trim()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Yellow Note Badge */}
                    {order.note ? (
                      <button
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs font-medium hover:bg-amber-400/25 transition-all text-left"
                        title="Cliquez pour modifier la note"
                      >
                        <StickyNote size={13} className="text-amber-400 shrink-0" />
                        <span className="truncate">{order.note}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className="text-[11px] text-gray-500 hover:text-amber-300 flex items-center gap-1 transition-colors self-start"
                      >
                        <StickyNote size={11} /> + Ajouter une note
                      </button>
                    )}

                    {/* Bottom Row: Status Dropdown + Shipping + Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                      {/* Status Dropdown */}
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className={`flex-1 appearance-none bg-surface/80 outline-none cursor-pointer px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg text-center border ${currentStatus.border} ${currentStatus.text}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-[#141720] text-white">
                            {statusColors[s]?.label || s}
                          </option>
                        ))}
                      </select>

                      {/* Shipping Dispatch */}
                      {order.tracking_id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded truncate max-w-[85px]">
                            {order.tracking_id}
                          </span>
                          <button
                            onClick={() => openDispatchModal(order, "yalidine")}
                            disabled={pushingId === order.id}
                            title="Yalidine"
                            className="p-1.5 bg-white/5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <RefreshCw size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openDispatchModal(order, "ecom")}
                            disabled={pushingId === order.id}
                            className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-colors"
                          >
                            Ecom
                          </button>
                          <button
                            onClick={() => openDispatchModal(order, "yalidine")}
                            disabled={pushingId === order.id}
                            className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded-lg hover:bg-rose-500/20 transition-colors"
                          >
                            Yalidine
                          </button>
                        </div>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingOrder(order)}
                        title="Modifier la commande"
                        className="p-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                      >
                        <Pencil size={13} />
                      </button>

                      {/* Details View Button */}
                      <button
                        onClick={() => setSelectedDetailOrder(order)}
                        title="Voir détails & historique des relances"
                        className="p-1.5 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg transition-colors"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(order.id, order.tracking_id)}
                        disabled={deletingId === order.id}
                        className="p-1.5 bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* DESKTOP TABLE VIEW                                          */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[950px]">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 w-10">
                      <button
                        onClick={toggleAll}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0
                            ? "bg-accent border-accent text-black"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0 && <Check size={10} />}
                      </button>
                    </th>
                    <th className="px-4 py-3">Date & Heure</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Localisation</th>
                    <th className="px-4 py-3">Article</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Statut</th>
                    <th className="px-4 py-3 text-center">Expédition</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const currentStatus = statusColors[order.status] || statusColors.recall || {
                      bg: "bg-gray-500/10",
                      text: "text-gray-400",
                      border: "border-white/10",
                      dot: "bg-gray-400",
                      label: order.status,
                    };

                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                          selectedOrderIds.has(order.id) ? "bg-accent/5" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleSelection(order.id)}
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              selectedOrderIds.has(order.id) ? "bg-accent border-accent text-black" : "border-white/20 hover:border-white/40"
                            }`}
                          >
                            {selectedOrderIds.has(order.id) && <Check size={10} />}
                          </button>
                        </td>

                        {/* Date & Exact Time */}
                        <td className="px-4 py-3 text-xs">
                          <div className="font-semibold text-white">
                            {new Date(order.created_at).toLocaleDateString("fr-FR")}
                          </div>
                          <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                            <Clock size={10} className="text-gray-600" />
                            <span>
                              {new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </td>

                        {/* Customer + Call Button + Yellow Note Badge */}
                        <td className="px-4 py-3">
                          <div className="flex items-baseline gap-2">
                            <button
                              onClick={() => setSelectedDetailOrder(order)}
                              className="text-sm font-bold text-white hover:text-accent text-left transition-colors"
                            >
                              {order.name}
                            </button>
                            <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                              #{order.order_number}
                            </span>
                            {order.source === "meta" && (
                              <span className="text-[9px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                                Meta
                              </span>
                            )}
                            {order.source === "tiktok" && (
                              <span className="text-[9px] font-bold text-pink-400 bg-pink-400/10 px-1.5 py-0.5 rounded">
                                TikTok
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => copyPhone(order.phone)}
                              className="flex items-center gap-1 text-xs text-blue-400 font-mono"
                              dir="ltr"
                            >
                              <span>{order.phone}</span>
                              {copiedPhone === order.phone ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} className="text-gray-600" />
                              )}
                            </button>

                            {/* Direct Call Button (Desktop) */}
                            <a
                              href={`tel:${order.phone}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-[10px] font-bold transition-all"
                              title="Appeler directement"
                            >
                              <PhoneCall size={10} />
                              <span>Appel</span>
                            </a>

                            {phoneCounts[order.phone] > 1 && (
                              <span
                                className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full"
                                title={`${phoneCounts[order.phone]} orders with this phone number`}
                              >
                                {phoneCounts[order.phone]}
                              </span>
                            )}
                          </div>

                          {/* Yellow Note Badge */}
                          {order.note && (
                            <button
                              type="button"
                              onClick={() => setEditingOrder(order)}
                              className="mt-1.5 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/15 border border-amber-400/30 text-amber-200 text-[11px] font-medium hover:bg-amber-400/25 transition-all text-left max-w-[280px]"
                              title="Modifier la note"
                            >
                              <StickyNote size={11} className="text-amber-400 shrink-0" />
                              <span className="truncate">{order.note}</span>
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-300 font-medium">{order.wilaya}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span>{order.commune?.replace(/\s*\[Stopdesk\]/i, "") || "---"}</span>
                            {order.commune?.includes("[Stopdesk]") ? (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                                🏢 Bureau
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">
                                🏠 Domicile
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-200">{order.item}</div>
                          <div className="text-xs text-gray-500">
                            {order.color} · {order.size} · ×{order.quantity}
                          </div>
                          {/* Badges for Autorisation d'ouverture & Delivery Time */}
                          {order.note && (order.note.includes("Autorisation d'ouverture") || order.note.includes("Heure:")) && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              {order.note.includes("Autorisation d'ouverture: OUI") && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 rounded">
                                  🔓 Ouverture OK
                                </span>
                              )}
                              {order.note.match(/Heure:\s*([^\]|]+)/) && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded">
                                  🕒 {order.note.match(/Heure:\s*([^\]|]+)/)?.[1].trim()}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-sm font-bold text-white text-right tabular-nums">
                          {order.total.toLocaleString()} DA
                        </td>

                        {/* Status Dropdown */}
                        <td className="px-4 py-3 text-center">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                            className={`appearance-none bg-transparent outline-none cursor-pointer px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg text-center border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.text}`}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s} className="bg-[#141720] text-white">
                                {statusColors[s]?.label || s}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Shipping */}
                        <td className="px-4 py-3 text-center">
                          {order.tracking_id ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider">
                                Expédié
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono font-bold text-gray-300 bg-white/5 px-2 py-1 rounded">
                                  {order.tracking_id}
                                </span>
                                <button
                                  onClick={() => openDispatchModal(order, "yalidine")}
                                  disabled={pushingId === order.id}
                                  title="Retry Yalidine"
                                  className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={12} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openDispatchModal(order, "ecom")}
                                disabled={pushingId === order.id}
                                className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <Truck size={13} />
                                {pushingId === order.id && dispatchProvider === "ecom" ? "Pushing..." : "Ecom"}
                              </button>
                              <button
                                onClick={() => openDispatchModal(order, "yalidine")}
                                disabled={pushingId === order.id}
                                className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                              >
                                <Truck size={13} />
                                {pushingId === order.id && dispatchProvider === "yalidine" ? "Pushing..." : "Yalidine"}
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Actions: Edit, Details, Delete */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingOrder(order)}
                              title="Modifier la commande"
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setSelectedDetailOrder(order)}
                              title="Détails & Relances"
                              className="p-1.5 text-accent hover:text-accent-hover hover:bg-accent/10 rounded-lg transition-colors"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id, order.tracking_id)}
                              disabled={deletingId === order.id}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredOrders.length > rowsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-600">
              {(currentPage - 1) * rowsPerPage + 1}-
              {Math.min(currentPage * rowsPerPage, filteredOrders.length)} / {filteredOrders.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-white/10 text-gray-500 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs font-bold ${
                    currentPage === i + 1 ? "bg-accent text-black" : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-white/10 text-gray-500 hover:bg-white/5 disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL: EDIT ORDER                                                 */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrder}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ORDER DETAILS & 5 RECALLS TIMELINE                         */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {selectedDetailOrder && (
        <OrderDetailModal
          order={selectedDetailOrder}
          onClose={() => setSelectedDetailOrder(null)}
          onEdit={(ord) => {
            setSelectedDetailOrder(null);
            setEditingOrder(ord);
          }}
          onUpdateRecall={handleTriggerRecall}
          statusColors={statusColors}
        />
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL: YALIDINE / ECOM DISPATCH                                   */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {editingDispatchOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141720] rounded-t-[1.5rem] md:rounded-2xl w-full md:max-w-xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto shadow-2xl p-5 md:p-8 border border-white/5">
            <div className="flex justify-between items-center mb-5 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white font-heading">Confirm Dispatch</h3>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchProvider("ecom");
                      if (!dispatchData.include_delivery) {
                        const newPrice = dispatchData.price + (dispatchData.deliveryFee || 0);
                        setDispatchData({ ...dispatchData, include_delivery: true, price: newPrice });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      dispatchProvider === "ecom" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    🚚 Ecom Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchProvider("yalidine");
                      if (dispatchData.include_delivery) {
                        const newPrice = dispatchData.price - (dispatchData.deliveryFee || 0);
                        setDispatchData({ ...dispatchData, include_delivery: false, price: newPrice });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                      dispatchProvider === "yalidine" ? "bg-rose-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    📦 Yalidine Express
                  </button>
                </div>
              </div>
              <button
                onClick={() => setEditingDispatchOrder(null)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={dispatchData.name}
                    onChange={(e) => setDispatchData({ ...dispatchData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={dispatchData.phone}
                    onChange={(e) => setDispatchData({ ...dispatchData, phone: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Wilaya</label>
                  <select
                    value={dispatchData.wilaya}
                    onChange={(e) => {
                      setDispatchData({ ...dispatchData, wilaya: e.target.value, commune: "" });
                      fetchYalidineCommunes(e.target.value);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer"
                  >
                    <option value="" disabled>
                      Sélectionner Wilaya
                    </option>
                    {algeriaData.wilayas.map((w: { wilaya_id: string; wilaya_name_latin: string }) => (
                      <option key={w.wilaya_id} value={w.wilaya_id} className="bg-[#141720] text-gray-200">
                        {w.wilaya_id} - {w.wilaya_name_latin}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Commune {loadingCommunes && <span className="text-blue-400 text-[10px] animate-pulse ml-1">Loading...</span>}
                    {!loadingCommunes && deliverableCommunes.length > 0 && (
                      <span className="text-emerald-400 text-[10px] ml-1">({deliverableCommunes.length} livrables)</span>
                    )}
                  </label>
                  <select
                    value={dispatchData.commune}
                    onChange={(e) => setDispatchData({ ...dispatchData, commune: e.target.value })}
                    disabled={!dispatchData.wilaya || loadingCommunes}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Sélectionner Commune
                    </option>
                    {deliverableCommunes.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#141720] text-gray-200">
                        {c.name}
                        {c.has_stop_desk ? " 📦" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Detailed Address</label>
                <input
                  type="text"
                  value={dispatchData.address}
                  onChange={(e) => setDispatchData({ ...dispatchData, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Nom du Produit</label>
                <input
                  type="text"
                  value={dispatchData.product_list || ""}
                  onChange={(e) => setDispatchData({ ...dispatchData, product_list: e.target.value })}
                  placeholder="Ex: Ensemble Nocta - Full Black - XL"
                  className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-600"
                />
                <p className="text-[10px] text-gray-500 mt-1">Ce nom sera envoyé comme description du contenu à Yalidine.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Discount</label>
                  <select
                    value={dispatchData.discount ?? 200}
                    onChange={(e) => {
                      const newDiscount = parseInt(e.target.value) || 0;
                      let newPrice = Math.max(0, (dispatchData.originalPrice || 0) - newDiscount);
                      if (dispatchData.include_delivery) newPrice += dispatchData.deliveryFee || 0;
                      setDispatchData({
                        ...dispatchData,
                        discount: newDiscount,
                        price: newPrice,
                      });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer"
                  >
                    <option value="0" className="bg-[#141720]">0 DA</option>
                    <option value="100" className="bg-[#141720]">-100 DA</option>
                    <option value="150" className="bg-[#141720]">-150 DA</option>
                    <option value="200" className="bg-[#141720]">-200 DA</option>
                    <option value="250" className="bg-[#141720]">-250 DA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Product Price</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={dispatchData.price}
                      onChange={(e) => {
                        const newPrice = parseInt(e.target.value) || 0;
                        setDispatchData({ ...dispatchData, price: newPrice });
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono font-bold"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">DA</span>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchData.include_delivery || false}
                      onChange={(e) => {
                        const isIncluded = e.target.checked;
                        let newPrice = Math.max(0, (dispatchData.originalPrice || 0) - (dispatchData.discount || 0));
                        if (isIncluded) newPrice += dispatchData.deliveryFee || 0;
                        setDispatchData({ ...dispatchData, include_delivery: isIncluded, price: newPrice });
                      }}
                      className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-[10px] text-gray-400 font-bold">
                      Inclure Livraison (+{dispatchData.deliveryFee || 0} DA)
                    </span>
                  </label>
                </div>
              </div>

              {/* Valeur Déclarée & Shipping Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    Valeur Déclarée (Assurance)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={!dispatchData.do_insurance}
                      value={dispatchData.declared_value !== undefined ? dispatchData.declared_value : 2000}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setDispatchData({ ...dispatchData, declared_value: val });
                      }}
                      className={`w-full bg-amber-500/10 border border-amber-500/20 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-white font-mono font-bold ${
                        !dispatchData.do_insurance ? "opacity-40 cursor-not-allowed" : ""
                      }`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 text-xs font-bold">DA</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    {dispatchData.do_insurance
                      ? "Par défaut : 2000 DA (modifiable)"
                      : "Désactivée (Assurance = Non, 0 DA de frais)"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shipping Method</label>
                  <select
                    value={dispatchData.is_stopdesk ? "stopdesk" : "home"}
                    onChange={(e) => setDispatchData({ ...dispatchData, is_stopdesk: e.target.value === "stopdesk" })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer"
                  >
                    <option value="home" className="bg-[#141720]">Tarif à domicile</option>
                    <option value="stopdesk" className="bg-[#141720]">Tarif stop-desk</option>
                  </select>
                </div>
              </div>

              {dispatchData.is_stopdesk && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mt-4">
                  <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Stop Desk ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 160001"
                    value={dispatchData.stopdesk_id}
                    onChange={(e) => setDispatchData({ ...dispatchData, stopdesk_id: e.target.value })}
                    className="w-full bg-white/5 border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white"
                  />
                  <p className="text-[10px] text-orange-400 mt-1">Check Yalidine Dashboard for exact Center IDs.</p>
                </div>
              )}

              {/* Option Assurance Yalidine (do_insurance) */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Assurance Colis (Yalidine)
                    </label>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        dispatchData.do_insurance
                          ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      {dispatchData.do_insurance ? "Assurance Active" : "Sans Assurance (0 DA de Frais)"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {dispatchData.do_insurance
                      ? "Assurance appliquée selon la valeur déclarée."
                      : "0 DA de taxe d'assurance prélevée par Yalidine sur votre bordereau."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchData({ ...dispatchData, do_insurance: !dispatchData.do_insurance })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                    dispatchData.do_insurance ? "bg-amber-500" : "bg-gray-600"
                  }`}
                  title={dispatchData.do_insurance ? "Désactiver l'assurance" : "Activer l'assurance"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      dispatchData.do_insurance ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Autorisation d'ouverture */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Autorisation d&apos;ouverture
                    </label>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        dispatchData.autorisation_ouverture
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {dispatchData.autorisation_ouverture ? "Activée par défaut (OUI)" : "Désactivée (NON)"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">Le client peut ouvrir le colis et vérifier le produit avant paiement.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispatchData({ ...dispatchData, autorisation_ouverture: !dispatchData.autorisation_ouverture })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                    dispatchData.autorisation_ouverture ? "bg-emerald-500" : "bg-gray-600"
                  }`}
                  title={dispatchData.autorisation_ouverture ? "Désactiver l'autorisation" : "Activer l'autorisation"}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                      dispatchData.autorisation_ouverture ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Heure de livraison (Optionnel: Activer / Désactiver) */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                        Heure de Livraison (Créneau)
                      </label>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          dispatchData.has_delivery_time
                            ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                            : "bg-gray-500/15 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {dispatchData.has_delivery_time ? "Option Active" : "Optionnel (Désactivé)"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Définir une heure ou un créneau souhaité pour la livraison.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDispatchData({
                        ...dispatchData,
                        has_delivery_time: !dispatchData.has_delivery_time,
                        delivery_time: !dispatchData.has_delivery_time && !dispatchData.delivery_time ? "Matin (09h - 13h)" : dispatchData.delivery_time,
                      })
                    }
                    className={`relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer ${
                      dispatchData.has_delivery_time ? "bg-blue-500" : "bg-gray-600"
                    }`}
                    title={dispatchData.has_delivery_time ? "Désactiver l'heure de livraison" : "Activer l'heure de livraison"}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                        dispatchData.has_delivery_time ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {dispatchData.has_delivery_time && (
                  <div className="pt-2 border-t border-white/5 space-y-2.5">
                    {/* Quick suggestion pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Suggestions :</span>
                      {[
                        "Matin (09h - 13h)",
                        "Après-midi (14h - 18h)",
                        "Fin d'après-midi (17h - 20h)",
                        "Après 16h00",
                        "Avant 12h00",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDispatchData({ ...dispatchData, delivery_time: preset })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            dispatchData.delivery_time === preset
                              ? "bg-blue-500 text-white font-bold shadow-md shadow-blue-500/20"
                              : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    {/* Custom text or time input */}
                    <div>
                      <input
                        type="text"
                        value={dispatchData.delivery_time || ""}
                        onChange={(e) => setDispatchData({ ...dispatchData, delivery_time: e.target.value })}
                        placeholder="Ex: 14h:30, Après 17h, Matin..."
                        className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Aperçu Colis & Bordereau */}
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  <span>Aperçu sur le bordereau & commande :</span>
                  <span className="text-[10px] text-gray-400 font-normal">Visible par le livreur & dashboard</span>
                </div>
                <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 font-mono text-xs text-white space-y-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-gray-400 shrink-0">📦 Produit :</span>
                    <span className="font-bold text-blue-200 break-all">{dispatchData.product_list || "---"}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-white/5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        dispatchData.autorisation_ouverture
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }`}
                    >
                      {dispatchData.autorisation_ouverture ? "🔓 Autorisation d'ouverture : OUI" : "🔒 Autorisation d'ouverture : NON"}
                    </span>

                    {dispatchData.has_delivery_time && dispatchData.delivery_time && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        🕒 Heure : {dispatchData.delivery_time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingDispatchOrder(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchPush}
                disabled={pushingId === editingDispatchOrder.id}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center min-w-[140px] ${
                  dispatchProvider === "ecom" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#e11d48] hover:bg-[#be123c]"
                }`}
              >
                {pushingId === editingDispatchOrder.id
                  ? "Dispatching..."
                  : `Confirm & Send (${dispatchProvider === "ecom" ? "Ecom" : "Yalidine"})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
