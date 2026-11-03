"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Package,
  Truck,
  RotateCcw,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { fetchOrders, syncYalidineParcels } from "@/lib/api";
import { useAuth } from "@/components/dashboard/AuthGuard";
import { matchesAssignedProduct } from "@/lib/auth";
import RoleGuard from "@/components/dashboard/RoleGuard";

interface Order {
  id: string;
  order_number: number;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  item: string;
  price: number;
  total: number;
  status: string;
  tracking_id?: string;
  created_at: string;
  note?: string | null;
}

const PIE_COLORS: Record<string, string> = {
  livre: "#10b981", // Emerald
  en_livraison: "#06b6d4", // Cyan
  expedie: "#8b5cf6", // Purple
  echoue: "#f59e0b", // Amber
  retourne: "#f43f5e", // Rose
};

const STATUS_LABELS: Record<string, string> = {
  livre: "Livré",
  en_livraison: "En livraison",
  expedie: "Expédié",
  echoue: "Échec tentative",
  retourne: "Retourné",
};

export default function DeliveryStatsPage() {
  const { role, assignedProducts } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<"today" | "yesterday" | "week" | "month" | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  const loadData = useCallback(async () => {
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
    }
  }, [role, assignedProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSyncWithYalidine = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncYalidineParcels();
      if (res.success) {
        setSyncMessage(`✓ Synchronisé avec succès : ${res.updated} colis mis à jour sur ${res.synced} vérifiés.`);
        await loadData();
      } else {
        setSyncMessage(res.message || "Aucune mise à jour détectée.");
      }
    } catch (err: unknown) {
      setSyncMessage(err instanceof Error ? `Erreur : ${err.message}` : "Échec de la synchronisation.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 1500);
  };

  // Filter orders by date range
  const dateFilteredOrders = useMemo(() => {
    if (dateFilter === "all") return orders;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter((o) => {
      const orderDate = new Date(o.created_at);
      if (dateFilter === "today") {
        return orderDate >= startOfToday;
      }
      if (dateFilter === "yesterday") {
        const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
        return orderDate >= startOfYesterday && orderDate < startOfToday;
      }
      if (dateFilter === "week") {
        const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= startOfWeek;
      }
      if (dateFilter === "month") {
        const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= startOfMonth;
      }
      return true;
    });
  }, [orders, dateFilter]);

  // Dispatched parcels only (those with a tracking_id or marked expedie/livre/retourne/en_livraison/echoue)
  const dispatchedOrders = useMemo(() => {
    return dateFilteredOrders.filter(
      (o) =>
        Boolean(o.tracking_id) ||
        o.status === "expedie" ||
        o.status === "livre" ||
        o.status === "retourne" ||
        o.status === "en_livraison" ||
        o.status === "echoue"
    );
  }, [dateFilteredOrders]);

  // Delivery KPI calculations
  const kpis = useMemo(() => {
    const totalDispatched = dispatchedOrders.length;
    const delivered = dispatchedOrders.filter((o) => o.status === "livre");
    const returned = dispatchedOrders.filter((o) => o.status === "retourne");
    const inDelivery = dispatchedOrders.filter((o) => o.status === "en_livraison");
    const failed = dispatchedOrders.filter((o) => o.status === "echoue");
    const awaitingDispatch = dispatchedOrders.filter((o) => o.status === "expedie");

    const totalDeliveredCount = delivered.length;
    const totalReturnedCount = returned.length;

    // Concluded orders (delivered + returned)
    const concludedCount = totalDeliveredCount + totalReturnedCount;
    const deliveryRate = concludedCount > 0 ? Math.round((totalDeliveredCount / concludedCount) * 100) : 0;
    const returnRate = concludedCount > 0 ? Math.round((totalReturnedCount / concludedCount) * 100) : 0;

    // Financial COD Metrics
    const deliveredRevenue = delivered.reduce((acc, o) => acc + (o.total || o.price || 0), 0);
    const inTransitValue = [...inDelivery, ...awaitingDispatch].reduce(
      (acc, o) => acc + (o.total || o.price || 0),
      0
    );

    return {
      totalDispatched,
      totalDeliveredCount,
      totalReturnedCount,
      inDeliveryCount: inDelivery.length,
      failedCount: failed.length,
      awaitingDispatchCount: awaitingDispatch.length,
      deliveryRate,
      returnRate,
      deliveredRevenue,
      inTransitValue,
    };
  }, [dispatchedOrders]);

  // Distribution chart data
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {
      livre: 0,
      en_livraison: 0,
      expedie: 0,
      echoue: 0,
      retourne: 0,
    };

    dispatchedOrders.forEach((o) => {
      if (o.status in counts) {
        counts[o.status]++;
      } else {
        counts.expedie++;
      }
    });

    return Object.entries(counts)
      .filter(([, val]) => val > 0)
      .map(([key, val]) => ({
        key,
        name: STATUS_LABELS[key] || key,
        value: val,
        color: PIE_COLORS[key] || "#666",
      }));
  }, [dispatchedOrders]);

  // Wilaya delivery performance
  const wilayaData = useMemo(() => {
    const stats: Record<string, { total: number; livre: number; retourne: number }> = {};

    dispatchedOrders.forEach((o) => {
      const cleanWilaya = o.wilaya?.replace(/^\d+\s*[-–]\s*/, "") || "Autre";
      if (!stats[cleanWilaya]) {
        stats[cleanWilaya] = { total: 0, livre: 0, retourne: 0 };
      }
      stats[cleanWilaya].total++;
      if (o.status === "livre") stats[cleanWilaya].livre++;
      if (o.status === "retourne") stats[cleanWilaya].retourne++;
    });

    return Object.entries(stats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 7)
      .map(([wilaya, data]) => ({
        name: wilaya,
        Total: data.total,
        Livrés: data.livre,
        Retours: data.retourne,
      }));
  }, [dispatchedOrders]);

  // Filtered parcels table
  const displayedParcels = useMemo(() => {
    return dispatchedOrders.filter((o) => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        o.order_number?.toString().includes(q) ||
        o.name?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.tracking_id?.toLowerCase().includes(q) ||
        o.wilaya?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [dispatchedOrders, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "sub_admin"]}>
      <div className="flex flex-col gap-6 max-w-7xl pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white font-heading">
                Statistiques de Livraison (Yalidine)
              </h1>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                Yalidine Live
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Suivi en temps réel des performances de livraison, taux d&apos;encaissement et retours colis.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSyncWithYalidine}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent text-black hover:bg-accent/90 transition-all shadow-lg shadow-accent/15 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Synchronisation..." : "Synchroniser avec Yalidine"}
            </button>
          </div>
        </div>

        {/* Sync message banner */}
        {syncMessage && (
          <div className="p-3.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium flex items-center justify-between animate-fade-in">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-gray-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* Date Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-surface border border-white/5 rounded-xl w-fit overflow-x-auto max-w-full">
          {[
            { id: "all", label: "Tout l'historique" },
            { id: "today", label: "Aujourd'hui" },
            { id: "yesterday", label: "Hier" },
            { id: "week", label: "7 derniers jours" },
            { id: "month", label: "30 derniers jours" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id as typeof dateFilter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                dateFilter === tab.id ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* 1. Taux de Livraison */}
          <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                Taux de Livraison
              </p>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-emerald-400 tabular-nums">
              {kpis.deliveryRate}%
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              <span className="text-white font-bold">{kpis.totalDeliveredCount}</span> livrés sur{" "}
              {kpis.totalDeliveredCount + kpis.totalReturnedCount} colis clôturés
            </p>
          </div>

          {/* 2. Total Encaissé (COD) */}
          <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                Revenu Livré & Encaissé
              </p>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp size={16} className="text-accent" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-extrabold text-white tabular-nums">
              {kpis.deliveredRevenue.toLocaleString()} <span className="text-xs text-accent font-bold">DA</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              En transit : <span className="text-cyan-400 font-medium">{kpis.inTransitValue.toLocaleString()} DA</span>
            </p>
          </div>

          {/* 3. Taux de Retour */}
          <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                Taux de Retour
              </p>
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <RotateCcw size={16} className="text-rose-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-rose-400 tabular-nums">
              {kpis.returnRate}%
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              <span className="text-white font-bold">{kpis.totalReturnedCount}</span> colis retournés au total
            </p>
          </div>

          {/* 4. Total Colis Expédiés */}
          <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                Colis Expédiés
              </p>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package size={16} className="text-purple-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
              {kpis.totalDispatched}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              <span className="text-cyan-400 font-bold">{kpis.inDeliveryCount}</span> en livraison ·{" "}
              <span className="text-yellow-400 font-bold">{kpis.failedCount}</span> échecs
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut Chart: Statut des Colis */}
          <div className="bg-surface rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Répartition des Colis</h3>
              <p className="text-xs text-gray-500 mb-4">Statuts des expéditions Yalidine</p>
            </div>

            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#141720",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap justify-center gap-2.5 mt-2">
                  {pieData.map((p) => (
                    <div key={p.key} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                      <span>
                        {p.name} : <strong className="text-white">{p.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500 text-xs">
                Aucune expédition enregistrée pour cette période.
              </div>
            )}
          </div>

          {/* Bar Chart: Performance par Wilaya */}
          <div className="lg:col-span-2 bg-surface rounded-2xl p-5 border border-white/5">
            <h3 className="text-sm font-bold text-white mb-1">Performance par Wilaya</h3>
            <p className="text-xs text-gray-500 mb-4">Volume total, colis livrés et retours par région</p>

            {wilayaData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={wilayaData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#141720",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="Livrés" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Retours" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500 text-xs">
                Aucune donnée géographique disponible.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Parcels Table */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
          {/* Table Controls */}
          <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-accent" />
              <h2 className="text-base font-bold text-white font-heading">Suivi Détaillé des Colis</h2>
              <span className="text-xs text-gray-500 font-mono">({displayedParcels.length})</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Recherche n°, client, tracking..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="all" className="bg-surface">Tous les statuts</option>
                <option value="livre" className="bg-surface">🟢 Livrés</option>
                <option value="en_livraison" className="bg-surface">🔵 En cours de livraison</option>
                <option value="echoue" className="bg-surface">🟡 Échecs tentatives</option>
                <option value="retourne" className="bg-surface">🔴 Retournés</option>
                <option value="expedie" className="bg-surface">🟣 Expédiés</option>
              </select>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Commande</th>
                  <th className="py-3 px-4">Client & Wilaya</th>
                  <th className="py-3 px-4">Numéro Tracking</th>
                  <th className="py-3 px-4">Montant COD</th>
                  <th className="py-3 px-4">Statut Yalidine</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayedParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">
                      Aucun colis ne correspond à ces critères.
                    </td>
                  </tr>
                ) : (
                  displayedParcels.map((p) => {
                    const tracking = p.tracking_id;
                    const statusClass =
                      p.status === "livre"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : p.status === "retourne"
                        ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                        : p.status === "en_livraison"
                        ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        : p.status === "echoue"
                        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                        : "bg-purple-500/15 text-purple-300 border-purple-500/30";

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Order & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-white">#{p.order_number}</span>
                          <div className="text-[10px] text-gray-500">
                            {new Date(p.created_at).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white truncate max-w-[150px]">{p.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {p.wilaya} {p.commune ? `(${p.commune})` : ""}
                          </p>
                        </td>

                        {/* Tracking */}
                        <td className="py-3.5 px-4 font-mono">
                          {tracking ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-accent font-bold">{tracking}</span>
                              <button
                                onClick={() => copyText(tracking)}
                                title="Copier le tracking"
                                className="text-gray-500 hover:text-white p-0.5 cursor-pointer"
                              >
                                {copiedTracking === tracking ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-600 italic">Pas de tracking</span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3.5 px-4 font-bold text-white font-mono">
                          {(p.total || p.price || 0).toLocaleString()} DA
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                          {p.note && p.note.includes("[Yalidine:") && (
                            <p className="text-[9px] text-yellow-500/80 mt-0.5 truncate max-w-[200px]" title={p.note}>
                              {p.note.replace(/.*\[Yalidine:\s*/, "").replace(/\].*/, "")}
                            </p>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          {tracking ? (
                            <a
                              href={`https://yalidine.app/app/bordereau.php?tracking=${tracking}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                            >
                              Bordereau <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
