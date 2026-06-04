"use client";

import { useMemo, useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Package } from "lucide-react";
import { fetchOrders } from "@/lib/api";

interface Order {
  id: string;
  order_number: number;
  name: string;
  phone: string;
  wilaya: string;
  total: number;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  confirmed: "#10b981",
  cancelled: "#ef4444",
  recall: "#f59e0b",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status === "confirmed")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalOrders = orders.length;
    const confirmedCount = orders.filter((o) => o.status === "confirmed").length;
    const confirmationRate = totalOrders ? Math.round((confirmedCount / totalOrders) * 100) : 0;
    const avgOrderValue = Math.round(totalRevenue / (confirmedCount || 1));

    return { totalRevenue, totalOrders, confirmationRate, avgOrderValue };
  }, [orders]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const revenueData = useMemo(() => {
    const days: Record<string, number> = {};
    orders.filter((o) => o.status === "confirmed").forEach((o) => {
      const day = new Date(o.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
      days[day] = (days[day] || 0) + (o.total || 0);
    });
    return Object.entries(days).map(([name, revenue]) => ({ name, revenue }));
  }, [orders]);

  const wilayaData = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      const wilaya = o.wilaya.split(" - ")[1] || o.wilaya;
      counts[wilaya] = (counts[wilaya] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, orders]) => ({ name, orders }));
  }, [orders]);

  const statCards = [
    { label: "Total Revenue", value: `${stats.totalRevenue.toLocaleString()} DA`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Orders", value: stats.totalOrders.toString(), icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Confirmation Rate", value: `${stats.confirmationRate}%`, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
    { label: "Avg. Order Value", value: `${stats.avgOrderValue.toLocaleString()} DA`, icon: Package, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your store performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={16} className={s.color} />
              </div>
            </div>
            <p className="text-lg md:text-2xl font-bold text-white tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A574" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#D4A574" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#141720", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }} labelStyle={{ color: "#999" }} formatter={(value: unknown) => [`${Number(value).toLocaleString()} DA`, "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#D4A574" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface rounded-2xl p-5 border border-white/5">
          <h3 className="text-sm font-bold text-white mb-4">Order Status</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#666"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#141720", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] || "#666" }} />
                    <span className="capitalize">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">No orders yet</div>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 border border-white/5">
        <h3 className="text-sm font-bold text-white mb-4">Top Wilayas</h3>
        {wilayaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wilayaData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#666" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#999" }} axisLine={false} tickLine={false} width={100} />
              <Tooltip contentStyle={{ background: "#141720", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", fontSize: 12 }} />
              <Bar dataKey="orders" fill="#D4A574" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">No data yet</div>
        )}
      </div>
    </div>
  );
}
