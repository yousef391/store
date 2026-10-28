"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  Calendar,
  ShieldCheck,
  X,
  Eye,
  EyeOff,
  AlertCircle,
  Package,
  Send,
  Pencil,
  Check,
} from "lucide-react";
import RoleGuard from "@/components/dashboard/RoleGuard";
import { fetchProducts } from "@/lib/api";
import { products as fallbackProducts } from "@/data/products";

interface SubAdmin {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  assigned_products: string[];
  telegram_chat_id: string | null;
}

interface ProductItem {
  id: number | string;
  name: string;
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
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states (Create & Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load available products for selection
  useEffect(() => {
    fetchProducts()
      .then((data) => {
        if (data && data.length > 0) {
          const unique = new Map<string, ProductItem>();
          data.forEach((p: { id: number | string; name: string }) => {
            if (p.name) unique.set(p.name, { id: p.id, name: p.name });
          });
          setAvailableProducts(Array.from(unique.values()));
        } else {
          // Fallback to static products list
          const unique = new Map<string, ProductItem>();
          fallbackProducts.forEach((p) => {
            if (p.name) unique.set(p.name, { id: p.id, name: p.name });
          });
          setAvailableProducts(Array.from(unique.values()));
        }
      })
      .catch(() => {
        const unique = new Map<string, ProductItem>();
        fallbackProducts.forEach((p) => {
          if (p.name) unique.set(p.name, { id: p.id, name: p.name });
        });
        setAvailableProducts(Array.from(unique.values()));
      });
  }, []);

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

  const openCreateModal = () => {
    setEditingSubAdmin(null);
    setEmail("");
    setPassword("");
    setTelegramChatId("");
    setSelectedProducts([]);
    setFormError("");
    setShowForm(true);
  };

  const openEditModal = (subAdmin: SubAdmin) => {
    setEditingSubAdmin(subAdmin);
    setEmail(subAdmin.email);
    setPassword("");
    setTelegramChatId(subAdmin.telegram_chat_id || "");
    setSelectedProducts(subAdmin.assigned_products || []);
    setFormError("");
    setShowForm(true);
  };

  const closeFormModal = () => {
    setShowForm(false);
    setEditingSubAdmin(null);
    setEmail("");
    setPassword("");
    setTelegramChatId("");
    setSelectedProducts([]);
    setFormError("");
  };

  const toggleProduct = (prodName: string) => {
    setSelectedProducts((prev) =>
      prev.includes(prodName) ? prev.filter((p) => p !== prodName) : [...prev, prodName]
    );
  };

  const selectAllProducts = () => {
    setSelectedProducts(availableProducts.map((p) => p.name));
  };

  const clearAllProducts = () => {
    setSelectedProducts([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError("");

    try {
      if (editingSubAdmin) {
        // Edit existing sub-admin
        const res = await fetch("/api/sub-admin", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingSubAdmin.id,
            assigned_products: selectedProducts,
            telegram_chat_id: telegramChatId.trim() || null,
            password: password ? password.trim() : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Failed to update account.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // Create new sub-admin
        const res = await fetch("/api/sub-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            assigned_products: selectedProducts,
            telegram_chat_id: telegramChatId.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Failed to create account.");
          setIsSubmitting(false);
          return;
        }
      }

      closeFormModal();
      await loadSubAdmins();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (!confirm(`Delete sub-admin account "${userEmail}"?\nThis cannot be undone.`)) return;
    setDeletingId(id);
    await fetch(`/api/sub-admin?id=${id}`, { method: "DELETE" });
    setSubAdmins((prev) => prev.filter((u) => u.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading flex items-center gap-2">
            <Users size={22} className="text-accent" />
            Sub Accounts
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Sub-admins can view Statistics and Orders only for their assigned products.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-black text-sm font-bold rounded-xl hover:bg-accent/90 transition-all active:scale-[0.97] self-start sm:self-auto"
          >
            <Plus size={16} />
            New Sub Admin
          </button>
        )}
      </div>

      {/* Modal / Create & Edit Form */}
      {showForm && (
        <div className="bg-surface border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-accent" />
              {editingSubAdmin ? `Edit Sub-Admin: ${editingSubAdmin.email}` : "Create Sub-Admin Account"}
            </h2>
            <button
              onClick={closeFormModal}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    disabled={!!editingSubAdmin}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFormError("");
                    }}
                    placeholder="subadmin@rova.dz"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  {editingSubAdmin ? "New Password (leave empty to keep current)" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFormError("");
                    }}
                    placeholder={editingSubAdmin ? "Leave blank to keep" : "Min. 6 characters"}
                    required={!editingSubAdmin}
                    minLength={editingSubAdmin ? (password ? 6 : 0) : 6}
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
            </div>

            {/* Telegram Chat ID (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Send size={13} className="text-blue-400" />
                  Telegram Chat ID <span className="text-[10px] text-gray-500 font-normal lowercase">(optional)</span>
                </label>
              </div>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="e.g. 123456789"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                When an order for this sub-admin&apos;s assigned products arrives, the Telegram bot will instantly notify this chat ID too. (To get your Chat ID, send /start to @userinfobot on Telegram).
              </p>
            </div>

            {/* Assign Products */}
            <div className="border border-white/10 rounded-xl p-4 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Package size={14} className="text-accent" />
                  Assign Products ({selectedProducts.length} selected)
                </label>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllProducts}
                    className="text-accent hover:underline font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600">·</span>
                  <button
                    type="button"
                    onClick={clearAllProducts}
                    className="text-gray-400 hover:text-white font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {availableProducts.length === 0 ? (
                <p className="text-xs text-gray-500 py-2">Loading products...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {availableProducts.map((p) => {
                    const isSelected = selectedProducts.includes(p.name);
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => toggleProduct(p.name)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? "bg-accent/15 border-accent text-white"
                            : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-200"
                        }`}
                      >
                        <span className="truncate pr-2 font-medium">{p.name}</span>
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? "bg-accent text-black" : "border border-white/20"
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-gray-500 mt-2.5">
                💡 This sub-admin will only be able to view and manage orders and statistics for the selected products.
              </p>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" />
                {formError}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={closeFormModal}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white hover:border-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!editingSubAdmin && (!email || !password))}
                className="flex-1 py-2.5 rounded-xl bg-accent text-black text-sm font-bold hover:bg-accent/90 transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingSubAdmin
                  ? "Save Changes"
                  : "Create Account"}
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
          <div className="flex flex-col items-center justify-center h-48 text-gray-600 gap-2">
            <Users size={32} className="text-gray-700" />
            <p className="text-sm">No sub-admin accounts created yet.</p>
            <button
              onClick={openCreateModal}
              className="text-xs text-accent hover:underline mt-1"
            >
              Create your first sub-admin
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {subAdmins.map((user) => {
              const assigned = user.assigned_products || [];
              return (
                <div
                  key={user.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck size={18} className="text-accent" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-white">{user.email}</p>
                        <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">
                          Sub Admin
                        </span>
                        {user.telegram_chat_id ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-medium flex items-center gap-1">
                            <Send size={10} /> Telegram: {user.telegram_chat_id}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-500 text-[10px]">
                            No Telegram
                          </span>
                        )}
                      </div>

                      {/* Assigned products */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-gray-400 font-medium">Products:</span>
                        {assigned.length > 0 ? (
                          assigned.map((prod) => (
                            <span
                              key={prod}
                              className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[11px]"
                            >
                              {prod}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-amber-400/80 italic">
                            No products assigned (cannot view orders)
                          </span>
                        )}
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-3 text-[10px] text-gray-600 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Created: {new Date(user.created_at).toLocaleDateString()}
                        </span>
                        <span>·</span>
                        <span>
                          {user.last_sign_in_at
                            ? `Last login: ${new Date(user.last_sign_in_at).toLocaleDateString()}`
                            : "Never logged in"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1 text-xs"
                      title="Edit assigned products or settings"
                    >
                      <Pencil size={15} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(user.id, user.email)}
                      disabled={deletingId === user.id}
                      className="p-2 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                      title="Delete account"
                    >
                      <Trash2 size={15} />
                    </button>
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
