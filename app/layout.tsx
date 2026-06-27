import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VUAL — AIクリエイティブ・エンジニアリング",
  description: "デザイン × テクノロジー × ファッション。AIが力を与える",
  keywords: [
    "AIファッション撮影", "AIルック生成", "AIイメージ生成", "AIモデル撮影",
    "バーチャル試着", "AI試着", "アパレル AI", "ファッション AI",
    "ECサイト 商品撮影", "AI fashion photography", "AI model generation",
    "virtual try-on", "VTON", "VUAL",
  ],
  metadataBase: new URL("https://vual.jp"),
  alternates: {
    canonical: "/",
    languages: { "ja": "/ja", "en": "/en" },
  },
  openGraph: {
    type: "website",
    siteName: "VUAL",
    title: "VUAL — AIクリエイティブ・エンジニアリング",
    description: "デザイン × テクノロジー × ファッション。AIが力を与える",
    url: "https://vual.jp",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "VUAL — AIクリエイティブ・エンジニアリング",
    description: "デザイン × テクノロジー × ファッション。AIが力を与える",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-81H2X3FF55" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-81H2X3FF55');`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
