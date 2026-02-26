'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { initLiff, getProfile } from '@/lib/liff';

/**
 * LIFF Auth Callback Proxy
 *
 * Flow:
 * 1. User clicks LINE login on any *.vual.jp subdomain
 * 2. Redirected to LINE OAuth → then to this page (vual.jp/auth/callback)
 * 3. This page initializes LIFF on the correct domain (vual.jp)
 * 4. Gets the user profile, encodes it as URL params
 * 5. Redirects to the original subdomain with lineAuth params
 * 6. LiffProvider on the subdomain reads these params and sets customer
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState('ログイン中...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract returnTo from URL or liff.state
        const params = new URLSearchParams(window.location.search);
        let returnTo = params.get('returnTo');

        if (!returnTo) {
          const liffState = params.get('liff.state');
          if (liffState) {
            const stateParams = new URLSearchParams(liffState);
            returnTo = stateParams.get('returnTo');
          }
        }

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

        // Initialize LIFF on vual.jp domain (matches Endpoint URL)
        setStatus('認証情報を取得中...');
        const liffInstance = await initLiff();

        if (liffInstance.isLoggedIn()) {
          const profile = await getProfile();

          if (profile && returnTo) {
            try {
              const url = new URL(returnTo);
              if (url.hostname.endsWith('.vual.jp') || url.hostname === 'vual.jp') {
                // Pass LINE profile as URL params to the subdomain
                url.searchParams.set('lineUserId', profile.userId);
                url.searchParams.set('lineDisplayName', profile.displayName);
                if (profile.pictureUrl) {
                  url.searchParams.set('linePhoto', profile.pictureUrl);
                }
                url.searchParams.set('lineAuth', '1');
                window.location.replace(url.toString());
                return;
              }
            } catch {
              // Invalid URL
            }
          }
        }

        // Fallback
        if (returnTo) {
          try {
            const url = new URL(returnTo);
            if (url.hostname.endsWith('.vual.jp') || url.hostname === 'vual.jp') {
              window.location.replace(returnTo);
              return;
            }
          } catch {
            // fall through
          }
        }

        window.location.replace('https://vual.jp/ja');
      } catch (err) {
        console.error('Auth callback error:', err);
        setStatus('エラーが発生しました。リダイレクト中...');
        setTimeout(() => {
          window.location.replace('https://vual.jp/ja');
        }, 2000);
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={32} className="animate-spin text-[var(--color-accent)] mx-auto mb-4" />
        <p className="text-sm text-[var(--color-text-body)]">{status}</p>
      </div>
    </div>
  );
}
