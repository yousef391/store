"use client";

import { useState } from "react";
import { X, Save, Phone, User, MapPin, Package, DollarSign, StickyNote, AlertCircle } from "lucide-react";
import algeriaData from "@/data/algeria.json";
import { products as fallbackProducts } from "@/data/products";

export interface RecallRecord {
  recall_number: number;
  timestamp: string;
  date_formatted?: string;
  user?: string;
  note?: string;
}

export interface Order {
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
  source?: string;
  created_at: string;
  updated_at?: string;
  note?: string | null;
  recalls?: RecallRecord[] | null;
}

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updatedOrder: Order) => Promise<void>;
  availableProducts?: { id: number | string; name: string }[];
}

const STATUS_LIST = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "confirme_reporte", label: "Confirmé Reporté" },
  { value: "expedie", label: "Expédié" },
  { value: "en_livraison", label: "En livraison" },
  { value: "livre", label: "Livré" },
  { value: "echoue", label: "Échec livraison" },
  { value: "retourne", label: "Retourné" },
  { value: "recall_1", label: "Recall 1" },
  { value: "recall_2", label: "Recall 2" },
  { value: "recall_3", label: "Recall 3" },
  { value: "recall_4", label: "Recall 4" },
  { value: "recall_5", label: "Recall 5" },
  { value: "cancelled", label: "Cancelled" },
];

export default function EditOrderModal({ order, onClose, onSave, availableProducts = [] }: EditOrderModalProps) {
  const [name, setName] = useState(order.name || "");
  const [phone, setPhone] = useState(order.phone || "");

  // Wilaya resolution
  const initialWilayaMatch = String(order.wilaya || "").match(/^(\d+)/);
  const initialWilayaId = initialWilayaMatch ? initialWilayaMatch[1] : order.wilaya || "";
  const [wilaya, setWilaya] = useState(initialWilayaId);

  // Commune and Stopdesk
  const isInitialStopdesk = Boolean(order.commune?.includes("[Stopdesk]"));
  const initialCleanCommune = (order.commune || "").replace(/\s*\[Stopdesk\]/i, "").trim();
  const [commune, setCommune] = useState(initialCleanCommune);
  const [isStopdesk, setIsStopdesk] = useState(isInitialStopdesk);

  // Items
  const [item, setItem] = useState(order.item || "");
  const [color, setColor] = useState(order.color || "");
  const [size, setSize] = useState(order.size || "");
  const [quantity, setQuantity] = useState(order.quantity || 1);

  // Pricing
  const [price, setPrice] = useState(order.price || 0);
  const [delivery, setDelivery] = useState(order.delivery || 0);
  const [total, setTotal] = useState(order.total || 0);

  // Status & Note
  const initialStatus = order.status === "recall" ? "recall_1" : order.status || "new";
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(order.note || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Product selection options
  const productOptions = availableProducts.length > 0
    ? availableProducts.map((p) => p.name)
    : Array.from(new Set(fallbackProducts.map((p) => p.name))).filter(Boolean);

  const handlePriceOrQtyChange = (newPrice: number, newQty: number, newDelivery: number) => {
    setPrice(newPrice);
    setQuantity(newQty);
    setDelivery(newDelivery);
    setTotal(newPrice * newQty + newDelivery);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Find wilaya display name
      const wilayaObj = algeriaData.wilayas.find(
        (w: { wilaya_id: string; wilaya_name_latin: string }) => String(w.wilaya_id) === String(wilaya)
      );
      const wilayaDisplay = wilayaObj ? `${wilayaObj.wilaya_id} - ${wilayaObj.wilaya_name_latin}` : wilaya;
      const finalCommune = isStopdesk ? `${commune.trim()} [Stopdesk]` : commune.trim();

      // If status changed to a recall status, append or update recall history
      const updatedRecalls = Array.isArray(order.recalls) ? [...order.recalls] : [];
      if (status.startsWith("recall_") || status === "recall") {
        const recallNum = status === "recall" ? 1 : (parseInt(status.replace("recall_", ""), 10) || 1);
        const now = new Date();
        const existingIdx = updatedRecalls.findIndex((r) => r.recall_number === recallNum);
        const newRecord: RecallRecord = {
          recall_number: recallNum,
          timestamp: now.toISOString(),
          date_formatted: now.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          user: "Admin",
        };
        if (existingIdx >= 0) {
          updatedRecalls[existingIdx] = newRecord;
        } else {
          updatedRecalls.push(newRecord);
        }
      }

      const targetStatus = status === "recall" ? "recall_1" : status;
      const updatedOrderData: Order = {
        ...order,
        name: name.trim(),
        phone: phone.trim(),
        wilaya: wilayaDisplay,
        commune: finalCommune,
        item: item.trim(),
        color: color.trim(),
        size: size.trim(),
        quantity: Number(quantity) || 1,
        price: Number(price) || 0,
        delivery: Number(delivery) || 0,
        total: Number(total) || 0,
        status: targetStatus,
        note: note.trim() || null,
        recalls: updatedRecalls,
      };

      await onSave(updatedOrderData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141720] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-white font-heading">
              Modifier Commande <span className="text-accent">#{order.order_number}</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-gray-400">
              {new Date(order.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: Client */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <User size={13} className="text-accent" />
              Informations Client
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Nom Complet</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-gray-400">Téléphone</label>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Phone size={10} /> Appeler
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent/40"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section: Livraison */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <MapPin size={13} className="text-blue-400" />
              Livraison & Localisation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Wilaya</label>
                <select
                  value={wilaya}
                  onChange={(e) => setWilaya(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#141720]">Sélectionner Wilaya</option>
                  {algeriaData.wilayas.map((w: { wilaya_id: string; wilaya_name_latin: string }) => (
                    <option key={w.wilaya_id} value={w.wilaya_id} className="bg-[#141720] text-gray-200">
                      {w.wilaya_id} - {w.wilaya_name_latin}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Commune / Adresse</label>
                <input
                  type="text"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  placeholder="Ex: Bab Ezzouar"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
            </div>

            {/* Mode de livraison: Domicile vs Stopdesk */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">Livraison Stopdesk (Bureau)</span>
                <span className="text-[11px] text-gray-500">Le client récupère le colis au bureau Yalidine / Stopdesk.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsStopdesk(!isStopdesk)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  isStopdesk ? "bg-amber-500" : "bg-gray-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    isStopdesk ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Produit */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Package size={13} className="text-emerald-400" />
              Détails Article
            </h3>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">Article</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  list="order-product-list"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <datalist id="order-product-list">
                  {productOptions.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Couleur</label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Ex: Noir"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Taille</label>
                <input
                  type="text"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  placeholder="Ex: L, XL"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Quantité</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => handlePriceOrQtyChange(price, parseInt(e.target.value, 10) || 1, delivery)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/40 text-center font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section: Tarifs */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <DollarSign size={13} className="text-accent" />
              Prix & Total
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Prix Produit (DA)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => handlePriceOrQtyChange(parseInt(e.target.value, 10) || 0, quantity, delivery)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Livraison (DA)</label>
                <input
                  type="number"
                  value={delivery}
                  onChange={(e) => handlePriceOrQtyChange(price, quantity, parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-accent mb-1">Total (DA)</label>
                <input
                  type="number"
                  value={total}
                  onChange={(e) => setTotal(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-accent/10 border border-accent/30 rounded-xl px-3 py-2 text-sm text-accent font-mono font-bold focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {/* Section: Statut & Note */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Statut Commande</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-accent/40 appearance-none cursor-pointer"
                >
                  {STATUS_LIST.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#141720] text-gray-200">
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-amber-300 mb-1 flex items-center gap-1">
                  <StickyNote size={12} className="text-amber-400" />
                  Note / Remarque (Badge Jaune)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Client indisponible le matin, rappeler à 18h..."
                  className="w-full bg-amber-400/5 border border-amber-400/20 rounded-xl p-2.5 text-xs text-amber-200 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-accent/20 disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

