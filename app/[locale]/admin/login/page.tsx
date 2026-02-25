'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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
      await signInWithEmailAndPassword(auth, email, password);
      router.push(`/${locale}/admin`);
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
