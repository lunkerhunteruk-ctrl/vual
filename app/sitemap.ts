import type { MetadataRoute } from 'next';
import { PEOPLE, liveIssues } from '@/lib/latitude';
import { CITIES, areasOf, sectionsOf } from '@/lib/latitude-places';
import { getNote } from '@/lib/latitude-notes';

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
    { path: '/latitude/editor', priority: 0.5, changeFrequency: 'monthly' as const }, // 2026-11-08 編集長の紹介
    { path: '/latitude/press', priority: 0.4, changeFrequency: 'monthly' as const }, // 2026-11-11 紹介用のページ（プレス用）
  ];
  // 2026-10-30 号のページは本文が英語で、本体（canonical）は /en だけ。サイトマップにも本体だけを載せる
  const issues = liveIssues().map((i) => ({
    url: `${base}/en/latitude/${i.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // 2026-11-08 号ごとの制作ノート。日本語と英語は別の文章で、それぞれが本体
  const notes = liveIssues().filter((i) => getNote(i.slug)).flatMap((i) =>
    locales.map((locale) => ({
      url: `${base}/${locale}/latitude/${i.slug}/notes`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}/latitude/${i.slug}/notes`])) },
    }))
  );

  // 2026-10-30 人のページ（本文は英語。本体は /en）
  const people = PEOPLE.map((p) => ({
    url: `${base}/en/latitude/people/${p.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  // 2026-11-01 街のページ（店の一覧）。日本語と英語の両方が本体（canonical はそれぞれの言語）。街・種類・産業・地区（店が4軒以上の地区だけ）
  const placePaths = CITIES.flatMap((c) => [
    `/latitude/places/${c.slug}`,
    ...sectionsOf(c).map((s) => `/latitude/places/${c.slug}/${s.key}`), // 種類と、その街ならではの産業（2026-11-01）
    ...areasOf(c).map((a) => `/latitude/places/${c.slug}/area/${a.slug}`),
  ]);
  const places = placePaths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}/${l}${path}`])) },
    }))
  );

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
    ...notes,
    ...places,
  ];
}
