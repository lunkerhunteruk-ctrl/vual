import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { VualLandingPage } from '@/components/lp/LandingPage';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lp.hero' });
  const isJa = locale === 'ja';
  return {
    title: isJa
      ? 'VUAL — AIファッション撮影・AIルック生成・バーチャル試着 | アパレル向けAIプラットフォーム'
      : 'VUAL — AI Fashion Photography, Look Generation & Virtual Try-On',
    description: isJa
      ? 'AIでファッション撮影・ルック生成・バーチャル試着を実現。スタジオ撮影コストを90%削減。アパレル・ファッションEC向けAIイメージ生成・AIモデル撮影SaaSプラットフォーム。'
      : 'AI-powered fashion photography, look generation, and virtual try-on. Cut studio costs by 90%. Built for apparel brands and fashion e-commerce.',
    keywords: isJa
      ? ['AIファッション撮影', 'AIルック生成', 'AIイメージ生成', 'AIモデル撮影', 'バーチャル試着', 'AI試着', 'アパレル AI', 'ファッション AI', 'ECサイト 商品撮影 AI', 'ルックブック AI', 'AI editorial', 'VTON', 'VUAL']
      : ['AI fashion photography', 'AI look generation', 'AI model photography', 'virtual try-on', 'apparel AI', 'fashion e-commerce AI', 'VTON', 'VUAL'],
    openGraph: {
      type: 'website',
      siteName: 'VUAL',
      title: isJa
        ? 'VUAL — AIファッション撮影・ルック生成・バーチャル試着'
        : 'VUAL — AI Fashion Photography & Virtual Try-On',
      description: isJa
        ? 'AIでファッション撮影・ルック生成・バーチャル試着を実現。アパレルブランド向けAIプラットフォーム。'
        : 'AI-powered fashion photography and virtual try-on for apparel brands.',
      url: `https://vual.jp/${locale}/business`,
      locale: isJa ? 'ja_JP' : 'en_US',
    },
  };
}

export default function BusinessPage() {
  return <VualLandingPage />;
}
