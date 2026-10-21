import type { MetadataRoute } from 'next';
import { liveIssues } from '@/lib/latitude';

// 公開予約の号が時刻を過ぎたら載るよう、数分ごとに作り直す
export const revalidate = 300;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://vual.jp';
  const locales = ['ja', 'en'];
  const now = new Date();

  const routes = [
    { path: '/business', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/shopify', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/company', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/latitude', priority: 0.7, changeFrequency: 'weekly' as const },
    ...liveIssues().map((i) => ({ path: `/latitude/${i.slug}`, priority: 0.6, changeFrequency: 'monthly' as const })),
  ];

  return routes.flatMap(({ path, priority, changeFrequency }) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${base}/${l}${path}`])
        ),
      },
    }))
  );
}
