'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, Store, Mail, Lock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const locale = useLocale();
  const [step, setStep] = useState(1);

  // Step 1
  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Step 2
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 3
  const [registeredSlug, setRegisteredSlug] = useState('');

  // Auto-generate slug from shop name
  useEffect(() => {
    if (!slugEdited && shopName) {
      const generated = shopName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 30);
      setSlug(generated);
    }
  }, [shopName, slugEdited]);

  // Check slug availability with debounce
  const checkSlug = useCallback(async (s: string) => {
    if (!s || s.length < 3) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    try {
      const res = await fetch(`/api/stores/check-slug?slug=${encodeURIComponent(s)}`);
      const data = await res.json();
      if (data.available) {
        setSlugStatus('available');
      } else if (data.reason === 'invalid') {
        setSlugStatus('invalid');
      } else {
        setSlugStatus('taken');
      }
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    const timer = setTimeout(() => checkSlug(slug), 500);
    return () => clearTimeout(timer);
  }, [slug, checkSlug]);

  const handleStep1Next = () => {
    if (shopName && slug && slugStatus === 'available') {
      setStep(2);
    }
  };

  const handleSignup = async () => {
    if (!email || !password) return;
    setIsSubmitting(true);
    setError('');

    try {
      // Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // Register store
      const res = await fetch('/api/stores/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          slug,
          ownerUid: uid,
          ownerEmail: email,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setRegisteredSlug(data.slug);
      setStep(3);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError(locale === 'ja' ? 'このメールアドレスは既に使用されています' : 'Email already in use');
      } else if (err.code === 'auth/weak-password') {
        setError(locale === 'ja' ? 'パスワードは6文字以上にしてください' : 'Password must be at least 6 characters');
      } else {
        setError(err.message || 'Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const appDomain = typeof window !== 'undefined'
    ? window.location.hostname.split('.').slice(-2).join('.')
    : 'vual.jp';

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="text-2xl font-bold tracking-tight text-neutral-900">
            VUAL
          </Link>
          <p className="text-sm text-neutral-500 mt-2">
            {locale === 'ja' ? 'ショップを開設' : 'Create Your Shop'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-neutral-900' : 'bg-neutral-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-8">
          {/* Step 1: Shop Info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  {locale === 'ja' ? 'ショップ名' : 'Shop Name'}
                </label>
                <div className="relative">
                  <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder={locale === 'ja' ? 'あなたのショップ名' : 'Your shop name'}
                    className="w-full h-11 pl-10 pr-4 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  {locale === 'ja' ? 'ショップURL' : 'Shop URL'}
                </label>
                <div className="flex items-center gap-0">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setSlugEdited(true);
                    }}
                    className="flex-1 h-11 px-3 text-sm bg-neutral-50 border border-neutral-200 rounded-l-lg focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                  <span className="h-11 px-3 flex items-center text-sm text-neutral-400 bg-neutral-100 border border-l-0 border-neutral-200 rounded-r-lg whitespace-nowrap">
                    .{appDomain}
                  </span>
                </div>
                {/* Slug status */}
                <div className="mt-1.5 h-5">
                  {slugStatus === 'checking' && (
                    <span className="flex items-center gap-1 text-xs text-neutral-400">
                      <Loader2 size={12} className="animate-spin" />
                      {locale === 'ja' ? '確認中...' : 'Checking...'}
                    </span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 size={12} />
                      {locale === 'ja' ? '利用可能です' : 'Available'}
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle size={12} />
                      {locale === 'ja' ? 'このURLは使用されています' : 'This URL is taken'}
                    </span>
                  )}
                  {slugStatus === 'invalid' && (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle size={12} />
                      {locale === 'ja' ? '英小文字・数字・ハイフンのみ（3文字以上）' : 'Lowercase letters, numbers, hyphens only (3+ chars)'}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                disabled={!shopName || !slug || slugStatus !== 'available'}
                className="w-full h-11 flex items-center justify-center gap-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {locale === 'ja' ? '次へ' : 'Next'}
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2: Account */}
          {step === 2 && (
            <div className="space-y-5">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                <ArrowLeft size={14} />
                {locale === 'ja' ? '戻る' : 'Back'}
              </button>

              <div className="text-center py-2">
                <p className="text-sm text-neutral-500">
                  <span className="font-medium text-neutral-900">{slug}</span>.{appDomain}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle size={14} />
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
                    placeholder={locale === 'ja' ? '6文字以上' : '6+ characters'}
                    className="w-full h-11 pl-10 pr-4 text-sm bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-400 transition-colors"
                  />
                </div>
              </div>

              <button
                onClick={handleSignup}
                disabled={!email || !password || password.length < 6 || isSubmitting}
                className="w-full h-11 flex items-center justify-center gap-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    {locale === 'ja' ? 'ショップを開設' : 'Create Shop'}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 mb-2">
                  {locale === 'ja' ? 'ショップを開設しました！' : 'Shop Created!'}
                </h2>
                <p className="text-sm text-neutral-500">
                  {locale === 'ja'
                    ? '管理画面から商品を登録して始めましょう。'
                    : 'Head to your dashboard to add products and get started.'}
                </p>
              </div>
              <a
                href={`${window.location.protocol}//${registeredSlug}.${appDomain}/${locale}/admin`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
              >
                {locale === 'ja' ? '管理画面へ' : 'Go to Dashboard'}
                <ArrowRight size={16} />
              </a>
            </div>
          )}
        </div>

        {/* Login link */}
        {step !== 3 && (
          <p className="text-center text-sm text-neutral-500 mt-6">
            {locale === 'ja' ? '既にアカウントをお持ちの方' : 'Already have an account?'}{' '}
            <Link href={`/${locale}/admin/login`} className="text-neutral-900 font-medium hover:underline">
              {locale === 'ja' ? 'ログイン' : 'Log in'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
