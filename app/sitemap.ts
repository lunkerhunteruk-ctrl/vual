import type { MetadataRoute } from 'next';
import { PEOPLE, liveIssues } from '@/lib/latitude';

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
    { path: '/latitude/about', priority: 0.5, changeFrequency: 'monthly' as const },
  ];
  // 2026-10-30 号のページは本文が英語で、本体（canonical）は /en だけ。サイトマップにも本体だけを載せる
  const issues = liveIssues().map((i) => ({
    url: `${base}/en/latitude/${i.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // 2026-10-30 人のページ（本文は英語。本体は /en）
  const people = PEOPLE.map((p) => ({
    url: `${base}/en/latitude/people/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [
    ...people,
    ...routes.flatMap(({ path, priority, changeFrequency }) =>
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
    ),
    ...issues,
  ];
}
