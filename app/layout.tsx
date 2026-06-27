import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
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

const WARDROBE_HOSTS = ["vwardrobe.com", "www.vwardrobe.com", "v-wardrobe.com", "www.v-wardrobe.com"];

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isWardrobe = WARDROBE_HOSTS.some((h) => host.includes(h));

  if (isWardrobe) {
    return {
      title: "V WARDROBE — AIでコーデを作る時代。",
      description: "あなたの服をAIでスタイリング。ルック生成、試着、公開まで。",
      keywords: [
        "AIコーデ生成", "AIルック生成", "バーチャル試着", "AI試着",
        "ファッション AI", "コーディネート AI", "V WARDROBE", "VUAL",
      ],
      metadataBase: new URL("https://vwardrobe.com"),
      openGraph: {
        type: "website",
        siteName: "V WARDROBE",
        title: "V WARDROBE — AIでコーデを作る時代。",
        description: "あなたの服をAIでスタイリング。ルック生成、試着、公開まで。",
        url: "https://vwardrobe.com",
        locale: "ja_JP",
      },
      twitter: {
        card: "summary_large_image",
        title: "V WARDROBE — AIでコーデを作る時代。",
        description: "あなたの服をAIでスタイリング。ルック生成、試着、公開まで。",
      },
    };
  }

  return {
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
}

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
