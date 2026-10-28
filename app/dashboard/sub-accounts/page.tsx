"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, Mail, Calendar, ShieldCheck, X, Eye, EyeOff, AlertCircle } from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";

interface SubAdmin {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function SubAccountsPage() {
  return (
    <RoleGuard allowedRoles={["admin"]}>
      <SubAccountsContent />
    </RoleGuard>
  );
}

function SubAccountsContent() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSubAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sub-admin");
      const data = await res.json();
      if (res.ok) setSubAdmins(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubAdmins();
  }, [loadSubAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");

    const res = await fetch("/api/sub-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setCreateError(data.error || "Failed to create account.");
      setCreating(false);
      return;
    }

    // Reset form & refresh list
    setEmail("");
    setPassword("");
    setShowForm(false);
    setCreating(false);
    loadSubAdmins();
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (!confirm(`Delete sub-admin account "${userEmail}"?\nThis cannot be undone.`)) return;
    setDeletingId(id);
    await fetch(`/api/sub-admin?id=${id}`, { method: "DELETE" });
    setSubAdmins((prev) => prev.filter((u) => u.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Users size={22} className="text-accent" />
            Sub Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sub-admins can view Statistics and Orders only.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-bold rounded-xl hover:bg-accent/90 transition-all active:scale-[0.97]"
          >
            <Plus size={16} />
            New Account
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck size={16} className="text-accent" />
              Create Sub-Admin Account
            </h2>
            <button
              onClick={() => { setShowForm(false); setCreateError(""); setEmail(""); setPassword(""); }}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setCreateError(""); }}
                  placeholder="subadmin@rova.dz"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setCreateError(""); }}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {createError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" />
                {createError}
              </div>
            )}

            {/* Permissions note */}
            <div className="bg-accent/5 border border-accent/15 rounded-xl px-3 py-2.5">
              <p className="text-xs text-accent/80 font-medium">
                🔒 This account will have access to: <strong>Statistics</strong> and <strong>Orders</strong> only.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowForm(false); setCreateError(""); setEmail(""); setPassword(""); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !email || !password}
                className="flex-1 py-2.5 rounded-xl bg-accent text-black text-sm font-bold hover:bg-accent/90 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-admins list */}
      <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : subAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-600 gap-2">
            <Users size={32} className="text-gray-700" />
            <p className="text-sm">No sub-admin accounts yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-accent hover:underline mt-1"
            >
              Create your first one
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {subAdmins.map((user) => (
              <div key={user.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <ShieldCheck size={16} className="text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-600 flex items-center gap-1">
                        <Calendar size={10} />
                        Created {new Date(user.created_at).toLocaleDateString()}
                      </span>
                      {user.last_sign_in_at ? (
                        <span className="text-[10px] text-gray-600">
                          Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-700">Never logged in</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                    Sub Admin
                  </span>
                  <button
                    onClick={() => handleDelete(user.id, user.email!)}
                    disabled={deletingId === user.id}
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                    title="Delete account"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

