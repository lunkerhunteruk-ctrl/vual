import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin('./i18n.ts');

// 2026-11-04 日本語の制作ノートの置き場（note のマガジン「LATITUDE 制作ノート」）
const NOTE_JA_URL = 'https://note.com/sachiokawasaki/m/mf5725176786b';

const nextConfig: NextConfig = {
  // 2026-11-02 LATITUDE の制作ノート（英語は Substack・日本語は note）への短いアドレス。Instagram の画像・投稿文に書く（押せないので覚えやすい形）。
  // 行き先が変わってもここだけ直す（一時的な転送 307 にしてある）
  async redirects() {
    return [
      // 2026-11-02 ブラウザの第一言語が日本語 → 日本語のノート、それ以外 → 英語（サイトの既定は ja なので middleware には任せない）
      // 2026-11-04 日本語のノートは note のマガジンへ移した（Substack は英語だけ）
      { source: '/notes', has: [{ type: 'header', key: 'accept-language', value: '^\\s*ja.*' }], destination: NOTE_JA_URL, permanent: false },
      { source: '/notes', destination: 'https://sachiokawasaki.substack.com', permanent: false },
      { source: '/ja/notes', destination: NOTE_JA_URL, permanent: false },
      { source: '/en/notes', destination: 'https://sachiokawasaki.substack.com', permanent: false },
      // 2026-11-11 LATITUDE の店の種類を5つにまとめた：抹茶（matcha）とコーヒー（coffee）は喫茶（cafe）へ。古い種類のページを 301 で転送（器 craft は同じアドレスのまま「工芸」）
      { source: '/:locale(ja|en)/latitude/places/:city/:old(matcha|coffee)', destination: '/:locale/latitude/places/:city/cafe', statusCode: 301 },
      { source: '/latitude/places/:city/:old(matcha|coffee)', destination: '/latitude/places/:city/cafe', statusCode: 301 },
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
