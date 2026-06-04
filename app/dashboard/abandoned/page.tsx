"use client";

import { useState, useEffect } from "react";
import { PhoneCall, CheckCircle2 } from "lucide-react";
import { fetchAbandonedLeads, updateAbandonedLead } from "@/lib/api";

interface Lead {
  id: string;
  name: string;
  phone: string;
  wilaya: string;
  product: string;
  size: string;
  quantity: number;
  created_at: string;
  contacted: boolean;
}

export default function AbandonedPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAbandonedLeads().then((data) => {
      setLeads(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalAbandoned = leads.length;
  const contactedCount = leads.filter((l) => l.contacted).length;
  const recoveryRate = totalAbandoned ? Math.round((contactedCount / totalAbandoned) * 100) : 0;

  const toggleContacted = async (id: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    try {
      await updateAbandonedLead(id, { contacted: !lead.contacted });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, contacted: !l.contacted } : l));
    } catch (err) {
      console.error("Failed to update:", err);
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
    <div className="flex flex-col gap-6 max-w-7xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Abandoned Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Users who started but didn&apos;t complete their order</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="bg-surface rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Abandoned</p>
          <p className="text-2xl font-bold text-white">{totalAbandoned}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Contacted</p>
          <p className="text-2xl font-bold text-emerald-400">{contactedCount}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-white/5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Recovery Rate</p>
          <p className="text-2xl font-bold text-accent">{recoveryRate}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <CheckCircle2 className="w-10 h-10 text-gray-700" />
            <p className="text-sm">No abandoned leads yet.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-1.5 p-2">
              {leads.map((lead) => (
                <div key={lead.id} className={`rounded-xl border p-3 ${lead.contacted ? "border-emerald-500/10 bg-emerald-500/5" : "border-white/[0.03]"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-white">{lead.name}</span>
                    {lead.contacted && <CheckCircle2 size={14} className="text-emerald-400" />}
                  </div>
                  <div className="text-[11px] text-gray-500 mb-2">
                    {lead.product} · {lead.size} · ×{lead.quantity} · {lead.wilaya}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-blue-400 font-mono" dir="ltr">{lead.phone}</span>
                    <button
                      onClick={() => toggleContacted(lead.id)}
                      className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                        lead.contacted ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {lead.contacted ? <CheckCircle2 size={10} /> : <PhoneCall size={10} />}
                      {lead.contacted ? "Contacted" : "Call Back"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Wilaya</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-white">{lead.name}</td>
                      <td className="px-4 py-3 text-xs text-blue-400 font-mono" dir="ltr">{lead.phone}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-300">{lead.product}</div>
                        <div className="text-xs text-gray-500">{lead.size} · ×{lead.quantity}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">{lead.wilaya}</td>
                      <td className="px-4 py-3 text-center">
                        {lead.contacted ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase">Contacted</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg uppercase">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleContacted(lead.id)}
                          className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                          title={lead.contacted ? "Mark as not contacted" : "Mark as contacted"}
                        >
                          <PhoneCall size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
