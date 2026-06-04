"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, ImagePlus, X, Trash2, Plus, Check } from "lucide-react";
import { fetchProducts, updateProduct as apiUpdateProduct, createHistory } from "@/lib/api";

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

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const productId = parseInt(params.id);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [sizes, setSizes] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [stock, setStock] = useState(0);
  const [status, setStatus] = useState<string>("active");
  const [newSize, setNewSize] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProducts().then((data) => {
      const p = (data || []).find((p: Product) => p.id === productId);
      if (p) {
        setProduct(p);
        setName(p.name);
        setDescription(p.description);
        setPrice(p.price);
        setBundlePrice(p.bundle_price);
        setSizes([...p.sizes]);
        setImages([...p.images]);
        setStock(p.stock);
        setStatus(p.status);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <X size={24} className="text-gray-600" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Product not found</h2>
        <button onClick={() => router.push("/dashboard/products")} className="text-sm text-accent hover:underline mt-2">
          ← Back to products
        </button>
      </div>
    );
  }

  const savings = (price * 2) - bundlePrice;
  const discountPercent = price > 0 ? Math.round((savings / (price * 2)) * 100) : 0;

  const handleSave = async () => {
    try {
      await apiUpdateProduct(productId, {
        name,
        description,
        price,
        bundle_price: bundlePrice,
        sizes,
        images,
        stock,
        status,
      });
      await createHistory({
        action: "product_updated",
        description: `Product "${name}" updated`,
        details: `Price: ${price} DA, Bundle: ${bundlePrice} DA, Sizes: ${sizes.join(", ")}`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const addSize = () => {
    const s = newSize.trim().toUpperCase();
    if (s && !sizes.includes(s)) {
      setSizes([...sizes, s]);
      setNewSize("");
    }
  };

  const removeSize = (size: string) => setSizes(sizes.filter((s) => s !== size));

  const addImage = () => {
    const url = newImageUrl.trim();
    if (url && !images.includes(url)) {
      setImages([...images, url]);
      setNewImageUrl("");
    }
  };

  const removeImage = (url: string) => setImages(images.filter((i) => i !== url));

  const moveImage = (index: number, direction: -1 | 1) => {
    const newImages = [...images];
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= newImages.length) return;
    [newImages[index], newImages[swapIndex]] = [newImages[swapIndex], newImages[index]];
    setImages(newImages);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/products")} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white font-heading">Edit Product</h1>
            <p className="text-sm text-gray-500 mt-0.5">{product.slug}</p>
          </div>
        </div>
        <button onClick={handleSave} className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all active:scale-[0.97] ${saved ? "bg-emerald-500 text-white" : "bg-accent text-black hover:bg-accent-hover"}`}>
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Basic Info */}
          <div className="bg-surface rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" /> Basic Information
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Product Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none" />
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-surface rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Pricing & Bundle Offer
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Single Price (DA)</label>
                <input type="number" value={price} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Bundle Price (DA)</label>
                <input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
              </div>
            </div>
            {price > 0 && bundlePrice > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-400 mb-2">📦 Bundle Offer Preview</p>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white/50 text-xs">2 × {price.toLocaleString()} DA = <span className="line-through">{(price * 2).toLocaleString()} DA</span></span>
                    <span className="text-white font-bold text-lg tabular-nums">{bundlePrice.toLocaleString()} DA</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-emerald-400 font-bold text-sm">-{discountPercent}%</span>
                    <span className="text-amber-400 text-xs font-bold">وفّر {savings.toLocaleString()} DA 🔥</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sizes */}
          <div className="bg-surface rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Available Sizes
            </h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <div key={size} className="flex items-center gap-2 bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 group">
                  <span className="text-sm font-bold text-white">{size}</span>
                  <button onClick={() => removeSize(size)} className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><X size={12} /></button>
                </div>
              ))}
              <div className="flex items-center gap-1">
                <input type="text" value={newSize} onChange={(e) => setNewSize(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSize()} placeholder="Add..." className="w-20 bg-white/5 border border-dashed border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/50 transition-all" />
                <button onClick={addSize} className="p-2.5 bg-white/5 hover:bg-accent/20 border border-dashed border-white/10 rounded-xl text-gray-500 hover:text-accent transition-all"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-surface rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Product Images
              <span className="text-[10px] text-gray-500 font-normal ml-1">({images.length} images)</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img, idx) => (
                <div key={img} className="relative group aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                  <Image src={img} alt={`Product ${idx + 1}`} fill className="object-cover" sizes="200px" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {idx > 0 && <button onClick={() => moveImage(idx, -1)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs">←</button>}
                    <button onClick={() => removeImage(img)} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"><Trash2 size={12} /></button>
                    {idx < images.length - 1 && <button onClick={() => moveImage(idx, 1)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs">→</button>}
                  </div>
                  {idx === 0 && <span className="absolute top-2 left-2 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-md">PRIMARY</span>}
                </div>
              ))}
              <div className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:border-accent/30 transition-colors">
                <ImagePlus size={20} className="text-gray-600" />
                <span className="text-[10px] text-gray-600 font-medium">Add Image</span>
              </div>
            </div>
            <div className="flex gap-2">
              <input type="text" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addImage()} placeholder="Image path (e.g. /products/new.png)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
              <button onClick={addImage} className="px-4 py-2.5 bg-white/5 hover:bg-accent/20 border border-white/10 rounded-xl text-gray-400 hover:text-accent text-sm font-bold transition-all">Add</button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Status</h3>
            <div className="flex flex-col gap-2">
              {(["active", "out_of_stock", "draft"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${status === s ? "bg-white/10 text-white border border-white/20" : "bg-white/[0.02] text-gray-500 border border-white/5 hover:bg-white/5"}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${s === "active" ? "bg-emerald-400" : s === "out_of_stock" ? "bg-red-400" : "bg-gray-500"}`} />
                  {s === "active" ? "Active" : s === "out_of_stock" ? "Out of Stock" : "Draft"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stock</h3>
            <input type="number" value={stock} onChange={(e) => setStock(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all" />
          </div>

          <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Preview</h3>
            <div className="rounded-xl overflow-hidden border border-white/10">
              {images[0] && (
                <div className="relative aspect-square bg-white/5">
                  <Image src={images[0]} alt={name} fill className="object-cover" sizes="300px" />
                </div>
              )}
              <div className="p-3">
                <h4 className="text-sm font-bold text-white truncate">{name || "Product Name"}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-bold text-white tabular-nums">{price.toLocaleString()} DA</span>
                  {bundlePrice > 0 && bundlePrice < price * 2 && <span className="text-[10px] text-amber-400 font-bold">2 pcs: {bundlePrice.toLocaleString()} DA</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sizes.map((s) => <span key={s} className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md font-bold">{s}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-white/5 p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Quick Actions</h3>
            <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white font-medium transition-all">
              View Live Page
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
