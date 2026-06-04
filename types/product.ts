export interface ProductColor {
  name: string;
  hex: string;
  swatch: string;
  image: string;
  bg: string;
}

export interface ProductReview {
  id: number;
  name: string;
  rating: number;
  text: string;
  date: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  bundlePrice: number;
  originalPrice?: number;
  category: string;
  sizes: string[];
  colors: ProductColor[];
  images: string[];
  stock: number;
  isNew: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  productType: string;
  status: "active" | "draft" | "out_of_stock";
  dateAdded: string;
  tag?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  count: number;
}
