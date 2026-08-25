export interface Review {
  id: number;
  name: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  product: string;
  avatar: string;
}

export const reviews: Review[] = [
  {
    id: 1,
    name: "كريم ر.",
    rating: 5,
    comment: "أفضل طقم لبسته في حياتي. القماش ممتاز والخياطة عالمية. طلبت 2 وما ندمتش!",
    date: "2025-05-15",
    verified: true,
    product: "Nike Nocta Ensemble",
    avatar: "KR",
  },
  {
    id: 2,
    name: "مهدي س.",
    rating: 5,
    comment: "طقم BMW Motorsport فخامة حقيقية، القماش ممتاز والتصميم عالمي 🔥",
    date: "2025-05-12",
    verified: true,
    product: "BMW Motorsport Ensemble",
    avatar: "MS",
  },
  {
    id: 3,
    name: "أمين ب.",
    rating: 5,
    comment: "جربت مواقع كثيرة بصح ROVA مختلفة. الجودة حقيقية والأسعار معقولة. راني حبيت القطن متاع النوكتا.",
    date: "2025-05-10",
    verified: true,
    product: "Nike Nocta Ensemble",
    avatar: "AB",
  },
  {
    id: 4,
    name: "يوسف د.",
    rating: 5,
    comment: "تي شيرت جوردان هايل بزاف، القماش روعة وتنقاس طوب.",
    date: "2025-05-08",
    verified: true,
    product: "T-Shirt Oversize Jordan Minimalist",
    avatar: "YD",
  },
  {
    id: 5,
    name: "سليم خ.",
    rating: 5,
    comment: "الطلب وصلني في 3 أيام ل الجزائر العاصمة. التغليف فاخر والقطعة أحسن من الصورة!",
    date: "2025-05-05",
    verified: true,
    product: "Nike Nocta Ensemble",
    avatar: "SK",
  },
  {
    id: 6,
    name: "رضا م.",
    rating: 5,
    comment: "ديبارشور نايكي خفيف ومرن ممتاز للتمرين، الجودة ما شاء الله.",
    date: "2025-05-03",
    verified: true,
    product: "Débardeur Nike Dri-FIT Premium",
    avatar: "RM",
  },
];
