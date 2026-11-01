import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { extractSubdomain, STORE_SLUG_HEADER, STORE_SLUG_COOKIE, FALLBACK_STORE_SLUG } from './lib/store-resolver';
import { aiCrawlerName, isAiCrawlPath, logAiCrawl } from './lib/ai-crawl-log';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const WARDROBE_HOSTS = ['vwardrobe.com', 'www.vwardrobe.com', 'v-wardrobe.com', 'www.v-wardrobe.com'];
const VWARDROBE_ADMIN_HOSTS = ['admin.vwardrobe.com'];

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // [ai-crawl 2026-11-01] AI のクローラが LATITUDE・llms.txt・robots.txt・sitemap.xml を読んだ記録（応答は待たせない）。lib/ai-crawl-log.ts
  if (isAiCrawlPath(host, pathname)) {
    const bot = aiCrawlerName(request.headers.get('user-agent'));
    if (bot) event.waitUntil(logAiCrawl(bot, pathname, request.method));
  }
  // 記録のためだけに matcher へ足したファイルは、ここで素通しする（言語の振り分けにかけない）
  if (/^\/(llms(-full)?\.txt|robots\.txt|sitemap\.xml)$/.test(pathname)) return NextResponse.next();

  // vwardrobe.com: redirect root locale paths → /[locale]/wardrobe
  const cleanHost = host.split(':')[0];
  if (WARDROBE_HOSTS.includes(cleanHost)) {
    const matchedLocale = locales.find((l) => pathname === `/${l}` || pathname === `/${l}/`);
    const isRoot = pathname === '/' || pathname === '';
    if (isRoot || matchedLocale) {
      const locale = matchedLocale ?? defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/wardrobe`, request.url));
    }
  }

  // admin.vwardrobe.com → route to /vwardrobe-admin namespace
  if (VWARDROBE_ADMIN_HOSTS.includes(cleanHost)) {
    const url = request.nextUrl.clone();
    const localeMatch = pathname.match(/^\/(en|ja)(\/.*)?$/);
    const locale = localeMatch?.[1] ?? defaultLocale;
    const subpath = localeMatch?.[2] ?? '';

    if (subpath.startsWith('/vwardrobe-admin')) {
      // Already under vwardrobe-admin — process normally
      const response = intlMiddleware(request);
      response.headers.set(STORE_SLUG_HEADER, FALLBACK_STORE_SLUG);
      response.cookies.set(STORE_SLUG_COOKIE, FALLBACK_STORE_SLUG, { httpOnly: false, path: '/', sameSite: 'lax' });
      return response;
    }

    // Redirect to vwardrobe-admin path
    url.pathname = `/${locale}/vwardrobe-admin${subpath}`;
    return NextResponse.redirect(url);
  }

  const subdomain = extractSubdomain(host);

  // Delegate to next-intl middleware for locale routing
  const response = intlMiddleware(request);

  // Inject store slug into response header and cookie
  if (subdomain) {
    response.headers.set(STORE_SLUG_HEADER, subdomain);
    response.cookies.set(STORE_SLUG_COOKIE, subdomain, {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
    });
  } else {
    // Root domain — set fallback store slug
    response.headers.set(STORE_SLUG_HEADER, FALLBACK_STORE_SLUG);
    response.cookies.set(STORE_SLUG_COOKIE, FALLBACK_STORE_SLUG, {
      httpOnly: false,
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/',
    // [ai-crawl 2026-11-01] 下の行は「.」の付くパスを外すので、記録したいファイルだけ足す
    '/llms.txt',
    '/llms-full.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/(en|ja)/:path*',
    '/((?!api|_next|_vercel|auth|.*\\..*).*)',
  ],
};
