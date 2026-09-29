import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat, DM_Sans } from "next/font/google";
import { I18nProvider } from "@/hooks/useI18n";
import { supabase } from "@/lib/supabase";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ROVA — Streetwear Premium",
  description:
    "Élevez votre quotidien avec du streetwear premium. Livraison 58 Wilayas. Paiement à la livraison.",
  keywords: ["ROVA", "streetwear", "Algérie", "vêtements", "mode", "premium"],
  openGraph: {
    title: "ROVA — Streetwear Premium",
    description: "Élevez votre quotidien avec du streetwear premium.",
    type: "website",
  },
};

import { Suspense } from "react";
import PixelScripts from "@/components/PixelScripts";

export const revalidate = 60; // Revalidate layout data every 60 seconds

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${montserrat.variable} ${dmSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
        <Suspense fallback={null}>
          <PixelScripts />
        </Suspense>
      </body>
    </html>
  );
}
