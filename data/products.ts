export interface ShowcaseProduct {
  id: number;
  name: string;
  bg: string;
  tag: string;
  swatch: string;
  desc: string;
  review: string;
  productType: string;
  image: string;
  colorName: string;
}

export const noctaProducts: ShowcaseProduct[] = [
  {
    id: 1,
    name: "Nike Nocta Ensemble",
    bg: "#050505",
    tag: "Full Black",
    swatch: "#111111",
    desc: "Premium Nike Nocta ensemble featuring a lightweight tech tee and athletic shorts. Perfect for summer and training.",
    review: '"The best streetwear fit I own." — Karim R.',
    productType: "set",
    image: "/products/nocta_2.png",
    colorName: "Full Black",
  },
];

export const linProducts: ShowcaseProduct[] = [
  {
    id: 3,
    name: "Ensemble Lin Premium",
    bg: "#0a0a0a",
    tag: "Noir",
    swatch: "#1f1d1d",
    desc: "Ensemble en lin noir, élégance moderne et intemporelle. Léger, respirant et d'une classe absolue.",
    review: '"Très élégant en noir, le tissu est top." — Karim R.',
    productType: "set",
    image: "/products/ens1.png",
    colorName: "Noir",
  },
  {
    id: 4,
    name: "Ensemble Lin Premium",
    bg: "#0a0a0a",
    tag: "Noir",
    swatch: "#1f1d1d",
    desc: "Ensemble en lin noir, vue détaillée. Finition premium et coupe parfaite.",
    review: '"La coupe est incroyable, je recommande." — Mehdi S.',
    productType: "set",
    image: "/products/ens2.png",
    colorName: "Noir (Vue 2)",
  },
];

export const tshirtProducts: ShowcaseProduct[] = [
  {
    id: 10,
    name: "T-Shirt Oversize Rose",
    bg: "#0a0a0a",
    tag: "Oversize",
    swatch: "#111111",
    desc: "T-Shirt oversize noir avec design rose dorée. Coupe large et confortable, tissu premium 100% coton épais.",
    review: '"القطعة فخامة حقيقية، القماش سميك والتصميم ممتاز 🔥" — أمين ب.',
    productType: "tshirt",
    image: "/products/tshirt.jpg",
    colorName: "Noir",
  },
  {
    id: 11,
    name: "T-Shirt Oversize Rose",
    bg: "#0a0a0a",
    tag: "Oversize",
    swatch: "#111111",
    desc: "Vue avant et arrière. Design rose dorée imprimé sur le dos, coupe oversize streetwear.",
    review: '"أحسن تي شيرت لبسته، الخياطة عالمية والقماش ممتاز" — سليم خ.',
    productType: "tshirt",
    image: "/products/tshirt2.png",
    colorName: "Noir (Vue 2)",
  },
  {
    id: 12,
    name: "T-Shirt Oversize Rose",
    bg: "#0a0a0a",
    tag: "Oversize",
    swatch: "#111111",
    desc: "Détail du design avec la rose dorée sur le devant et le dos. Pièce unique et stylée.",
    review: '"تصميم فريد وجودة عالية، شكراً ROVA!" — كريم ر.',
    productType: "tshirt",
    image: "/products/tshirt3.png",
    colorName: "Noir (Vue 3)",
  },
];

export const bmwProducts: ShowcaseProduct[] = [
  {
    id: 20,
    name: "BMW Motorsport Ensemble",
    bg: "#0a0a0a",
    tag: "Motorsport",
    swatch: "#111111",
    desc: "Ensemble Puma × BMW M Motorsport. T-shirt et short assortis avec détails signature M Motorsport. Style sportif premium.",
    review: '"طقم BMW فخامة حقيقية، القماش ممتاز والتصميم عالمي 🔥" — أمين ب.',
    productType: "set",
    image: "/products/bmw1.png",
    colorName: "Noir / Blanc",
  },
  {
    id: 21,
    name: "BMW Motorsport Ensemble",
    bg: "#0a0a0a",
    tag: "Motorsport",
    swatch: "#0033a0",
    desc: "Ensemble Puma × BMW M Motorsport avec liseré bleu. Coupe moderne et finition premium pour un look racing authentique.",
    review: '"لبسته وكلش عجبهم، الجودة والتصميم ما يتقارنوش" — سليم خ.',
    productType: "set",
    image: "/products/bmw2.jpg",
    colorName: "Noir / Bleu",
  },
];

// Simple product list for shop page and other components
export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: number;
  bundlePrice: number;
  images: string[];
  category: string;
  sizes: string[];
  colors: { name: string; hex: string }[];
  tag: string | null;
  status: "active" | "out_of_stock" | "draft";
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  stock: number;
  dateAdded: string;
  showcaseType: "nocta" | "lin" | "tshirt" | "bmw";
}

export const products: Product[] = [
  {
    id: 1,
    slug: "nike-nocta-ensemble",
    name: "Nike Nocta Ensemble",
    description: "Premium Nike Nocta ensemble featuring a lightweight tech tee and athletic shorts. Perfect for summer and training.",
    price: 5400,
    bundlePrice: 8200,
    images: ["/products/nocta_2.png", "/products/nocta_1.png", "/products/nocta_3.png"],
    category: "ensembles",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Full Black", hex: "#111111" }],
    tag: "Full Black",
    status: "active",
    isFeatured: true,
    rating: 4.8,
    reviewCount: 120,
    stock: 45,
    dateAdded: "2025-05-01",
    showcaseType: "nocta",
  },
  {
    id: 2,
    slug: "ensemble-lin-premium",
    name: "Ensemble Lin Premium",
    description: "Ensemble en lin noir, élégance moderne et intemporelle. Léger, respirant et d'une classe absolue.",
    price: 5400,
    bundlePrice: 8200,
    images: ["/products/ens1.png", "/products/ens2.png"],
    category: "ensembles",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Noir", hex: "#1f1d1d" }],
    tag: "Premium Lin",
    status: "active",
    isFeatured: true,
    rating: 4.9,
    reviewCount: 95,
    stock: 38,
    dateAdded: "2025-05-10",
    showcaseType: "lin",
  },
  {
    id: 3,
    slug: "tshirt-oversize-rose",
    name: "T-Shirt Oversize Rose",
    description: "T-Shirt oversize noir avec design rose dorée. Coupe large et confortable, tissu premium 100% coton épais.",
    price: 3100,
    bundlePrice: 5400,
    images: ["/products/tshirt.jpg", "/products/tshirt2.png", "/products/tshirt3.png"],
    category: "tshirts",
    sizes: ["M", "L", "XL"],
    colors: [{ name: "Noir", hex: "#111111" }],
    tag: "Oversize",
    status: "active",
    isFeatured: true,
    rating: 4.9,
    reviewCount: 87,
    stock: 60,
    dateAdded: "2025-06-10",
    showcaseType: "tshirt",
  },
  {
    id: 4,
    slug: "bmw-motorsport-ensemble",
    name: "BMW Motorsport Ensemble",
    description: "Ensemble Puma × BMW M Motorsport. T-shirt et short assortis avec détails signature M Motorsport. Style sportif premium.",
    price: 5400,
    bundlePrice: 8200,
    images: ["/products/bmw1.png", "/products/bmw2.jpg"],
    category: "ensembles",
    sizes: ["M", "L", "XL"],
    colors: [
      { name: "Noir / Blanc", hex: "#111111" },
      { name: "Noir / Bleu", hex: "#0033a0" },
    ],
    tag: "Motorsport",
    status: "active",
    isFeatured: true,
    rating: 4.9,
    reviewCount: 95,
    stock: 50,
    dateAdded: "2025-06-15",
    showcaseType: "bmw",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
