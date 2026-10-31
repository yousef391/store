"use client";

import { useState } from "react";
import {
  X,
  Phone,
  PhoneCall,
  Copy,
  Check,
  Calendar,
  Clock,
  MapPin,
  Package,
  StickyNote,
  Truck,
  RotateCcw,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import type { Order, RecallRecord } from "./EditOrderModal";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onUpdateRecall: (orderId: string, recallNumber: number) => Promise<void>;
  statusColors: Record<string, { bg: string; text: string; border: string; dot: string; label: string }>;
}

export default function OrderDetailModal({
  order,
  onClose,
  onEdit,
  onUpdateRecall,
  statusColors,
}: OrderDetailModalProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [updatingRecall, setUpdatingRecall] = useState<number | null>(null);

  const copyText = (text: string, type: "phone" | "tracking") => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === "phone") {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 1500);
      } else {
        setCopiedTracking(true);
        setTimeout(() => setCopiedTracking(false), 1500);
      }
    });
  };

  const handleTriggerRecall = async (recallNum: number) => {
    setUpdatingRecall(recallNum);
    try {
      await onUpdateRecall(order.id, recallNum);
    } catch (err) {
      console.error("Failed to update recall:", err);
    } finally {
      setUpdatingRecall(null);
    }
  };

  // Format exact date & time
  const formatExactDateTime = (iso: string) => {
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
      second: "2-digit",
    });
    return `${dateStr} à ${timeStr}`;
  };

  // Find recall record by number (1 to 5)
  const recallsList = Array.isArray(order.recalls) ? order.recalls : [];
  const getRecallRecord = (num: number): RecallRecord | undefined => {
    return recallsList.find((r) => r.recall_number === num);
  };

  const effectiveStatus = order.status === "recall" ? "recall_1" : order.status;
  const currentStatusInfo = statusColors[effectiveStatus] || statusColors.recall_1 || statusColors.recall || {
    bg: "bg-gray-500/10",
    text: "text-gray-400",
    border: "border-white/10",
    dot: "bg-gray-400",
    label: order.status,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#141720] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white font-heading">
                  Commande #{order.order_number}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentStatusInfo.bg} ${currentStatusInfo.text} ${currentStatusInfo.border}`}
                >
                  {currentStatusInfo.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <Calendar size={12} className="text-gray-500" />
                <span>{formatExactDateTime(order.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(order)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <Pencil size={12} />
              <span>Modifier</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Yellow Note Badge (if exists) */}
          {order.note && (
            <div className="p-3.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-200 text-xs flex items-start gap-2.5 shadow-sm">
              <StickyNote size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-300 block mb-0.5">Remarque / Note:</span>
                <p className="whitespace-pre-wrap leading-relaxed">{order.note}</p>
              </div>
              <button
                onClick={() => onEdit(order)}
                className="text-[11px] font-bold text-amber-400 hover:underline shrink-0"
              >
                Modifier
              </button>
            </div>
          )}

          {/* Customer & Call Section */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Client</span>
              {order.source && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                  Source: {order.source}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-base font-bold text-white">{order.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-mono text-blue-400 font-bold" dir="ltr">
                    {order.phone}
                  </span>
                  <button
                    onClick={() => copyText(order.phone, "phone")}
                    className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-gray-300 transition-colors"
                    title="Copier le numéro"
                  >
                    {copiedPhone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {/* Direct Call Button (Appel Direct) */}
              <a
                href={`tel:${order.phone}`}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 transition-all text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <PhoneCall size={15} />
                <span>Appeler Directement</span>
              </a>
            </div>

            {/* Location */}
            <div className="pt-2 border-t border-white/5 flex items-start gap-2 text-xs text-gray-300">
              <MapPin size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">{order.wilaya}</p>
                <p className="text-gray-400 mt-0.5">
                  {order.commune || "Adresse non spécifiée"}
                </p>
                {order.commune?.includes("[Stopdesk]") ? (
                  <span className="inline-block mt-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                    🏢 Bureau Stopdesk
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                    🏠 Livraison à Domicile
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Product & Price Section */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Article & Prix</span>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-accent shrink-0">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{order.item}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Couleur: <span className="text-white font-medium">{order.color || "Standard"}</span> · Taille:{" "}
                    <span className="text-white font-medium">{order.size || "Standard"}</span> · Qté:{" "}
                    <span className="text-white font-bold">×{order.quantity || 1}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-accent tabular-nums">
                  {order.total.toLocaleString()} DA
                </p>
                <p className="text-[10px] text-gray-500">
                  {order.price.toLocaleString()} DA + {order.delivery.toLocaleString()} DA livr.
                </p>
              </div>
            </div>
          </div>

          {/* Tracking / Yalidine Info */}
          {order.tracking_id && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck size={16} className="text-purple-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    Numéro de Suivi (Yalidine / Transporteur)
                  </span>
                  <span className="text-xs font-mono font-bold text-white">{order.tracking_id}</span>
                </div>
              </div>
              <button
                onClick={() => copyText(order.tracking_id!, "tracking")}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium flex items-center gap-1"
              >
                {copiedTracking ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedTracking ? "Copié" : "Copier"}</span>
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* 📞 HISTORIQUE DES 5 RECALLS (RELANCES)                        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <RotateCcw size={14} className="text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Historique des 5 Relances (Recalls)
                </h3>
              </div>
              <span className="text-[10px] text-gray-500">Dates & Heures exactes</span>
            </div>

            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((num) => {
                const record = getRecallRecord(num);
                const isCurrentStatus = order.status === `recall_${num}` || (num === 1 && order.status === "recall");
                const isExecuted = Boolean(record);
                const isUpdatingThis = updatingRecall === num;

                return (
                  <div
                    key={num}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isCurrentStatus
                        ? "bg-amber-500/10 border-amber-500/30"
                        : isExecuted
                        ? "bg-white/[0.03] border-white/10"
                        : "bg-white/[0.01] border-white/5 opacity-75"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                          isExecuted
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-white/5 text-gray-500"
                        }`}
                      >
                        {num}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            Recall {num}
                          </span>
                          {isExecuted ? (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <CheckCircle2 size={9} /> Effectué
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-500">Non effectué</span>
                          )}
                          {isCurrentStatus && (
                            <span className="text-[9px] font-bold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
                              Actuel
                            </span>
                          )}
                        </div>

                        {/* Date and time display */}
                        {record ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-mono mt-0.5">
                            <Clock size={11} className="text-amber-400 shrink-0" />
                            <span>{record.date_formatted || formatExactDateTime(record.timestamp)}</span>
                            {record.user && <span className="text-gray-500">({record.user})</span>}
                          </div>
                        ) : (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Pas encore appelé pour cette étape.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for Recall */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={isUpdatingThis}
                        onClick={() => handleTriggerRecall(num)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                          isCurrentStatus
                            ? "bg-amber-500 text-black hover:bg-amber-400"
                            : "bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white"
                        }`}
                      >
                        <RotateCcw size={12} className={isUpdatingThis ? "animate-spin" : ""} />
                        <span>{isExecuted ? `Répéter Recall ${num}` : `Marquer Recall ${num}`}</span>
                      </button>

                      {/* Direct call with recall trigger */}
                      <a
                        href={`tel:${order.phone}`}
                        onClick={() => {
                          if (!isExecuted) handleTriggerRecall(num);
                        }}
                        className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 active:scale-95 transition-all"
                        title="Appeler et enregistrer cette relance"
                      >
                        <Phone size={13} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            onClick={() => onEdit(order)}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <Pencil size={13} />
            <span>Modifier la Commande</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-accent text-black text-xs font-bold hover:bg-accent/90 active:scale-95 transition-all"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

