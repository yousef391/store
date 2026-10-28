"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Pencil, Grid3X3, List, ExternalLink, Trash2 } from "lucide-react";
import { fetchProducts, deleteProduct, createHistory } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import RoleGuard from "@/components/dashboard/RoleGuard";

interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  bundle_price: number;
  images: string[];
  category: string;
  sizes: string[];
  status: string;
  stock: number;
}

export default function ProductsPage() {
  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts().then((data) => {
      setProductList(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (typeof deleteProduct === "function") {
        await deleteProduct(productToDelete.id);
      } else {
        const res = await fetch(`/api/products?id=${productToDelete.id}`, { method: "DELETE" });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to delete product");
        }
      }
      try {
        await createHistory({
          action: "product_deleted",
          description: `Product "${productToDelete.name}" deleted`,
          details: `ID: ${productToDelete.id}, Slug: ${productToDelete.slug}, Price: ${productToDelete.price} DA`,
        });
      } catch (hErr) {
        console.warn("Failed to create history entry:", hErr);
      }
      setProductList((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setProductToDelete(null);
    } catch (err: unknown) {
      console.error("Failed to delete product:", err);
      setDeleteError(err instanceof Error ? err.message : "Failed to delete product. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = productList.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["admin"]}>
    <div className="flex flex-col gap-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Products</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} products</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-surface border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div className="flex items-center gap-1 bg-surface rounded-xl p-1 border border-white/5">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setViewMode("table")} className={`p-2 rounded-lg transition-colors ${viewMode === "table" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((product) => (
            <div key={product.id} className="bg-surface rounded-xl border border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
              <div className="relative aspect-square bg-surface-light">
                <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="200px" />
                <div className="absolute top-2 right-2">
                  <Badge variant={product.status as "active" | "out_of_stock" | "draft"}>{product.status.replace("_", " ")}</Badge>
                </div>
              </div>
              <div className="p-3 md:p-4">
                <h3 className="text-sm font-semibold text-white truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{product.category}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-white tabular-nums">{product.price.toLocaleString()} DA</span>
                  <span className="text-[10px] text-gray-500">Stock: {product.stock}</span>
                </div>
                {product.bundle_price > 0 && product.bundle_price < product.price * 2 && (
                  <div className="mt-1.5">
                    <span className="text-[10px] text-amber-400 font-bold">
                      2 pcs: {product.bundle_price.toLocaleString()} DA (وفّر {((product.price * 2) - product.bundle_price).toLocaleString()} DA)
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">
                  <Link href={`/dashboard/products/${product.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 rounded-lg text-[11px] font-bold transition-colors">
                    <Pencil size={12} /> Edit
                  </Link>
                  <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 hover:bg-accent/10 text-gray-400 hover:text-accent rounded-lg text-[11px] font-bold transition-colors">
                    <ExternalLink size={12} /> View
                  </a>
                  <button
                    onClick={() => {
                      setProductToDelete(product);
                      setDeleteError(null);
                    }}
                    className="p-1.5 bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 rounded-lg text-[11px] font-bold transition-colors"
                    title="Delete product"
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Bundle (2 pcs)</th>
                  <th className="px-4 py-3">Sizes</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-surface-light shrink-0">
                          <Image src={product.images[0]} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{product.name}</p>
                          <p className="text-[11px] text-gray-500">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white font-bold tabular-nums">{product.price.toLocaleString()} DA</td>
                    <td className="px-4 py-3 text-sm text-amber-400 font-bold tabular-nums">{product.bundle_price.toLocaleString()} DA</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{product.sizes.join(", ")}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">{product.stock}</td>
                    <td className="px-4 py-3"><Badge variant={product.status as "active" | "out_of_stock" | "draft"}>{product.status.replace("_", " ")}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/products/${product.id}`} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                          <Pencil size={14} />
                        </Link>
                        <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors" title="View">
                          <ExternalLink size={14} />
                        </a>
                        <button
                          onClick={() => {
                            setProductToDelete(product);
                            setDeleteError(null);
                          }}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete product"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => {
          if (!isDeleting) {
            setProductToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Product"
        maxWidth="max-w-md"
      >
        {productToDelete && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <div className="w-9 h-9 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-white text-sm mb-0.5">Are you sure?</p>
                This action will permanently delete this product and remove it from the store catalog.
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-surface-light shrink-0">
                <Image
                  src={productToDelete.images[0] || "/placeholder.png"}
                  alt={productToDelete.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white truncate">{productToDelete.name}</h4>
                <p className="text-xs text-gray-500 capitalize">{productToDelete.category} • {productToDelete.price.toLocaleString()} DA</p>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setProductToDelete(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={handleConfirmDelete}
              >
                <Trash2 size={14} />
                Delete Product
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
    </RoleGuard>
  );
}
