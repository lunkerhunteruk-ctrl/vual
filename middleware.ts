import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';
import { extractSubdomain, STORE_SLUG_HEADER, STORE_SLUG_COOKIE, FALLBACK_STORE_SLUG } from './lib/store-resolver';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
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
    '/(en|ja)/:path*',
    '/((?!api|_next|_vercel|auth|.*\\..*).*)',
  ],
};
