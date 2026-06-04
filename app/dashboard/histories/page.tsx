"use client";

import { useState, useEffect } from "react";
import { Clock, Package, Settings, DollarSign, XCircle, Truck, RotateCcw } from "lucide-react";
import { fetchHistories } from "@/lib/api";

interface HistoryEntry {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  details?: string;
}

const ACTION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  order_confirmed: { icon: Package, color: "text-emerald-400" },
  order_cancelled: { icon: XCircle, color: "text-red-400" },
  order_recall: { icon: RotateCcw, color: "text-amber-400" },
  order_shipped: { icon: Truck, color: "text-indigo-400" },
  order_delivered: { icon: Package, color: "text-emerald-400" },
  order_returned: { icon: RotateCcw, color: "text-orange-400" },
  product_added: { icon: Package, color: "text-blue-400" },
  product_updated: { icon: Settings, color: "text-gray-400" },
  settings_changed: { icon: Settings, color: "text-gray-400" },
  price_updated: { icon: DollarSign, color: "text-accent" },
};

export default function HistoriesPage() {
  const [histories, setHistories] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistories().then((data) => {
      setHistories(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Activity History</h1>
        <p className="text-sm text-gray-500 mt-1">{histories.length} entries</p>
      </div>

      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <Clock className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No activity history yet.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {histories.map((entry, i) => {
              const actionInfo = ACTION_ICONS[entry.action] || { icon: Clock, color: "text-gray-500" };
              const Icon = actionInfo.icon;
              return (
                <div key={entry.id} className={`flex items-start gap-3 px-4 py-3.5 ${i < histories.length - 1 ? "border-b border-white/5" : ""} hover:bg-white/[0.02] transition-colors`}>
                  <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={14} className={actionInfo.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{entry.description}</p>
                    {entry.details && <p className="text-xs text-gray-500 mt-0.5">{entry.details}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-600">{entry.user}</span>
                      <span className="text-[10px] text-gray-700">·</span>
                      <span className="text-[10px] text-gray-600">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
