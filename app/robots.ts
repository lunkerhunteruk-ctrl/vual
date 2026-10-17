import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ja/', '/en/'],
        disallow: ['/admin/', '/api/', '/(customer)/', '/proposals/', '/ja/for/', '/en/for/'],
      },
    ],
    sitemap: 'https://vual.jp/sitemap.xml',
  };
}
