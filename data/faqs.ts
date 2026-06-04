export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export const faqs: FAQ[] = [
  {
    id: 1,
    question: "Comment passer une commande ?",
    answer: "Choisissez votre produit, sélectionnez la taille et la couleur, puis remplissez le formulaire de commande directement sur la page du produit. Aucun compte n'est nécessaire. Vous recevrez un appel de confirmation dans les 24h.",
  },
  {
    id: 2,
    question: "Quels sont les délais de livraison ?",
    answer: "La livraison prend généralement 2 à 5 jours ouvrables selon votre wilaya. Les zones 0 et 1 (Oran, Alger) sont livrées en 1-2 jours. Le Grand Sud peut prendre jusqu'à 7 jours.",
  },
  {
    id: 3,
    question: "Quels sont les modes de paiement acceptés ?",
    answer: "Nous acceptons le paiement à la livraison (Cash on Delivery) dans les 58 wilayas. Vous payez uniquement à la réception de votre colis. Paiement par CCP et BaridiMob également disponible.",
  },
  {
    id: 4,
    question: "Comment choisir la bonne taille ?",
    answer: "Consultez le guide des tailles sur chaque page produit. En général, nos tailles sont standard. Si vous hésitez entre deux tailles, nous recommandons de prendre la taille supérieure pour un look plus décontracté.",
  },
  {
    id: 5,
    question: "Puis-je retourner ou échanger un produit ?",
    answer: "Oui, vous disposez de 48h après réception pour nous contacter si le produit ne convient pas. L'échange est gratuit pour un changement de taille. Les retours sont acceptés si le produit est dans son état d'origine.",
  },
  {
    id: 6,
    question: "Les couleurs sont-elles fidèles aux photos ?",
    answer: "Nous faisons de notre mieux pour représenter fidèlement les couleurs. De légères variations peuvent exister en fonction de l'éclairage et des paramètres de votre écran. N'hésitez pas à nous contacter pour plus de photos.",
  },
];
