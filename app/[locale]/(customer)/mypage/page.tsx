'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Package, Camera, Heart, Bell, Settings, HelpCircle, ChevronRight, Loader2, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/store';
import { useLiff } from '@/components/providers/LiffProvider';
import { signInWithGoogle, signOutGoogle } from '@/lib/auth/google-auth';

export default function MyPage() {
  const locale = useLocale();
  const { customer, isCustomerLoading, authMethod, setCustomer, signOut } = useAuthStore();
  const { login: liffLogin, logout: liffLogout } = useLiff();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lineBotId, setLineBotId] = useState<string | null>(null);

  // Fetch store LINE bot info for friend add
  useEffect(() => {
    fetch('/api/stores/line')
      .then(res => res.json())
      .then(data => {
        if (data.lineBotBasicId) setLineBotId(data.lineBotBasicId);
      })
      .catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      const googleCustomer = await signInWithGoogle();
      if (googleCustomer) {
        setCustomer(googleCustomer, 'google');
      }
    } catch (err: any) {
      setAuthError(err.message || 'ログインに失敗しました');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (authMethod === 'line') {
      liffLogout();
    } else if (authMethod === 'google') {
      await signOutGoogle();
      signOut();
    } else {
      signOut();
    }
  };

  if (isCustomerLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm w-full"
        >
          <div className="w-20 h-20 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto mb-6">
            <User size={32} className="text-[var(--color-text-label)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-title-active)] mb-2">
            VUALへようこそ
          </h1>
          <p className="text-sm text-[var(--color-text-body)] mb-8">
            ログインして、お気に入りやバーチャル試着をお楽しみください
          </p>

          {authError && (
            <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 text-red-600 text-sm">
              {authError}
            </div>
          )}

          {/* LINE Login */}
          <button
            onClick={liffLogin}
            className="w-full py-3 rounded-[var(--radius-md)] text-white text-sm font-medium mb-3 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#06C755' }}
          >
            LINEでログイン
          </button>

          {/* Google Login */}
          <button
            onClick={handleGoogleLogin}
            disabled={isSigningIn}
            className="w-full py-3 rounded-[var(--radius-md)] border border-[var(--color-line)] text-sm font-medium text-[var(--color-title-active)] transition-colors hover:bg-[var(--color-bg-element)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSigningIn ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Googleでログイン
          </button>

          <p className="text-xs text-[var(--color-text-label)] mt-6">
            ログインせずに商品を閲覧できます
          </p>
        </motion.div>
      </div>
    );
  }

  // Logged in view
  const menuItems = [
    { icon: Package, label: '注文履歴', href: `/${locale}/orders` },
    { icon: Camera, label: 'マイポートレート', href: `/${locale}/tryon` },
    { icon: Heart, label: 'お気に入り', href: `/${locale}/favorites` },
    { icon: Bell, label: '通知設定', href: `/${locale}/mypage/notifications` },
    { icon: Settings, label: '設定', href: `/${locale}/mypage/settings` },
    { icon: HelpCircle, label: 'サポート', href: `/${locale}/contact` },
  ];

  return (
    <div className="px-4 py-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center overflow-hidden">
          {customer.photoURL ? (
            <img src={customer.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={28} className="text-[var(--color-text-label)]" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-title-active)]">
            {customer.displayName}
          </h1>
          <p className="text-xs text-[var(--color-text-label)]">
            {authMethod === 'line' ? 'LINE' : authMethod === 'google' ? 'Google' : ''} アカウント
          </p>
        </div>
      </motion.div>

      {/* Menu List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-lg)] overflow-hidden mb-6"
      >
        {menuItems.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center justify-between px-4 py-3.5 hover:bg-[var(--color-bg-element)] transition-colors ${
              i < menuItems.length - 1 ? 'border-b border-[var(--color-line)]' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon size={20} className="text-[var(--color-text-body)]" />
              <span className="text-sm text-[var(--color-title-active)]">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-[var(--color-text-label)]" />
          </Link>
        ))}
      </motion.div>

      {/* LINE Friend Add Banner */}
      {lineBotId && authMethod !== 'line' && (
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          href={`https://line.me/R/ti/p/${lineBotId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 mb-6 rounded-[var(--radius-lg)] text-white"
          style={{ backgroundColor: '#06C755' }}
        >
          <MessageCircle size={24} />
          <div className="flex-1">
            <p className="text-sm font-medium">LINE公式アカウントを友だち追加</p>
            <p className="text-xs opacity-80">お得な情報や配信通知を受け取れます</p>
          </div>
          <ChevronRight size={18} className="opacity-80" />
        </motion.a>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-sm text-[var(--color-text-label)] hover:text-[var(--color-error)] transition-colors"
      >
        ログアウト
      </button>
    </div>
  );
}
