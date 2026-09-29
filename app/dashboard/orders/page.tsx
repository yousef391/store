"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Trash2, Copy, Check, X, Truck, Package, RefreshCw, Calendar } from "lucide-react";
import { fetchOrders, updateOrderStatus, createHistory } from "@/lib/api";
import { products } from "@/data/products";
import algeriaData from "@/data/algeria.json";

const STATUS_OPTIONS = ["new", "confirmed", "cancelled", "recall"] as const;

const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
  recall: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" },
};

interface Order {
  id: string;
  order_number: number;
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
  status: string;
  tracking_id?: string;
  created_at: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("today");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isBulking, setIsBulking] = useState(false);
  const rowsPerPage = 10;

  // Dispatch (Yalidine & Ecom Delivery)
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [editingDispatchOrder, setEditingDispatchOrder] = useState<Order | null>(null);
  const [dispatchProvider, setDispatchProvider] = useState<"ecom" | "yalidine">("ecom");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dispatchData, setDispatchData] = useState<any>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [yalidineCommunes, setYalidineCommunes] = useState<{id: number; name: string; is_deliverable: boolean; has_stop_desk: boolean}[]>([]);
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, productFilter, dateFilter]);

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1500);
    });
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
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.name) set.add(p.name);
    });
    orders.forEach((o) => {
      if (o.item) set.add(o.item);
    });
    return Array.from(set).sort();
  }, [orders]);

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

  const todayCount = useMemo(() => orders.filter(o => new Date(o.created_at) >= startOfToday).length, [orders, startOfToday]);
  const yesterdayCount = useMemo(() => orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= startOfYesterday && d < startOfToday;
  }).length, [orders, startOfYesterday, startOfToday]);

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
      (o.tracking_id && o.tracking_id.toLowerCase().includes(q));

    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesProduct =
      productFilter === "all" ||
      o.item === productFilter ||
      o.item?.toLowerCase().includes(productFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesProduct && matchesDate;
  });

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
      const order = orders.find((o) => o.id === id);
      if (order) {
        await createHistory({ action: `order_${status}`, description: `Order #${order.order_number} marked as ${status} — ${order.name}`, details: order.item });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async (id: string, trackingId?: string | null) => {
    if (!window.confirm("Delete this order?")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/yalidine", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, trackingId })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to delete order");
      }
      setOrders(prev => prev.filter(o => o.id !== id));
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
      setSelectedOrderIds(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const handleBulkStatus = async (status: string) => {
    setIsBulking(true);
    let updated = 0;
    const newOrders = [...orders];
    for (const id of Array.from(selectedOrderIds)) {
      try {
        await updateOrderStatus(id, status);
        const orderIndex = newOrders.findIndex(o => o.id === id);
        if (orderIndex > -1) {
          newOrders[orderIndex].status = status;
          const order = newOrders[orderIndex];
          await createHistory({ action: `order_${status}`, description: `Order #${order.order_number} marked as ${status} (Bulk)`, details: order.item });
        }
        updated++;
      } catch (err) {
        console.error("Bulk status error", err);
      }
    }
    setOrders(newOrders);
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
      const orderIndex = newOrders.findIndex(o => o.id === id);
      if (orderIndex === -1) continue;
      const order = newOrders[orderIndex];
      if (order.tracking_id) continue; // Skip if already dispatched

      const wilayaMatch = order.wilaya.match(/^(\d+)/);
      const defaultWilayaId = wilayaMatch ? wilayaMatch[1] : "";
      const priceNumber = typeof order.price === "number" ? order.price : parseInt(String(order.price).replace(/[^\d]/g, ""), 10) || 0;
      const deliveryNumber = typeof order.delivery === "number" ? order.delivery : parseInt(String(order.delivery).replace(/[^\d]/g, ""), 10) || 0;
      const defaultIncludeDelivery = provider === "ecom";
      let initialPrice = priceNumber > 200 ? priceNumber - 200 : priceNumber;
      if (defaultIncludeDelivery) initialPrice += deliveryNumber;

      const isStopdeskOrder = Boolean(order.commune?.includes("[Stopdesk]") || (order as { delivery_type?: string }).delivery_type === "stopdesk");
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
        do_insurance: true,
        declared_value: initialPrice,
        is_stopdesk: isStopdeskOrder,
        stopdesk_id: "",
        autorisation_ouverture: false,
        forceRetry: true
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id, overrides: dispatchData })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          failed++;
        } else {
          newOrders[orderIndex].tracking_id = data.tracking_id;
          newOrders[orderIndex].status = "confirmed";
          await updateOrderStatus(order.id, "confirmed");
          await createHistory({ 
            action: "order_confirmed", 
            description: `Order #${order.order_number} auto-confirmed on dispatch to ${provider} (Bulk)`, 
            details: order.item 
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
      const order = currentOrders.find(o => o.id === id);
      if (!order) continue;
      try {
        const res = await fetch("/api/yalidine", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id, trackingId: order.tracking_id })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          failed++;
        } else {
          currentOrders = currentOrders.filter(o => o.id !== id);
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

    const isStopdeskOrder = Boolean(order.commune?.includes("[Stopdesk]") || (order as { delivery_type?: string }).delivery_type === "stopdesk");
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
      do_insurance: true,
      declared_value: initialPrice,
      is_stopdesk: isStopdeskOrder,
      stopdesk_id: "",
      autorisation_ouverture: false,
      forceRetry: true
    });

    // Fetch yalidine communes for this wilaya if using Yalidine
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

  const deliverableCommunes = yalidineCommunes.filter(c => c.is_deliverable);

  const handleDispatchPush = async () => {
    if (!editingDispatchOrder) return;
    setPushingId(editingDispatchOrder.id);
    const endpoint = dispatchProvider === "ecom" ? "/api/ecom" : "/api/yalidine";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: editingDispatchOrder.id, overrides: dispatchData })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || `Failed to push to ${dispatchProvider === "ecom" ? "Ecom Delivery" : "Yalidine"}.`);
      } else {
        alert(`Successfully dispatched to ${dispatchProvider === "ecom" ? "Ecom Delivery" : "Yalidine"}! Tracking ID: ${data.tracking_id}`);
        
        // Update local state for tracking ID and status
        setOrders(orders.map(o => o.id === editingDispatchOrder.id ? { ...o, tracking_id: data.tracking_id, status: "confirmed" } : o));
        
        // Auto-confirm in the background
        updateOrderStatus(editingDispatchOrder.id, "confirmed").catch(console.error);
        createHistory({ 
          action: "order_confirmed", 
          description: `Order #${editingDispatchOrder.order_number} auto-confirmed on dispatch to ${dispatchProvider}`, 
          details: editingDispatchOrder.item 
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
    <div className="flex flex-col gap-4 lg:gap-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">{filteredOrders.length} results</p>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Today's Orders</p>
          <p className="text-2xl font-black text-white">{todayCount}</p>
        </div>
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Yesterday's Orders</p>
          <p className="text-2xl font-black text-white">{yesterdayCount}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            placeholder="Search by customer, phone, wilaya, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-surface border border-white/5 rounded-xl pl-8 pr-8 py-2.5 text-xs font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none cursor-pointer hover:border-white/10 transition-colors"
          >
            <option value="today" className="bg-[#141720] text-gray-200">This Day</option>
            <option value="yesterday" className="bg-[#141720] text-gray-200">Yesterday</option>
            <option value="week" className="bg-[#141720] text-gray-200">This Week</option>
            <option value="month" className="bg-[#141720] text-gray-200">This Month</option>
            <option value="all" className="bg-[#141720] text-gray-200">All Time</option>
          </select>
          <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-500 pointer-events-none" />
        </div>

        {/* Product Filter Dropdown */}
        <div className="relative">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full sm:w-auto bg-surface border border-white/5 rounded-xl pl-8 pr-8 py-2.5 text-xs font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/50 appearance-none cursor-pointer hover:border-white/10 transition-colors"
          >
            <option value="all" className="bg-[#141720] text-gray-200">
              All Products ({orders.length})
            </option>
            {productOptions.map((p) => (
              <option key={p} value={p} className="bg-[#141720] text-gray-200">
                {p} {productCounts[p] ? `(${productCounts[p]})` : "(0)"}
              </option>
            ))}
          </select>
          <Package size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <ChevronRight size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-500 pointer-events-none" />
        </div>

        {/* Status Dropdown (Mobile only) */}
        <div className="relative md:hidden">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-surface border border-white/5 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer uppercase"
          >
            <option value="all" className="bg-[#141720]">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} className="bg-[#141720]">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Pills & Active Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === "all" ? "bg-accent text-black" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            All
          </button>
          {STATUS_OPTIONS.map((s) => {
            const colors = statusColors[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${
                  statusFilter === s ? `${colors.bg} ${colors.text} border ${colors.border}` : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                {s}
              </button>
            );
          })}
        </div>

        {/* Reset Active Filters Button */}
        {(productFilter !== "all" || statusFilter !== "all" || searchQuery) && (
          <button
            onClick={() => {
              setProductFilter("all");
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
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
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => handleBulkDispatch("ecom")} disabled={isBulking} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
              {isBulking ? "Pushing..." : "Push Ecom"}
            </button>
            <button onClick={() => handleBulkDispatch("yalidine")} disabled={isBulking} className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-lg hover:bg-rose-500/20 transition-colors disabled:opacity-50">
              {isBulking ? "Pushing..." : "Push Yalidine"}
            </button>
            <button onClick={handleBulkDelete} disabled={isBulking} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center gap-1">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {paginatedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <Filter className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No orders found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-1.5 p-2">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-white/[0.03] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleSelection(order.id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedOrderIds.has(order.id) ? "bg-accent border-accent text-black" : "border-white/20 hover:border-white/40"}`}>
                        {selectedOrderIds.has(order.id) && <Check size={10} />}
                      </button>
                      <span className="text-sm font-semibold text-white">{order.name}</span>
                      <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">#{order.order_number}</span>
                    </div>
                    <span className="text-sm font-bold text-white tabular-nums">{order.total.toLocaleString()} DA</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => copyPhone(order.phone)} className="flex items-center gap-1">
                      <span className="text-[11px] text-blue-400 font-mono" dir="ltr">{order.phone}</span>
                      {copiedPhone === order.phone ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-gray-700" />}
                      {phoneCounts[order.phone] > 1 && (
                        <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full ml-1" title={`${phoneCounts[order.phone]} orders with this phone number`}>
                          {phoneCounts[order.phone]}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600">{order.wilaya} · {order.size}</span>
                      {order.commune?.includes("[Stopdesk]") ? (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 py-0.2 rounded">🏢 Stopdesk</span>
                      ) : (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1 py-0.2 rounded">🏠 Domicile</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select value={order.status} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className={`flex-1 appearance-none bg-transparent outline-none cursor-pointer px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded text-center border ${(statusColors[order.status] || statusColors.recall).border} ${(statusColors[order.status] || statusColors.recall).text}`}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="bg-surface text-white">{s}</option>)}
                    </select>
                    {order.tracking_id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-mono font-bold text-gray-500 bg-white/5 px-1.5 py-1.5 rounded truncate max-w-[80px]">{order.tracking_id}</span>
                        <button onClick={() => openDispatchModal(order, "ecom")} disabled={pushingId === order.id} title="Retry Ecom" className="p-1 bg-white/5 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 rounded transition-colors disabled:opacity-50">
                          <RefreshCw size={10} />
                        </button>
                        <button onClick={() => openDispatchModal(order, "yalidine")} disabled={pushingId === order.id} title="Retry Yalidine" className="p-1 bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 rounded transition-colors disabled:opacity-50">
                          <RefreshCw size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDispatchModal(order, "ecom")} disabled={pushingId === order.id}
                          className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                          Ecom
                        </button>
                        <button onClick={() => openDispatchModal(order, "yalidine")} disabled={pushingId === order.id}
                          className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                          Yalidine
                        </button>
                      </div>
                    )}
                    <button onClick={() => handleDelete(order.id, order.tracking_id)} disabled={deletingId === order.id} className="p-1.5 bg-white/5 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded transition-colors disabled:opacity-50">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3 w-10">
                      <button onClick={toggleAll} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0 ? "bg-accent border-accent text-black" : "border-white/20 hover:border-white/40"}`}>
                        {selectedOrderIds.size === paginatedOrders.length && paginatedOrders.length > 0 && <Check size={10} />}
                      </button>
                    </th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Shipping</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${selectedOrderIds.has(order.id) ? "bg-accent/5" : ""}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelection(order.id)} className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedOrderIds.has(order.id) ? "bg-accent border-accent text-black" : "border-white/20 hover:border-white/40"}`}>
                          {selectedOrderIds.has(order.id) && <Check size={10} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-white">{order.name}</span>
                          <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">#{order.order_number}</span>
                        </div>
                        <button onClick={() => copyPhone(order.phone)} className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-blue-400 font-mono" dir="ltr">{order.phone}</span>
                          {copiedPhone === order.phone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gray-600" />}
                          {phoneCounts[order.phone] > 1 && (
                            <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded-full ml-1" title={`${phoneCounts[order.phone]} orders with this phone number`}>
                              {phoneCounts[order.phone]}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-300">{order.wilaya}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span>{order.commune?.replace(/\s*\[Stopdesk\]/i, "") || "---"}</span>
                          {order.commune?.includes("[Stopdesk]") ? (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">🏢 Bureau</span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">🏠 Domicile</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-200">{order.item}</div>
                        <div className="text-xs text-gray-500">{order.color} · {order.size} · ×{order.quantity}</div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-white text-right tabular-nums">{order.total.toLocaleString()} DA</td>
                      <td className="px-4 py-3 text-center">
                        <select value={order.status} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className={`appearance-none bg-transparent outline-none cursor-pointer px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg text-center border ${(statusColors[order.status] || statusColors.recall).bg} ${(statusColors[order.status] || statusColors.recall).border} ${(statusColors[order.status] || statusColors.recall).text}`}>
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="bg-surface text-white">{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.tracking_id ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Tracking</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono font-bold text-gray-300 bg-white/5 px-2 py-1 rounded">{order.tracking_id}</span>
                              <button onClick={() => openDispatchModal(order, "ecom")} disabled={pushingId === order.id} title="Retry Ecom" className="p-1.5 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50">
                                <RefreshCw size={12} />
                              </button>
                              <button onClick={() => openDispatchModal(order, "yalidine")} disabled={pushingId === order.id} title="Retry Yalidine" className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50">
                                <RefreshCw size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openDispatchModal(order, "ecom")} disabled={pushingId === order.id}
                              className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
                              <Truck size={13} />
                              {pushingId === order.id && dispatchProvider === "ecom" ? "Pushing..." : "Ecom"}
                            </button>
                            <button onClick={() => openDispatchModal(order, "yalidine")} disabled={pushingId === order.id}
                              className="px-2.5 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1 disabled:opacity-50">
                              <Truck size={13} />
                              {pushingId === order.id && dispatchProvider === "yalidine" ? "Pushing..." : "Yalidine"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(order.id, order.tracking_id)} disabled={deletingId === order.id}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredOrders.length > rowsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-600">{(currentPage - 1) * rowsPerPage + 1}-{Math.min(currentPage * rowsPerPage, filteredOrders.length)} / {filteredOrders.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded border border-white/10 text-gray-500 hover:bg-white/5 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-7 h-7 rounded text-xs font-bold ${currentPage === i + 1 ? "bg-accent text-black" : "text-gray-600 hover:text-gray-400"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded border border-white/10 text-gray-500 hover:bg-white/5 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Yalidine Dispatch Modal */}
      {editingDispatchOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141720] rounded-t-[1.5rem] md:rounded-2xl w-full md:max-w-xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto shadow-2xl p-5 md:p-8 border border-white/5">
            <div className="flex justify-between items-center mb-5 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white font-heading">Confirm Dispatch</h3>
                <div className="flex items-center gap-2 mt-2">
                  <button type="button" onClick={() => {
                      setDispatchProvider("ecom");
                      if (!dispatchData.include_delivery) {
                        const newPrice = dispatchData.price + (dispatchData.deliveryFee || 0);
                        setDispatchData({ ...dispatchData, include_delivery: true, price: newPrice, declared_value: newPrice });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${dispatchProvider === "ecom" ? "bg-emerald-500 text-black" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                    🚚 Ecom Delivery
                  </button>
                  <button type="button" onClick={() => {
                      setDispatchProvider("yalidine");
                      if (dispatchData.include_delivery) {
                        const newPrice = dispatchData.price - (dispatchData.deliveryFee || 0);
                        setDispatchData({ ...dispatchData, include_delivery: false, price: newPrice, declared_value: newPrice });
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${dispatchProvider === "yalidine" ? "bg-rose-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"}`}>
                    📦 Yalidine Express
                  </button>
                </div>
              </div>
              <button onClick={() => setEditingDispatchOrder(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Customer Name</label>
                  <input type="text" value={dispatchData.name} onChange={e => setDispatchData({...dispatchData, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Phone</label>
                  <input type="text" value={dispatchData.phone} onChange={e => setDispatchData({...dispatchData, phone: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" dir="ltr" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Wilaya</label>
                  <select value={dispatchData.wilaya} onChange={(e) => { setDispatchData({ ...dispatchData, wilaya: e.target.value, commune: "" }); fetchYalidineCommunes(e.target.value); }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer">
                    <option value="" disabled>Sélectionner Wilaya</option>
                    {algeriaData.wilayas.map((w: { wilaya_id: string; wilaya_name_latin: string }) => (
                      <option key={w.wilaya_id} value={w.wilaya_id} className="bg-[#141720] text-gray-200">{w.wilaya_id} - {w.wilaya_name_latin}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Commune {loadingCommunes && <span className="text-blue-400 text-[10px] animate-pulse ml-1">Loading...</span>}
                    {!loadingCommunes && deliverableCommunes.length > 0 && <span className="text-emerald-400 text-[10px] ml-1">({deliverableCommunes.length} livrables)</span>}
                  </label>
                  <select value={dispatchData.commune} onChange={(e) => setDispatchData({ ...dispatchData, commune: e.target.value })}
                    disabled={!dispatchData.wilaya || loadingCommunes}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer disabled:opacity-50">
                    <option value="" disabled>Sélectionner Commune</option>
                    {deliverableCommunes.map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#141720] text-gray-200">{c.name}{c.has_stop_desk ? " 📦" : ""}</option>
                    ))}
                  </select>
                  {dispatchData.commune && yalidineCommunes.length > 0 && !yalidineCommunes.find(c => c.name === dispatchData.commune && c.is_deliverable) && (
                    <p className="text-[10px] text-red-400 mt-1 font-bold">⚠️ Cette commune n&apos;est pas livrable par Yalidine. Choisissez une autre.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Detailed Address</label>
                <input type="text" value={dispatchData.address} onChange={e => setDispatchData({...dispatchData, address: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white" />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Nom du Produit</label>
                <input type="text" value={dispatchData.product_list || ""} onChange={e => setDispatchData({...dispatchData, product_list: e.target.value})}
                  placeholder="Ex: Ensemble Nocta - Full Black - XL"
                  className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-600" />
                <p className="text-[10px] text-gray-500 mt-1">Ce nom sera envoyé comme description du contenu à Yalidine.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Discount</label>
                  <select value={dispatchData.discount ?? 200} onChange={e => {
                    const newDiscount = parseInt(e.target.value) || 0;
                    let newPrice = Math.max(0, (dispatchData.originalPrice || 0) - newDiscount);
                    if (dispatchData.include_delivery) newPrice += (dispatchData.deliveryFee || 0);
                    setDispatchData({
                      ...dispatchData, 
                      discount: newDiscount,
                      price: newPrice,
                      declared_value: newPrice
                    });
                  }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer">
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
                    <input type="number" value={dispatchData.price} onChange={e => {
                      const newPrice = parseInt(e.target.value) || 0;
                      setDispatchData({...dispatchData, price: newPrice, declared_value: newPrice});
                    }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono font-bold" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">DA</span>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={dispatchData.include_delivery || false} onChange={e => {
                      const isIncluded = e.target.checked;
                      let newPrice = Math.max(0, (dispatchData.originalPrice || 0) - (dispatchData.discount || 0));
                      if (isIncluded) newPrice += (dispatchData.deliveryFee || 0);
                      setDispatchData({...dispatchData, include_delivery: isIncluded, price: newPrice, declared_value: newPrice});
                    }} className="rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500" />
                    <span className="text-[10px] text-gray-400 font-bold">Inclure Livraison (+{dispatchData.deliveryFee || 0} DA)</span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dépasse 5kg?</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-500 font-medium cursor-not-allowed">Non, 1 KG</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Insurance</label>
                  <select value={dispatchData.do_insurance ? "yes" : "no"} onChange={e => setDispatchData({...dispatchData, do_insurance: e.target.value === "yes"})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer">
                    <option value="yes" className="bg-[#141720]">Yes (0% fee)</option>
                    <option value="no" className="bg-[#141720]">No</option>
                  </select>
                </div>
              </div>

              {dispatchData.do_insurance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Declared Value</label>
                    <div className="relative">
                      <input type="number" value={dispatchData.declared_value} onChange={e => setDispatchData({...dispatchData, declared_value: parseInt(e.target.value) || 0})}
                        className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono font-bold" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">DA</span>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-1">Full refund on this value if lost.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Shipping Method</label>
                  <select value={dispatchData.is_stopdesk ? "stopdesk" : "home"} onChange={e => setDispatchData({...dispatchData, is_stopdesk: e.target.value === "stopdesk"})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white appearance-none cursor-pointer">
                    <option value="home" className="bg-[#141720]">Tarif à domicile</option>
                    <option value="stopdesk" className="bg-[#141720]">Tarif stop-desk</option>
                  </select>
                </div>
              </div>

              {dispatchData.is_stopdesk && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl mt-4">
                  <label className="block text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">Stop Desk ID</label>
                  <input type="text" placeholder="e.g. 160001" value={dispatchData.stopdesk_id} onChange={e => setDispatchData({...dispatchData, stopdesk_id: e.target.value})}
                    className="w-full bg-white/5 border border-orange-500/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-white" />
                  <p className="text-[10px] text-orange-400 mt-1">Check Yalidine Dashboard for exact Center IDs.</p>
                </div>
              )}

              {/* Autorisation d'ouverture */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Autorisation d&apos;ouverture</label>
                  <p className="text-[10px] text-gray-500 mt-0.5">Le client peut ouvrir le colis avant paiement.</p>
                </div>
                <button type="button" onClick={() => setDispatchData({...dispatchData, autorisation_ouverture: !dispatchData.autorisation_ouverture})}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${dispatchData.autorisation_ouverture ? "bg-emerald-500" : "bg-gray-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${dispatchData.autorisation_ouverture ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditingDispatchOrder(null)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleDispatchPush} disabled={pushingId === editingDispatchOrder.id}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center min-w-[140px] ${dispatchProvider === "ecom" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#e11d48] hover:bg-[#be123c]"}`}>
                {pushingId === editingDispatchOrder.id ? "Dispatching..." : `Confirm & Send (${dispatchProvider === "ecom" ? "Ecom" : "Yalidine"})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
