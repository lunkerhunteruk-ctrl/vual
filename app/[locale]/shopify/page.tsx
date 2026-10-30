import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ShopifyLP from '@/components/lp/ShopifyLP';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'shopify.meta' });
  return {
    // 2026-10-30 本体の印はこのページ自身（ja・en は中身がちがうので、それぞれが本体で、たがいに言語ちがいとして結ぶ）
    alternates: {
      canonical: `/${locale}/shopify`,
      languages: { ja: '/ja/shopify', en: '/en/shopify', 'x-default': '/en/shopify' },
    },
    title: t('title'),
    description: t('description'),
  };
}

export default function ShopifyPage() {
  return <ShopifyLP />;
}
