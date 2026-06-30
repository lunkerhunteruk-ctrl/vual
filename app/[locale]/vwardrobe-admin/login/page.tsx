'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store/auth';
import { Loader2, AlertCircle } from 'lucide-react';

const googleProvider = new GoogleAuthProvider();
const ADMIN_EMAIL = 'sachiokawasaki@gmail.com';

export default function VWardrobeAdminLoginPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && user) {
      if (user.email === ADMIN_EMAIL) {
        router.replace(`/${locale}/vwardrobe-admin`);
      } else {
        firebaseSignOut(auth);
      }
    }
  }, [user, isLoading, locale, router]);

  const handleLogin = async () => {
    if (!email || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (result.user.email !== ADMIN_EMAIL) {
        await firebaseSignOut(auth);
        setError('アクセス権限がありません');
        return;
      }
      router.replace(`/${locale}/vwardrobe-admin`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        setError((err as Error).message || 'ログインに失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== ADMIN_EMAIL) {
        await firebaseSignOut(auth);
        setError('アクセス権限がありません');
        return;
      }
      router.replace(`/${locale}/vwardrobe-admin`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code !== 'auth/popup-closed-by-user') {
        setError((err as Error).message || 'Googleログインに失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">VWARDROBE</h1>
          <p className="mt-1 text-sm text-gray-500">管理画面にログイン</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2.5 rounded-lg">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full h-11 flex items-center justify-center gap-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">または</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="メールアドレス"
            className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 bg-gray-50 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="パスワード"
            className="w-full h-11 px-4 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 bg-gray-50 transition-colors"
          />

          <button
            onClick={handleLogin}
            disabled={!email || !password || submitting}
            className="w-full h-11 flex items-center justify-center text-sm font-medium rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-40"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : 'ログイン'}
          </button>
        </div>
      </div>
    </div>
  );
}
