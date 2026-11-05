"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { fetchOrderById, updateOrder, createHistory } from "@/lib/api";
import EditOrderModal, { type Order, type RecallRecord } from "@/components/dashboard/EditOrderModal";
import OrderDetailModal from "@/components/dashboard/OrderDetailModal";
import RoleGuard from "@/components/dashboard/RoleGuard";

const statusColors: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  new: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400", label: "New" },
  confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400", label: "Confirmed" },
  confirme_reporte: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30", dot: "bg-indigo-400", label: "Confirmé Reporté" },
  expedie: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", dot: "bg-purple-400", label: "Expédié" },
  recall_1: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400", label: "Recall 1" },
  recall_2: { bg: "bg-amber-600/15", text: "text-amber-300", border: "border-amber-500/30", dot: "bg-amber-500", label: "Recall 2" },
  recall_3: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", dot: "bg-orange-400", label: "Recall 3" },
  recall_4: { bg: "bg-orange-600/15", text: "text-orange-300", border: "border-orange-600/30", dot: "bg-orange-500", label: "Recall 4" },
  recall_5: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400", label: "Recall 5" },
  recall: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400", label: "Recall 1" },
  cancelled: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400", label: "Cancelled" },
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error("Failed to load order:", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleUpdateRecall = async (id: string, recallNum: number) => {
    if (!order) return;
    const now = new Date();
    const existingRecalls = Array.isArray(order.recalls) ? [...order.recalls] : [];
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
      user: "Admin",
    };

    const idx = existingRecalls.findIndex((r) => r.recall_number === recallNum);
    if (idx >= 0) existingRecalls[idx] = newRecord;
    else existingRecalls.push(newRecord);

    const newStatus = `recall_${recallNum}`;
    const updated = await updateOrder(id, {
      status: newStatus,
      recalls: existingRecalls,
    });

    setOrder(updated || { ...order, status: newStatus, recalls: existingRecalls });

    await createHistory({
      action: `order_${newStatus}`,
      description: `Order #${order.order_number} marked as Recall ${recallNum} — ${order.name}`,
      details: order.item,
    }).catch(console.error);
  };

  const handleSaveEdit = async (updatedOrder: Order) => {
    await updateOrder(updatedOrder.id, { ...updatedOrder });
    setOrder(updatedOrder);
    await createHistory({
      action: "order_updated",
      description: `Order #${updatedOrder.order_number} details updated manually`,
      details: updatedOrder.item,
    }).catch(console.error);
  };

  if (loading) {
    return (
      <RoleGuard allowedRoles={["admin", "sub_admin"]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <RefreshCw className="animate-spin text-accent" size={24} />
        </div>
      </RoleGuard>
    );
  }

  if (!order) {
    return (
      <RoleGuard allowedRoles={["admin", "sub_admin"]}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
          <p className="text-gray-400 text-sm">Commande introuvable.</p>
          <Link
            href="/dashboard/orders"
            className="px-4 py-2 bg-accent text-black font-bold text-xs rounded-xl"
          >
            Retour aux Commandes
          </Link>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin", "sub_admin"]}>
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Retour aux Commandes</span>
        </Link>

        <OrderDetailModal
          order={order}
          onClose={() => router.push("/dashboard/orders")}
          onEdit={() => setEditing(true)}
          onUpdateRecall={handleUpdateRecall}
          statusColors={statusColors}
        />

        {editing && (
          <EditOrderModal
            order={order}
            onClose={() => setEditing(false)}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </RoleGuard>
  );
}
