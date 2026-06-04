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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch Meta Pixel ID from Supabase store_settings
  let pixelId = "000000000000";
  try {
    const { data } = await supabase
      .from("store_settings")
      .select("meta_pixel_id")
      .eq("id", 1)
      .single();
    if (data?.meta_pixel_id) pixelId = data.meta_pixel_id;
  } catch (err) {
    console.error("Error fetching FB Pixel from DB", err);
  }

  return (
    <html lang="fr" className={`${montserrat.variable} ${dmSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="manifest" href="/manifest.json" />
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <I18nProvider>
          {children}
        </I18nProvider>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          />
        </noscript>
      </body>
    </html>
  );
}
