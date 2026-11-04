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
  Calendar,
  Filter,
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

interface YalidineParcel {
  tracking: string;
  order_id?: string;
  firstname?: string;
  familyname?: string;
  contact_phone?: string;
  to_wilaya_name?: string;
  to_commune_name?: string;
  product_list?: string;
  price?: number;
  delivery_fee?: number;
  last_status?: string;
  date_last_status?: string;
  date_creation?: string;
  payment_status?: string;
  label?: string;
  reason?: string | null;
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

function normalizeStatus(raw: string = ""): string {
  const s = raw.toLowerCase().trim();

  // 1. "Prêt pour livreur" / Sorti en livraison -> en_livraison (NOT livré!)
  if (
    s.includes("livreur") ||
    s.includes("sorti en livraison") ||
    s.includes("en cours de livraison") ||
    s.includes("en livraison")
  ) {
    return "en_livraison";
  }

  // 2. Echèc livraison and all return stages -> retourne
  if (
    s.includes("retour") ||
    s.includes("returned") ||
    s.includes("echèc") ||
    s.includes("échec") ||
    s.includes("echec") ||
    s.includes("abandonné") ||
    s.includes("abandonne")
  ) {
    return "retourne";
  }

  // 3. Truly Delivered
  if (
    s === "livré" ||
    s === "livre" ||
    s.startsWith("livré") ||
    s.startsWith("livre ") ||
    s.includes("livré payé") ||
    s.includes("livré non payé") ||
    s.includes("delivered")
  ) {
    return "livre";
  }

  // 4. Temporary / Pending
  if (
    s.includes("tentative") ||
    s.includes("alerte") ||
    s.includes("attente") ||
    s.includes("injoignable") ||
    s.includes("reporté")
  ) {
    return "echoue";
  }

  return "expedie";
}

export default function DeliveryStatsPage() {
  const { role, assignedProducts } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [yalidineParcels, setYalidineParcels] = useState<YalidineParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Date Range state
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split("T")[0];
  };

  const [preset, setPreset] = useState<"today" | "yesterday" | "week" | "month" | "all" | "custom">("month");
  const [startDate, setStartDate] = useState<string>(getPastDateStr(30));
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [dateType, setDateType] = useState<"date_creation" | "date_last_status">("date_creation");

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);

  // Handle Preset change
  const applyPreset = (p: "today" | "yesterday" | "week" | "month" | "all" | "custom") => {
    setPreset(p);
    const today = getTodayStr();
    if (p === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (p === "yesterday") {
      const yesterday = getPastDateStr(1);
      setStartDate(yesterday);
      setEndDate(yesterday);
    } else if (p === "week") {
      setStartDate(getPastDateStr(7));
      setEndDate(today);
    } else if (p === "month") {
      setStartDate(getPastDateStr(30));
      setEndDate(today);
    } else if (p === "all") {
      setStartDate("2024-01-01");
      setEndDate(today);
    }
  };

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

  // Sync / Fetch parcels from Yalidine by date range
  const handleFetchYalidineByDate = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncYalidineParcels({
        startDate,
        endDate,
        dateType,
      });

      if (res.success) {
        const found = res.totalParcelsFound || res.parcels?.length || 0;
        const updated = res.updatedOrdersCount || 0;
        setSyncMessage(`✓ Yalidine : ${found} colis trouvés (${startDate} au ${endDate}) · ${updated} commandes mises à jour dans la boutique.`);
        if (Array.isArray(res.parcels)) {
          setYalidineParcels(res.parcels);
        }
        if (updated > 0) {
          await loadData();
        }
      } else {
        setSyncMessage(res.message || "Aucun colis trouvé pour cette période.");
      }
    } catch (err: unknown) {
      setSyncMessage(err instanceof Error ? `Erreur Yalidine : ${err.message}` : "Échec de la récupération.");
    } finally {
      setSyncing(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 1500);
  };

  // Combine Yalidine live parcels with local orders
  const mergedItems = useMemo(() => {
    // If Yalidine parcels were fetched for this range, use them as primary source
    if (yalidineParcels.length > 0) {
      // Index orders for fast O(1) matching instead of O(N*M) nested search
      const ordersByTracking = new Map<string, Order>();
      const ordersByNumber = new Map<string, Order>();

      for (const o of orders) {
        if (o.tracking_id) ordersByTracking.set(o.tracking_id.toLowerCase().trim(), o);
        if (o.order_number) ordersByNumber.set(o.order_number.toString(), o);
      }

      return yalidineParcels.map((p) => {
        const trKey = (p.tracking || "").toLowerCase().trim();
        const numKey = p.order_id ? p.order_id.replace(/[^\d]/g, "") : "";
        const matched = (trKey ? ordersByTracking.get(trKey) : null) || (numKey ? ordersByNumber.get(numKey) : null);

        return {
          id: matched?.id || p.tracking,
          order_number: matched?.order_number || parseInt(p.order_id?.replace(/[^\d]/g, "") || "0", 10) || 0,
          name: matched?.name || `${p.firstname || ""} ${p.familyname || ""}`.trim() || "Client",
          phone: matched?.phone || p.contact_phone || "",
          wilaya: p.to_wilaya_name || matched?.wilaya || "Wilaya",
          commune: p.to_commune_name || matched?.commune || "",
          item: matched?.item || p.product_list || "Colis",
          price: p.price || matched?.price || matched?.total || 0,
          status: normalizeStatus(p.last_status || matched?.status),
          raw_status: p.last_status || matched?.status || "Expédié",
          date_status: p.date_last_status || p.date_creation || matched?.created_at || "",
          tracking_id: p.tracking,
          payment_status: p.payment_status,
          label: p.label || (p.tracking ? `https://yalidine.app/app/bordereau.php?tracking=${p.tracking}` : undefined),
          reason: p.reason || (matched?.note && matched.note.includes("[Yalidine:") ? matched.note : null),
        };
      });
    }

    // Fallback to local dispatched orders filtered by date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return orders
      .filter((o) => {
        const orderDate = new Date(o.created_at);
        const inDate = orderDate >= start && orderDate <= end;
        const isDispatched =
          Boolean(o.tracking_id) ||
          ["expedie", "livre", "retourne", "en_livraison", "echoue"].includes(o.status);
        return inDate && isDispatched;
      })
      .map((o) => ({
        id: o.id,
        order_number: o.order_number,
        name: o.name,
        phone: o.phone,
        wilaya: o.wilaya,
        commune: o.commune,
        item: o.item,
        price: o.total || o.price || 0,
        status: o.status,
        raw_status: STATUS_LABELS[o.status] || o.status,
        date_status: o.created_at,
        tracking_id: o.tracking_id,
        payment_status: o.status === "livre" ? "ready" : "not-ready",
        label: o.tracking_id ? `https://yalidine.app/app/bordereau.php?tracking=${o.tracking_id}` : undefined,
        reason: o.note && o.note.includes("[Yalidine:") ? o.note : null,
      }));
  }, [yalidineParcels, orders, startDate, endDate]);

  // Delivery KPI calculations
  const kpis = useMemo(() => {
    const totalDispatched = mergedItems.length;
    const delivered = mergedItems.filter((o) => o.status === "livre");
    const returned = mergedItems.filter((o) => o.status === "retourne");
    const inDelivery = mergedItems.filter((o) => o.status === "en_livraison");
    const failed = mergedItems.filter((o) => o.status === "echoue");
    const awaitingDispatch = mergedItems.filter((o) => o.status === "expedie");

    const totalDeliveredCount = delivered.length;
    const totalReturnedCount = returned.length;
    const concludedCount = totalDeliveredCount + totalReturnedCount;

    const deliveryRate = concludedCount > 0 ? Math.round((totalDeliveredCount / concludedCount) * 100) : 0;
    const returnRate = concludedCount > 0 ? Math.round((totalReturnedCount / concludedCount) * 100) : 0;

    const deliveredRevenue = delivered.reduce((acc, o) => acc + (o.price || 0), 0);
    const inTransitValue = [...inDelivery, ...awaitingDispatch].reduce((acc, o) => acc + (o.price || 0), 0);

    return {
      totalDispatched,
      totalDeliveredCount,
      totalReturnedCount,
      inDeliveryCount: inDelivery.length,
      failedCount: failed.length,
      deliveryRate,
      returnRate,
      deliveredRevenue,
      inTransitValue,
    };
  }, [mergedItems]);

  // Distribution chart data
  const pieData = useMemo(() => {
    const counts: Record<string, number> = {
      livre: 0,
      en_livraison: 0,
      expedie: 0,
      echoue: 0,
      retourne: 0,
    };

    mergedItems.forEach((o) => {
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
  }, [mergedItems]);

  // Wilaya delivery performance
  const wilayaData = useMemo(() => {
    const stats: Record<string, { total: number; livre: number; retourne: number }> = {};

    mergedItems.forEach((o) => {
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
  }, [mergedItems]);

  // Filtered parcels table
  const displayedParcels = useMemo(() => {
    return mergedItems.filter((o) => {
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
  }, [mergedItems, statusFilter, searchQuery]);

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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-white font-heading">
                Statistiques de Livraison (Yalidine)
              </h1>
              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-bold px-2.5 py-0.5 rounded-full">
                Yalidine API
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Récupération des colis par intervalle de dates, calcul des taux de livraison et retours.
            </p>
          </div>
        </div>

        {/* Date Range Selector Box */}
        <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 space-y-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
            {/* Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mr-1 hidden sm:inline">
                Période :
              </span>
              {[
                { id: "today", label: "Aujourd'hui" },
                { id: "yesterday", label: "Hier" },
                { id: "week", label: "7 jours" },
                { id: "month", label: "30 jours" },
                { id: "all", label: "Tout" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as typeof preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    preset === p.id
                      ? "bg-accent text-black font-bold shadow-md shadow-accent/20"
                      : "bg-white/5 text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Type Selector (date_creation vs date_last_status) */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-medium">Filtrer par :</span>
              <select
                value={dateType}
                onChange={(e) => setDateType(e.target.value as typeof dateType)}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="date_creation" className="bg-surface">
                  Date de création du colis
                </option>
                <option value="date_last_status" className="bg-surface">
                  Date du dernier statut
                </option>
              </select>
            </div>
          </div>

          {/* Date Pickers & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <Calendar size={14} className="text-accent" />
                <span className="text-gray-400">Du :</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPreset("custom");
                  }}
                  className="bg-transparent text-white font-mono font-medium focus:outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                <Calendar size={14} className="text-accent" />
                <span className="text-gray-400">Au :</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPreset("custom");
                  }}
                  className="bg-transparent text-white font-mono font-medium focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={handleFetchYalidineByDate}
              disabled={syncing || !startDate || !endDate}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-accent text-black hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Récupération en cours..." : "Récupérer les Colis (Yalidine)"}
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {syncMessage && (
          <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium flex items-center justify-between shadow-sm">
            <span>{syncMessage}</span>
            <button onClick={() => setSyncMessage(null)} className="text-gray-400 hover:text-white text-xs cursor-pointer ml-3">
              ✕
            </button>
          </div>
        )}

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
              {kpis.totalDeliveredCount + kpis.totalReturnedCount} clôturés
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
              <span className="text-white font-bold">{kpis.totalReturnedCount}</span> retours sur cette période
            </p>
          </div>

          {/* 4. Total Colis Période */}
          <div className="bg-surface rounded-2xl p-4 md:p-5 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Colis Période
              </p>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Package size={16} className="text-purple-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-extrabold text-white tabular-nums">
              {kpis.totalDispatched}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              <span className="text-cyan-400 font-bold">{kpis.inDeliveryCount}</span> en cours ·{" "}
              <span className="text-yellow-400 font-bold">{kpis.failedCount}</span> échecs
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut Chart: Statut des Colis */}
          <div className="bg-surface rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Répartition des Statuts</h3>
              <p className="text-xs text-gray-500 mb-4">Colis de la période sélectionnée</p>
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
                Aucun colis trouvé. Cliquez sur « Récupérer les Colis » pour charger les données.
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
                Aucune donnée géographique pour cet intervalle.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Parcels Table */}
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden shadow-lg">
          {/* Table Header & Search */}
          <div className="p-4 md:p-5 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Truck size={18} className="text-accent" />
              <h2 className="text-base font-bold text-white font-heading">Colis de la Période</h2>
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
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter size={13} className="text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer w-full sm:w-auto"
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
                      Aucun colis trouvé pour cette période. Cliquez sur le bouton bleu ci-dessus pour interroger Yalidine.
                    </td>
                  </tr>
                ) : (
                  displayedParcels.map((p, idx) => {
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
                      <tr key={`${p.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                        {/* Order & Date */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold text-white">
                            {p.order_number ? `#${p.order_number}` : "—"}
                          </span>
                          <div className="text-[10px] text-gray-500">
                            {p.date_status
                              ? new Date(p.date_status).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : ""}
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
                          {(p.price || 0).toLocaleString()} DA
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                            {STATUS_LABELS[p.status] || p.raw_status || p.status}
                          </span>
                          {p.reason && (
                            <p className="text-[9px] text-yellow-500/80 mt-0.5 truncate max-w-[200px]" title={p.reason}>
                              {p.reason.replace(/.*\[Yalidine:\s*/, "").replace(/\].*/, "")}
                            </p>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          {tracking ? (
                            <a
                              href={p.label || `https://yalidine.app/app/bordereau.php?tracking=${tracking}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline cursor-pointer"
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
