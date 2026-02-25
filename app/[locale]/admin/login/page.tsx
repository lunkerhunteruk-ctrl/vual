'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { supabase } from '@/lib/supabase';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const googleProvider = new GoogleAuthProvider();

async function redirectToShop(uid: string, locale: string) {
  // Check if on root domain
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const isRootDomain = parts.length <= 2 || parts[0] === 'www';

  if (!isRootDomain || !supabase || !db) {
    // Already on subdomain, stay here
    window.location.href = `${window.location.origin}/${locale}/admin`;
    return;
  }

  // Fetch user's shopId from Firestore, then slug from Supabase
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const shopId = userDoc.data()?.shopId;
    if (shopId) {
      const { data } = await supabase.from('stores').select('slug').eq('id', shopId).single();
      if (data?.slug) {
        const baseDomain = hostname.split('.').slice(-2).join('.');
        window.location.href = `${window.location.protocol}//${data.slug}.${baseDomain}/${locale}/admin`;
        return;
      }
    }
  } catch (e) {
    console.error('Shop redirect failed:', e);
  }

  // Fallback: stay on current domain
  window.location.href = `${window.location.origin}/${locale}/admin`;
}

export default function AdminLoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setIsSubmitting(true);
    setError('');

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await redirectToShop(credential.user.uid, locale);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(locale === 'ja' ? 'メールアドレスまたはパスワードが正しくありません' : 'Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError(locale === 'ja' ? 'ログイン試行回数が多すぎます。しばらくしてからお試しください' : 'Too many attempts. Please try again later');
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await redirectToShop(result.user.uid, locale);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed popup, do nothing
      } else {
        setError(err.message || 'Google login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email && password) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            VUAL
          </h1>
          <p className="text-sm text-neutral-500 mt-2">
            {locale === 'ja' ? '管理画面ログイン' : 'Admin Login'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full h-11 flex items-center justify-center gap-3 bg-white border border-neutral-200 text-sm font-medium text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {locale === 'ja' ? 'Googleでログイン' : 'Log in with Google'}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-200" />
              <span className="text-xs text-neutral-400">
                {locale === 'ja' ? 'または' : 'or'}
              </span>
              <div className="flex-1 h-px bg-neutral-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {locale === 'ja' ? 'メールアドレス' : 'Email'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-4 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                {locale === 'ja' ? 'パスワード' : 'Password'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={locale === 'ja' ? 'パスワード' : 'Password'}
                  className="w-full h-11 pl-10 pr-4 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={!email || !password || isSubmitting}
              className="w-full h-11 flex items-center justify-center gap-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {locale === 'ja' ? 'ログイン' : 'Log in'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Signup link */}
        <p className="text-center text-sm text-neutral-500 mt-6">
          {locale === 'ja' ? 'アカウントをお持ちでない方' : "Don't have an account?"}{' '}
          <Link href={`/${locale}/signup`} className="text-neutral-900 font-medium hover:underline">
            {locale === 'ja' ? 'ショップを開設' : 'Create Shop'}
          </Link>
        </p>
      </div>
    </div>
  );
}
