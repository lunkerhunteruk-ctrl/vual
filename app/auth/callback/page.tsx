'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LIFF Auth Callback Proxy
 *
 * This page is used as LIFF's Endpoint URL (https://vual.jp/auth/callback).
 * After LINE login, LIFF redirects here. We then redirect the user back to
 * their original subdomain URL stored in the `returnTo` query parameter.
 *
 * This allows a single LIFF app to serve all *.vual.jp subdomains.
 *
 * LINE Developers Console setup:
 * - LIFF Endpoint URL: https://vual.jp/auth/callback
 * - LINE Login Callback URL: https://vual.jp/auth/callback
 */
export default function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Also check hash fragment (LIFF sometimes puts params there)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));

    const returnTo = params.get('returnTo') || hashParams.get('returnTo');

    if (returnTo) {
      // Validate the returnTo URL is a vual.jp subdomain for security
      try {
        const url = new URL(returnTo);
        if (url.hostname.endsWith('.vual.jp') || url.hostname === 'vual.jp') {
          window.location.replace(returnTo);
          return;
        }
      } catch {
        // Invalid URL, fall through to default
      }
    }

    // Fallback: redirect to root domain
    window.location.replace('https://vual.jp');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-sm text-[var(--color-text-body)]">ログイン中...</p>
      </div>
    </div>
  );
}
