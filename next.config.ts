import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  // 2026-11-02 LATITUDE の制作ノート（Substack）への短いアドレス。Instagram の画像・投稿文に書く（押せないので覚えやすい形）。
  // 行き先が変わってもここだけ直す（一時的な転送 307 にしてある）
  async redirects() {
    return [
      // 2026-11-02 ブラウザの第一言語が日本語 → Substack の「ノート（日本語）」の欄、それ以外 → 英語（サイトの既定は ja なので middleware には任せない）
      { source: '/notes', has: [{ type: 'header', key: 'accept-language', value: '^\\s*ja.*' }], destination: 'https://sachiokawasaki.substack.com/s/7a4', permanent: false },
      { source: '/notes', destination: 'https://sachiokawasaki.substack.com', permanent: false },
      { source: '/ja/notes', destination: 'https://sachiokawasaki.substack.com/s/7a4', permanent: false },
      { source: '/en/notes', destination: 'https://sachiokawasaki.substack.com', permanent: false },
    ];
  },
  // LATITUDE のレシピ（服・場面の写真）を体験の API と号のページから読めるように
  outputFileTracingIncludes: {
    '/api/latitude/step-into': ['./data/latitude-recipes/**/*'],
    '/[locale]/latitude/[slug]': ['./data/latitude-recipes/**/recipe.json'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'abgwfcnjjqiimuxxibnx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-63bccf8e4ef949bb8384ab641631a180.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-06cdb49d80dd4dd58d0b4d1f6adf4203.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'lufis.net',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
