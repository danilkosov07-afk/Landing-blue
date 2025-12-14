import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import siteData from "@/data/site.json";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: siteData.meta.title,
  description: siteData.meta.description,
  keywords: siteData.meta.keywords.split(",").map((k) => k.trim()),
  openGraph: {
    title: siteData.meta.title,
    description: siteData.meta.description,
    images: [{ url: siteData.meta.ogImage, width: 1200, height: 630 }],
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${montserrat.variable} antialiased bg-slate-950 text-white`}>
        {children}
      </body>
    </html>
  );
}
