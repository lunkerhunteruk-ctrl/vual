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

  // VUAL のリンクの見え方（LINE・SNS で送った時の題・説明・画像）。2026-10-27 作り直し：
  // 題はトップの見出しと同じ「One world, in stills and film.」、画像は Galleria Borghese の映像の一場面（public/og/vual.jpg）、
  // アイコンは app/icon.png（黒地に生成りの V）。言葉は見ている言語に合わせる
  const en = headersList.get("x-next-intl-locale") === "en";
  const title = "VUAL — One world, in stills and film.";
  const description = en
    ? "Fashion stills and film made from real garments, in one world — entirely with AI. A visual studio in the UK and Japan."
    : "実物の服から、写真と映像を一つの世界観で。撮影をせず、すべてAIで作るファッションのビジュアルスタジオ。UK / Japan";
  const image = { url: "/og/vual.jpg", width: 1200, height: 630, alt: "VUAL — Galleria Borghese" };
  return {
    title,
    description,
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
      title,
      description,
      url: "https://vual.jp",
      locale: en ? "en_GB" : "ja_JP",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
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
