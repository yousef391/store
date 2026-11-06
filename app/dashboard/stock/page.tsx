"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Boxes,
  Search,
  RefreshCw,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  XCircle,
  Layers,
  Save,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";
import { useAuth } from "@/components/dashboard/AuthGuard";
import { matchesAssignedProduct } from "@/lib/auth";
import {
  fetchProductsWithStock,
  saveProductSizeStock,
  type ProductStock,
} from "@/lib/stock";

export default function StockPage() {
  const { role, assignedProducts, userEmail } = useAuth();
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"active" | "low_stock" | "all">("active");

  // Selected product being edited
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Editable state for selected product
  const [editingSizeStock, setEditingSizeStock] = useState<Record<string, number>>({});
  const [editingSizes, setEditingSizes] = useState<string[]>([]);
  const [editingStatus, setEditingStatus] = useState<string>("active");
  const [newSizeInput, setNewSizeInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Recent stock logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);

  // Load products and stock
  const loadData = useCallback(async () => {
    try {
      const data = await fetchProductsWithStock();
      let list = data || [];

      // Filter for sub-admin if assigned products are configured
      if (role === "sub_admin" && assignedProducts && assignedProducts.length > 0) {
        list = list.filter((p) => matchesAssignedProduct(p.name, assignedProducts));
      }

      setProducts(list);

      // Default select the first active product, or the first product
      if (list.length > 0) {
        setSelectedProductId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          const activeProd = list.find((p) => p.status === "active");
          return activeProd ? activeProd.id : list[0].id;
        });
      }

      // Fetch recent stock logs
      try {
        const res = await fetch("/api/stock");
        const json = await res.json();
        if (json.logs && Array.isArray(json.logs)) {
          setLogs(json.logs);
        }
      } catch {
        // Ignore logs fetch error
      }
    } catch (err) {
      console.error("Failed to load stock data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, assignedProducts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active selected product
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Sync editor state when selected product changes
  useEffect(() => {
    if (selectedProduct) {
      setEditingSizeStock({ ...selectedProduct.size_stock });
      setEditingSizes([...selectedProduct.sizes]);
      setEditingStatus(selectedProduct.status);
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [selectedProduct]);

  // Compute live total for the editor
  const liveTotalStock = useMemo(() => {
    return Object.values(editingSizeStock).reduce(
      (sum, qty) => sum + Math.max(0, Number(qty) || 0),
      0
    );
  }, [editingSizeStock]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!selectedProduct) return false;
    if (selectedProduct.status !== editingStatus) return true;
    if (selectedProduct.sizes.length !== editingSizes.length) return true;
    if (selectedProduct.sizes.some((s) => !editingSizes.includes(s))) return true;
    for (const s of editingSizes) {
      if ((selectedProduct.size_stock[s] || 0) !== (editingSizeStock[s] || 0)) {
        return true;
      }
    }
    return false;
  }, [selectedProduct, editingSizeStock, editingSizes, editingStatus]);

  // Filtered product list for sidebar/selector
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        (p.slug && p.slug.toLowerCase().includes(search.toLowerCase()));

      let matchesFilter = true;
      if (filterMode === "active") {
        matchesFilter = p.status === "active";
      } else if (filterMode === "low_stock") {
        const hasLowSize = Object.values(p.size_stock).some((qty) => qty <= 3);
        matchesFilter = p.status === "active" && (p.stock <= 10 || hasLowSize);
      }

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filterMode]);

  // Global KPIs (computed for active products)
  const kpiStats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === "active");
    let totalPieces = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    activeProducts.forEach((p) => {
      totalPieces += p.stock;

      Object.values(p.size_stock).forEach((qty) => {
        if (qty === 0) outOfStockCount++;
        else if (qty <= 5) lowStockCount++;
      });
    });

    return {
      totalPieces,
      activeCount: activeProducts.length,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Handle stock adjustments for a size
  const handleQuantityChange = (size: string, value: number) => {
    const val = Math.max(0, isNaN(value) ? 0 : value);
    setEditingSizeStock((prev) => ({
      ...prev,
      [size]: val,
    }));
  };

  const handleStepQuantity = (size: string, step: number) => {
    setEditingSizeStock((prev) => {
      const current = Number(prev[size]) || 0;
      return {
        ...prev,
        [size]: Math.max(0, current + step),
      };
    });
  };

  // Add custom size
  const handleAddSize = () => {
    const trimmed = newSizeInput.trim().toUpperCase();
    if (!trimmed) return;
    if (editingSizes.includes(trimmed)) {
      alert(`La taille "${trimmed}" existe déjà pour ce produit.`);
      return;
    }
    setEditingSizes((prev) => [...prev, trimmed]);
    setEditingSizeStock((prev) => ({
      ...prev,
      [trimmed]: 0,
    }));
    setNewSizeInput("");
  };

  // Remove size
  const handleRemoveSize = (sizeToRemove: string) => {
    if (editingSizes.length <= 1) {
      alert("Un produit doit avoir au moins une taille.");
      return;
    }
    if (
      !window.confirm(
        `Supprimer la taille "${sizeToRemove}" ? Son stock sera retiré du total.`
      )
    ) {
      return;
    }
    setEditingSizes((prev) => prev.filter((s) => s !== sizeToRemove));
    setEditingSizeStock((prev) => {
      const copy = { ...prev };
      delete copy[sizeToRemove];
      return copy;
    });
  };

  // Bulk add to all sizes
  const handleBulkStepAll = (step: number) => {
    setEditingSizeStock((prev) => {
      const next: Record<string, number> = {};
      editingSizes.forEach((s) => {
        const cur = Number(prev[s]) || 0;
        next[s] = Math.max(0, cur + step);
      });
      return next;
    });
  };

  // Save stock changes
  const handleSaveStock = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const cleanSizeStock: Record<string, number> = {};
      editingSizes.forEach((s) => {
        cleanSizeStock[s] = Math.max(0, Number(editingSizeStock[s]) || 0);
      });

      const res = await saveProductSizeStock(selectedProduct.id, cleanSizeStock, {
        sizes: editingSizes,
        status: editingStatus,
        userEmail: userEmail || "Admin",
        reason: "Mise à jour manuelle du stock",
      });

      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedProduct.id
            ? {
                ...p,
                size_stock: cleanSizeStock,
                sizes: editingSizes,
                stock: res.totalStock,
                status: editingStatus,
              }
            : p
        )
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Refresh recent logs
      fetch("/api/stock")
        .then((r) => r.json())
        .then((j) => {
          if (j.logs) setLogs(j.logs);
        })
        .catch(() => {});
    } catch (err: unknown) {
      console.error("Save stock failed:", err);
      setSaveError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={["admin", "sub_admin"]}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <RefreshCw size={28} className="animate-spin text-accent" />
          <p className="text-sm font-medium text-gray-400">Chargement de l&apos;inventaire...</p>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "sub_admin"]}>
      <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Boxes size={22} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2">
                  <span>Stock & Inventaire</span>
                  <span className="text-xs font-normal text-gray-400 hidden sm:inline">
                    (مخزون المقاسات)
                  </span>
                </h1>
                <p className="text-xs text-gray-400">
                  Gérez facilement vos quantités et stocks par taille pour chaque produit actif.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-surface/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Boxes size={14} className="text-accent" /> Total Pièces
            </span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {kpiStats.totalPieces.toLocaleString()}
              </span>
              <span className="text-[11px] text-gray-500 ml-1.5">unités</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-400" /> Produits Actifs
            </span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                {kpiStats.activeCount}
              </span>
              <span className="text-[11px] text-gray-500 ml-1.5">sur {products.length}</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-400" /> Stock Faible (≤5)
            </span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-amber-400 tabular-nums">
                {kpiStats.lowStockCount}
              </span>
              <span className="text-[11px] text-gray-500 ml-1.5">tailles</span>
            </div>
          </div>

          <div className="bg-surface/80 border border-white/10 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <XCircle size={14} className="text-rose-400" /> En Rupture (0)
            </span>
            <div className="mt-2">
              <span className="text-2xl font-extrabold text-rose-400 tabular-nums">
                {kpiStats.outOfStockCount}
              </span>
              <span className="text-[11px] text-gray-500 ml-1.5">tailles</span>
            </div>
          </div>
        </div>

        {/* Main Content Layout: Product Selector + Size Stock Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Product Selector (4 cols on desktop) */}
          <div className="lg:col-span-4 bg-surface/60 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-accent" />
                <span>Sélectionner un produit</span>
              </h2>
              <span className="text-xs text-gray-500 font-mono">
                {filteredProducts.length} affichés
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0d0f15] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent/40"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setFilterMode("active")}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  filterMode === "active"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Produits Actifs ({products.filter((p) => p.status === "active").length})
              </button>
              <button
                onClick={() => setFilterMode("low_stock")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                  filterMode === "low_stock"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                Stock Faible
              </button>
              <button
                onClick={() => setFilterMode("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                  filterMode === "all"
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                Tous
              </button>
            </div>

            {/* Product Cards List */}
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  Aucun produit ne correspond à votre recherche.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const isOutOfStock = p.stock === 0 || p.status === "out_of_stock";

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? "bg-accent/10 border-accent text-white shadow-lg shadow-accent/5 ring-1 ring-accent/30"
                          : "bg-surface/90 border-white/5 hover:border-white/15 hover:bg-white/5 text-gray-300"
                      }`}
                    >
                      {/* Product Thumbnail */}
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
                        {p.images && p.images[0] ? (
                          <Image
                            src={p.images[0]}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Boxes size={18} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-xs font-bold text-white truncate group-hover:text-accent transition-colors">
                            {p.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                          <span className="tabular-nums font-semibold text-gray-300">
                            {p.price.toLocaleString()} DA
                          </span>
                          <span>•</span>
                          <span className="truncate">{p.sizes.length} tailles</span>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold font-mono border ${
                            isOutOfStock
                              ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                              : p.stock <= 10
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {p.stock} pcs
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Detailed Size Stock Editor (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedProduct ? (
              <div className="bg-surface/80 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-6">
                {/* Editor Header: Product Details & Status Switch */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0 shadow-md">
                      {selectedProduct.images && selectedProduct.images[0] ? (
                        <Image
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <Boxes size={24} />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-white font-heading">
                          {selectedProduct.name}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            editingStatus === "active"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {editingStatus === "active" ? "Actif" : "En Rupture"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Catégorie : <span className="text-gray-300">{selectedProduct.category}</span> — Prix :{" "}
                        <span className="text-gray-200 font-semibold">
                          {selectedProduct.price.toLocaleString()} DA
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right side: Live Total Stock Indicator */}
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                    <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                      Stock Total
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-extrabold text-accent font-mono tabular-nums">
                        {liveTotalStock}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">pièces</span>
                    </div>
                  </div>
                </div>

                {/* Status Toggle & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d0f15] border border-white/5 rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-300">Statut du produit :</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingStatus((prev) => (prev === "active" ? "out_of_stock" : "active"))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        editingStatus === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                      }`}
                    >
                      {editingStatus === "active" ? "✓ Produit Actif en Vente" : "✕ Marquer Hors Stock"}
                    </button>
                  </div>

                  {/* Bulk Helpers */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 hidden sm:inline">Ajustement rapide :</span>
                    <button
                      type="button"
                      onClick={() => handleBulkStepAll(5)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                      title="Ajouter 5 à toutes les tailles"
                    >
                      +5 à tous
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkStepAll(10)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-colors"
                      title="Ajouter 10 à toutes les tailles"
                    >
                      +10 à tous
                    </button>
                  </div>
                </div>

                {/* Size Stock Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Stock par Taille</span>
                      <span className="text-xs font-normal text-gray-500">
                        ({editingSizes.length} tailles configurées)
                      </span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {editingSizes.map((size) => {
                      const qty = editingSizeStock[size] !== undefined ? editingSizeStock[size] : 0;
                      const isZero = qty === 0;
                      const isLow = qty > 0 && qty <= 5;

                      return (
                        <div
                          key={size}
                          className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            isZero
                              ? "bg-rose-500/5 border-rose-500/30"
                              : isLow
                              ? "bg-amber-500/5 border-amber-500/30"
                              : "bg-surface border-white/10"
                          }`}
                        >
                          {/* Card Top: Size Label & Status Tag & Remove */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg bg-white/10 font-bold font-mono text-sm text-white flex items-center justify-center border border-white/10">
                                {size}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                  isZero
                                    ? "bg-rose-500/15 text-rose-400 border-rose-500/20"
                                    : isLow
                                    ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
                                    : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
                                }`}
                              >
                                {isZero ? "Rupture" : isLow ? "Stock Faible" : "En Stock"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSize(size)}
                              className="text-gray-500 hover:text-rose-400 p-1 transition-colors"
                              title={`Supprimer la taille ${size}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Card Middle: Direct Input & +/- Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(size, -5)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition-colors"
                              title="-5"
                            >
                              -5
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(size, -1)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors"
                              title="-1"
                            >
                              <Minus size={13} />
                            </button>

                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) => handleQuantityChange(size, parseInt(e.target.value, 10))}
                              className="flex-1 min-w-0 bg-[#0d0f15] border border-white/10 rounded-lg py-1.5 text-center font-bold text-white font-mono text-base focus:outline-none focus:border-accent"
                            />

                            <button
                              type="button"
                              onClick={() => handleStepQuantity(size, 1)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors"
                              title="+1"
                            >
                              <Plus size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStepQuantity(size, 5)}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-400 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition-colors"
                              title="+5"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Size Form */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Nouvelle taille (ex: 3XL, 42, Unique)..."
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSize();
                        }
                      }}
                      className="bg-[#0d0f15] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent/40 w-64"
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Ajouter Taille</span>
                    </button>
                  </div>
                </div>

                {/* Save Section */}
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-gray-400">
                    {hasChanges ? (
                      <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                        <AlertTriangle size={13} /> Modifications non enregistrées
                      </span>
                    ) : (
                      <span className="text-gray-500">Stock synchronisé avec le catalogue</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {saveSuccess && (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                        <Check size={14} /> Stock enregistré avec succès !
                      </span>
                    )}
                    {saveError && (
                      <span className="text-xs text-rose-400 font-medium">
                        {saveError}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveStock}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-black bg-accent hover:bg-accent/90 transition-all flex items-center gap-2 shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          <span>Enregistrer le Stock</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-surface/40 border border-white/5 rounded-2xl p-12 text-center text-gray-500">
                Sélectionnez un produit à gauche pour configurer son stock.
              </div>
            )}

            {/* Recent Stock Activity Logs */}
            <div className="bg-surface/80 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock size={16} className="text-accent" />
                  <span>Derniers Mouvements de Stock</span>
                </h3>
                <span className="text-xs text-gray-500">Mises à jour du stock</span>
              </div>

              {logs.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  Aucun mouvement de stock récent enregistré.
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {logs.map((log) => {
                    const isExpedie =
                      log.action === "stock_order_expedie" || log.action?.includes("expedie");
                    const isRetourne =
                      log.action === "stock_order_retourne" || log.action?.includes("retourne");

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl bg-[#0d0f15] border border-white/5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold font-mono ${
                              isExpedie
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                : isRetourne
                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                : "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                            }`}
                          >
                            {isExpedie ? "-1" : isRetourne ? "+1" : "⚙"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">{log.description}</p>
                            <p className="text-[10px] text-gray-500">
                              Par : {log.user || "Système"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }) : "---"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
