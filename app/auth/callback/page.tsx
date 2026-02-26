'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LIFF Auth Callback Proxy
 *
 * This page is the LIFF Endpoint URL (https://vual.jp/auth/callback).
 * After LINE login, LIFF redirects here with liff.state containing the
 * original returnTo parameter. We extract it and redirect back.
 *
 * Flow:
 * 1. User on vualofficial.vual.jp/ja/tryon clicks LINE login
 * 2. LiffProvider.login() sets redirectUri = vual.jp/auth/callback?returnTo=<encoded original URL>
 * 3. LINE OAuth completes, redirects to vual.jp/auth/callback?liff.state=<returnTo=...>
 * 4. This page extracts returnTo from liff.state and redirects back
 */
export default function AuthCallbackPage() {
  useEffect(() => {
    // LIFF puts our query params inside liff.state
    // URL looks like: /auth/callback?liff.state=returnTo%3Dhttps%253A%252F%252F...
    const params = new URLSearchParams(window.location.search);

    // Try direct returnTo first
    let returnTo = params.get('returnTo');

    // If not found, check inside liff.state (LIFF encodes our params there)
    if (!returnTo) {
      const liffState = params.get('liff.state');
      if (liffState) {
        const stateParams = new URLSearchParams(liffState);
        returnTo = stateParams.get('returnTo');
      }
    }

    // Also check hash fragment
    if (!returnTo && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      returnTo = hashParams.get('returnTo');
      if (!returnTo) {
        const hashLiffState = hashParams.get('liff.state');
        if (hashLiffState) {
          const stateParams = new URLSearchParams(hashLiffState);
          returnTo = stateParams.get('returnTo');
        }
      }
    }

    if (returnTo) {
      try {
        const url = new URL(returnTo);
        if (url.hostname.endsWith('.vual.jp') || url.hostname === 'vual.jp') {
          window.location.replace(returnTo);
          return;
        }
      } catch {
        // Invalid URL, fall through
      }
    }

    // Fallback: redirect to root
    window.location.replace('https://vual.jp/ja');
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
