"use client";

import { useState, useEffect, useCallback } from "react";
import { products as defaultProducts, Product } from "@/data/products";

const STORAGE_KEY = "rova_products";

function loadProducts(): Product[] {
  if (typeof window === "undefined") return defaultProducts;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Product[];
      // Merge saved data with defaults (in case new fields were added)
      return defaultProducts.map((dp) => {
        const saved = parsed.find((p) => p.id === dp.id);
        return saved ? { ...dp, ...saved } : dp;
      });
    }
  } catch {
    // ignore
  }
  return defaultProducts;
}

function saveProducts(products: Product[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function useProductStore() {
  const [productList, setProductList] = useState<Product[]>(defaultProducts);

  useEffect(() => {
    setProductList(loadProducts());
  }, []);

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setProductList((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      saveProducts(next);
      return next;
    });
  }, []);

  const getProduct = useCallback(
    (id: number) => productList.find((p) => p.id === id),
    [productList]
  );

  const getProductBySlug = useCallback(
    (slug: string) => productList.find((p) => p.slug === slug),
    [productList]
  );

  return { productList, updateProduct, getProduct, getProductBySlug };
}

// Static version for server components / initial render
export function getStoredProducts(): Product[] {
  return loadProducts();
}
