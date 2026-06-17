import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://vual.jp';
  const locales = ['ja', 'en'];
  const now = new Date();

  const routes = [
    { path: '/business', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/shopify', priority: 0.9, changeFrequency: 'monthly' as const },
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
