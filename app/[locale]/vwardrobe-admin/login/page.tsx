'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuthStore } from '@/lib/store/auth';
import { Loader2, AlertCircle } from 'lucide-react';

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";
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
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0a0a0a', fontFamily: MONO }}
    >
      <div className="w-full max-w-[280px] space-y-8">
        {/* Logo */}
        <div className="text-center space-y-1.5">
          <div className="text-[13px] tracking-[6px] font-medium" style={{ color: '#e0e0e0' }}>VWARDROBE</div>
          <div className="text-[9px] tracking-[4px]" style={{ color: '#333' }}>ADMIN ACCESS</div>
        </div>

        {/* Form */}
        <div className="space-y-3" style={{ border: '1px solid #1c1c1c', borderRadius: 8, padding: '20px 18px' }}>
          {error && (
            <div
              className="flex items-center gap-2 text-[9px] tracking-[1px] px-2 py-2 rounded"
              style={{ background: 'rgba(200,0,0,0.1)', color: '#f87171' }}
            >
              <AlertCircle size={10} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={submitting}
            className="w-full py-2.5 text-[9px] tracking-[2px] rounded flex items-center justify-center gap-2.5 transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ background: '#161616', color: '#888', border: '1px solid #222' }}
          >
            <svg width="11" height="11" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            GOOGLE
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ background: '#1c1c1c' }} />
            <span className="text-[8px] tracking-[2px]" style={{ color: '#2a2a2a' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: '#1c1c1c' }} />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="EMAIL"
            className="w-full px-3 py-2 text-[10px] tracking-[1px] rounded outline-none"
            style={{ background: '#111', color: '#e0e0e0', border: '1px solid #1c1c1c' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="PASSWORD"
            className="w-full px-3 py-2 text-[10px] tracking-[1px] rounded outline-none"
            style={{ background: '#111', color: '#e0e0e0', border: '1px solid #1c1c1c' }}
          />

          <button
            onClick={handleLogin}
            disabled={!email || !password || submitting}
            className="w-full py-2.5 text-[10px] tracking-[3px] rounded flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30"
            style={{ background: '#e0e0e0', color: '#0a0a0a' }}
          >
            {submitting ? <Loader2 size={11} className="animate-spin" /> : 'LOGIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
