"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, Pencil, Grid3X3, List, ExternalLink } from "lucide-react";
import { fetchProducts } from "@/lib/api";
import Badge from "@/components/ui/Badge";

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

  useEffect(() => {
    fetchProducts().then((data) => {
      setProductList(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

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
                        <Link href={`/dashboard/products/${product.id}`} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                          <Pencil size={14} />
                        </Link>
                        <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
