"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Trash2, Copy, Check, X, Truck } from "lucide-react";
import { fetchOrders, updateOrderStatus, createHistory } from "@/lib/api";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const rowsPerPage = 10;

  // Yalidine
  const [pushingId, setPushingId] = useState<string | null>(null);
  const [editingDispatchOrder, setEditingDispatchOrder] = useState<Order | null>(null);
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

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone).then(() => {
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 1500);
    });
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.name.includes(searchQuery) || o.phone.includes(searchQuery) || o.wilaya.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
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

  // Yalidine Dispatch
  const openDispatchModal = (order: Order) => {
    setEditingDispatchOrder(order);
    const wilayaMatch = order.wilaya.match(/^(\d+)/);
    const defaultWilayaId = wilayaMatch ? wilayaMatch[1] : "";
    const priceNumber = typeof order.total === "number" ? order.total : parseInt(String(order.total).replace(/[^\d]/g, ""), 10) || 0;

    setDispatchData({
      name: order.name,
      phone: order.phone,
      wilaya: defaultWilayaId || order.wilaya,
      commune: order.commune,
      address: order.commune || "",
      product_list: `${order.item} - ${order.color} - ${order.size}`,
      price: priceNumber,
      do_insurance: true,
      declared_value: priceNumber,
      is_stopdesk: false,
      stopdesk_id: "",
      autorisation_ouverture: false
    });

    // Fetch yalidine communes for this wilaya
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

  const pushToYalidine = async () => {
    if (!editingDispatchOrder) return;
    setPushingId(editingDispatchOrder.id);
    try {
      const res = await fetch("/api/yalidine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: editingDispatchOrder.id, overrides: dispatchData })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to push to Yalidine.");
      } else {
        alert(`Successfully dispatched! Tracking ID: ${data.tracking_id}`);
        setOrders(orders.map(o => o.id === editingDispatchOrder.id ? { ...o, tracking_id: data.tracking_id } : o));
        setEditingDispatchOrder(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error pushing to Yalidine.");
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

      {/* Search + Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-surface border border-white/5 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-300 focus:outline-none appearance-none cursor-pointer uppercase">
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Status Pills */}
      <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl w-fit">
        <button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === "all" ? "bg-accent text-black" : "text-gray-500 hover:text-gray-300"}`}>All</button>
        {STATUS_OPTIONS.map((s) => {
          const colors = statusColors[s];
          return (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize flex items-center gap-1.5 ${statusFilter === s ? `${colors.bg} ${colors.text} border ${colors.border}` : "text-gray-500 hover:text-gray-300"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              {s}
            </button>
          );
        })}
      </div>

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
                      <span className="text-sm font-semibold text-white">{order.name}</span>
                      <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">#{order.order_number}</span>
                    </div>
                    <span className="text-sm font-bold text-white tabular-nums">{order.total.toLocaleString()} DA</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <button onClick={() => copyPhone(order.phone)} className="flex items-center gap-1">
                      <span className="text-[11px] text-blue-400 font-mono" dir="ltr">{order.phone}</span>
                      {copiedPhone === order.phone ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} className="text-gray-700" />}
                    </button>
                    <span className="text-[10px] text-gray-600">{order.wilaya} · {order.size}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select value={order.status} onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className={`flex-1 appearance-none bg-transparent outline-none cursor-pointer px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded text-center border ${(statusColors[order.status] || statusColors.recall).border} ${(statusColors[order.status] || statusColors.recall).text}`}>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="bg-surface text-white">{s}</option>)}
                    </select>
                    {order.tracking_id ? (
                      <span className="text-[9px] font-mono font-bold text-gray-500 bg-white/5 px-1.5 py-1.5 rounded truncate max-w-[80px]">{order.tracking_id}</span>
                    ) : (
                      <button onClick={() => openDispatchModal(order)} disabled={pushingId === order.id}
                        className="px-2 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                        {pushingId === order.id ? "..." : "Yalidine"}
                      </button>
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
                    <tr key={order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-white">{order.name}</span>
                          <span className="text-[10px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">#{order.order_number}</span>
                        </div>
                        <button onClick={() => copyPhone(order.phone)} className="flex items-center gap-1.5 mt-1">
                          <span className="text-xs text-blue-400 font-mono" dir="ltr">{order.phone}</span>
                          {copiedPhone === order.phone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className="text-gray-600" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-300">{order.wilaya}</div>
                        <div className="text-xs text-gray-500">{order.commune}</div>
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
                            <span className="text-xs font-mono font-bold text-gray-300 bg-white/5 px-2 py-1 rounded">{order.tracking_id}</span>
                          </div>
                        ) : (
                          <button onClick={() => openDispatchModal(order)} disabled={pushingId === order.id}
                            className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold rounded-lg hover:bg-rose-500/20 transition-colors flex items-center gap-1.5 mx-auto disabled:opacity-50">
                            <Truck size={13} />
                            {pushingId === order.id ? "Pushing..." : "Send Yalidine"}
                          </button>
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
              <h3 className="text-lg md:text-xl font-bold text-white font-heading">Confirm Dispatch</h3>
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <button onClick={pushToYalidine} disabled={pushingId === editingDispatchOrder.id}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#e11d48] hover:bg-[#be123c] transition-colors flex items-center justify-center min-w-[140px]">
                {pushingId === editingDispatchOrder.id ? "Dispatching..." : "Confirm & Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
