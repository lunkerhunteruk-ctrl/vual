'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, ArrowRight, Loader2, Settings, Check, Crown, Sparkles, Clock, AlertTriangle, Shirt } from 'lucide-react';
import { useStoreContext } from '@/lib/store/store-context';
import { toast } from '@/lib/store/toast';

interface StoreBalance {
  balance: number;
  totalPurchased: number;
  totalConsumed: number;
}

interface CreditTransaction {
  id: string;
  type: 'purchase' | 'consumption' | 'refund' | 'adjustment';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface SubscriptionInfo {
  status: string;
  plan: string | null;
  trialDaysRemaining: number | null;
  trialEndsAt: string | null;
  subscriptionPeriodEnd: string | null;
  studioSubscriptionCredits: number;
  studioTopupCredits: number;
  studioTotalCredits: number;
}

const PACKS = [
  { slug: 'store-starter', nameKey: 'starter', descKey: 'starterDesc', price: 10000, credits: 250 },
  { slug: 'store-standard', nameKey: 'standard', descKey: 'standardDesc', price: 35000, credits: 1000 },
  { slug: 'store-pro', nameKey: 'pro', descKey: 'proDesc', price: 90000, credits: 3000 },
] as const;

const STUDIO_TOPUP_PACKS = [
  { slug: 'studio-light', name: 'ライト', nameEn: 'Light', price: 12000, credits: 50, perCredit: 240 },
  { slug: 'studio-standard', name: 'スタンダード', nameEn: 'Standard', price: 33000, credits: 150, perCredit: 220 },
  { slug: 'studio-pro', name: 'プロ', nameEn: 'Pro', price: 90000, credits: 500, perCredit: 180 },
] as const;

export default function BillingPage() {
  const locale = useLocale();
  const t = useTranslations('admin.billing');
  const store = useStoreContext((s) => s.store);
  const storeId = store?.id;

  const [balance, setBalance] = useState<StoreBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [txOffset, setTxOffset] = useState(0);
  const [txTotal, setTxTotal] = useState(0);
  const [purchasingSlug, setPurchasingSlug] = useState<string | null>(null);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [dailyLimitSaved, setDailyLimitSaved] = useState(3);
  const [savingLimit, setSavingLimit] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/billing/balance?storeId=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setBalance({
          balance: data.balance,
          totalPurchased: data.totalPurchased,
          totalConsumed: data.totalConsumed,
        });
      }
    } catch {
      console.error('Failed to fetch balance');
    }
  }, [storeId]);

  const fetchTransactions = useCallback(async (offset = 0) => {
    if (!storeId) return;
    setTxLoading(true);
    try {
      const res = await fetch(`/api/billing/transactions?storeId=${storeId}&limit=20&offset=${offset}`);
      const data = await res.json();
      if (data.success) {
        if (offset === 0) {
          setTransactions(data.transactions);
        } else {
          setTransactions((prev) => [...prev, ...data.transactions]);
        }
        setTxTotal(data.total);
        setTxOffset(offset + data.transactions.length);
      }
    } catch {
      console.error('Failed to fetch transactions');
    } finally {
      setTxLoading(false);
    }
  }, [storeId]);

  const fetchSettings = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/billing/settings?storeId=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setDailyLimit(data.dailyTryonLimit);
        setDailyLimitSaved(data.dailyTryonLimit);
      }
    } catch {
      console.error('Failed to fetch settings');
    }
  }, [storeId]);

  const fetchSubscription = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/billing/subscription-status?storeId=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setSubscription(data);
      }
    } catch {
      console.error('Failed to fetch subscription');
    }
  }, [storeId]);

  const handleSubscribe = async () => {
    if (!storeId) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create subscription');
      }
    } catch {
      toast.error(locale === 'ja' ? 'サブスクリプション開始に失敗しました' : 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    if (storeId) {
      setIsLoading(true);
      Promise.all([fetchBalance(), fetchTransactions(0), fetchSettings(), fetchSubscription()]).finally(() => setIsLoading(false));
    } else {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [storeId, fetchBalance, fetchTransactions, fetchSettings, fetchSubscription]);

  // Check for success query param and verify session to grant credits
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Subscription success
    if (params.get('sub_success') === 'true') {
      const sessionId = params.get('session_id');
      window.history.replaceState({}, '', window.location.pathname);
      if (sessionId) {
        fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success(locale === 'ja' ? 'プランに加入しました！' : 'Subscribed successfully!');
            }
            fetchSubscription();
          })
          .catch(() => { fetchSubscription(); });
      } else {
        toast.success(locale === 'ja' ? 'プランに加入しました！' : 'Subscribed successfully!');
        fetchSubscription();
      }
      return;
    }

    // Credit purchase success
    if (params.get('success') === 'true') {
      const sessionId = params.get('session_id');
      window.history.replaceState({}, '', window.location.pathname);

      if (sessionId) {
        fetch(`/api/billing/verify-session?session_id=${encodeURIComponent(sessionId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              toast.success(locale === 'ja' ? 'クレジットを購入しました！' : 'Credits purchased successfully!');
            } else {
              toast.error(locale === 'ja' ? 'クレジットの反映に失敗しました' : 'Failed to verify purchase');
            }
            fetchBalance();
            fetchTransactions(0);
            fetchSubscription();
          })
          .catch(() => {
            toast.error(locale === 'ja' ? 'クレジットの検証に失敗しました' : 'Verification failed');
            fetchBalance();
            fetchTransactions(0);
          });
      } else {
        toast.success(locale === 'ja' ? 'クレジットを購入しました！' : 'Credits purchased successfully!');
        fetchBalance();
        fetchTransactions(0);
      }
    }
  }, [locale, fetchBalance, fetchTransactions, fetchSubscription]);

  const handleSaveLimit = async () => {
    if (!storeId || dailyLimit === dailyLimitSaved) return;
    setSavingLimit(true);
    try {
      const res = await fetch('/api/billing/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, dailyTryonLimit: dailyLimit }),
      });
      const data = await res.json();
      if (data.success) {
        setDailyLimitSaved(dailyLimit);
        toast.success(t('saved'));
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error(locale === 'ja' ? '保存に失敗しました' : 'Save failed');
    } finally {
      setSavingLimit(false);
    }
  };

  const handlePurchase = async (packSlug: string) => {
    if (!storeId) {
      toast.error(locale === 'ja' ? 'ストア情報を取得できません' : 'Store not found');
      return;
    }
    setPurchasingSlug(packSlug);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packSlug, storeId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout');
      }
    } catch {
      toast.error(locale === 'ja' ? '購入処理に失敗しました' : 'Purchase failed');
    } finally {
      setPurchasingSlug(null);
    }
  };

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      purchase: t('typePurchase'),
      consumption: t('typeConsumption'),
      refund: t('typeRefund'),
      adjustment: t('typeAdjustment'),
    };
    return map[type] || type;
  };

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      purchase: 'text-emerald-600 bg-emerald-50',
      consumption: 'text-amber-600 bg-amber-50',
      refund: 'text-blue-600 bg-blue-50',
      adjustment: 'text-gray-600 bg-gray-50',
    };
    return map[type] || 'text-gray-600 bg-gray-50';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* ━━━ Section 1: Creative Studio & Subscription Plan ━━━ */}
      <section className="bg-white border border-[var(--color-line)] rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-bold text-[var(--color-title-active)] flex items-center gap-2">
          <Sparkles size={20} className="text-[var(--color-accent)]" />
          {locale === 'ja' ? 'クリエイティブスタジオ & サブスクリプション' : 'Creative Studio & Subscription'}
        </h2>

        {/* Subscription Status Card */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-5 border ${
              subscription.status === 'active'
                ? 'bg-emerald-50 border-emerald-200'
                : subscription.status === 'trialing'
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {subscription.status === 'active' ? (
                  <Crown size={24} className="text-emerald-600" />
                ) : subscription.status === 'trialing' ? (
                  <Clock size={24} className="text-blue-600" />
                ) : (
                  <AlertTriangle size={24} className="text-amber-600" />
                )}
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {subscription.status === 'active'
                      ? (locale === 'ja' ? 'スタンダードプラン — ¥19,800/月' : 'Standard Plan — ¥19,800/mo')
                      : subscription.status === 'trialing'
                        ? (locale === 'ja' ? '無料トライアル' : 'Free Trial')
                        : (locale === 'ja' ? 'プラン未加入' : 'No Active Plan')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subscription.status === 'active' && subscription.subscriptionPeriodEnd
                      ? `${locale === 'ja' ? '次回更新日' : 'Next renewal'}: ${new Date(subscription.subscriptionPeriodEnd).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US')}`
                      : subscription.status === 'trialing' && subscription.trialDaysRemaining !== null
                        ? `${locale === 'ja' ? '残り' : ''}${subscription.trialDaysRemaining}${locale === 'ja' ? '日' : ' days remaining'}`
                        : (locale === 'ja' ? 'クリエイティブスタジオ・ライブ配信を利用するにはプランに加入してください' : 'Subscribe to use Creative Studio & Live Broadcast')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {(subscription.status === 'active' || subscription.status === 'trialing') && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{locale === 'ja' ? 'クリエイティブスタジオクレジット' : 'Creative Studio Credits'}</p>
                    <p className="text-xl font-bold text-gray-900">{subscription.studioTotalCredits}</p>
                    {subscription.studioTopupCredits > 0 && (
                      <p className="text-[10px] text-gray-500">
                        {locale === 'ja' ? '月額' : 'Monthly'}: {subscription.studioSubscriptionCredits} + {locale === 'ja' ? 'トップアップ' : 'Topup'}: {subscription.studioTopupCredits}
                      </p>
                    )}
                  </div>
                )}
                {(subscription.status === 'none' || subscription.status === 'expired' || subscription.status === 'canceled') && (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {subscribing ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                    {locale === 'ja' ? 'プランに加入する' : 'Subscribe'}
                  </button>
                )}
                {subscription.status === 'trialing' && (
                  <button
                    onClick={handleSubscribe}
                    disabled={subscribing}
                    className="px-5 py-2.5 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                  >
                    {subscribing ? <Loader2 size={14} className="animate-spin" /> : <Crown size={14} />}
                    {locale === 'ja' ? '月額プランに切り替え' : 'Switch to paid plan'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Creative Studio Credit Topup */}
        {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && (
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-3">
              {locale === 'ja' ? 'クレジットトップアップ' : 'Credit Top-up'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {STUDIO_TOPUP_PACKS.map((pack, idx) => (
                <motion.div
                  key={pack.slug}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  className={`relative bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${
                    pack.slug === 'studio-standard'
                      ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                      : 'border-[var(--color-line)]'
                  }`}
                >
                  {pack.slug === 'studio-standard' && (
                    <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-full">
                      {locale === 'ja' ? '人気' : 'Popular'}
                    </div>
                  )}
                  <h4 className="text-sm font-semibold text-[var(--color-title-active)] mb-1">
                    {locale === 'ja' ? pack.name : pack.nameEn}
                  </h4>
                  <p className="text-xs text-[var(--color-text-label)] mb-2">
                    {pack.credits}{locale === 'ja' ? 'クレジット' : ' credits'} (¥{pack.perCredit}/{locale === 'ja' ? '回' : 'gen'})
                  </p>
                  <p className="text-2xl font-bold text-[var(--color-title-active)] mb-4">
                    ¥{pack.price.toLocaleString()}
                  </p>
                  <button
                    onClick={() => handlePurchase(pack.slug)}
                    disabled={purchasingSlug !== null}
                    className="w-full h-10 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--color-title-active)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {purchasingSlug === pack.slug ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {locale === 'ja' ? '購入する' : 'Purchase'}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-label)] mt-2">
              {locale === 'ja'
                ? '※ トップアップクレジットは繰り越し可能です。月額クレジット(¥198/回相当)は毎月リセットされます。'
                : '※ Top-up credits carry over. Monthly credits (¥198/gen) reset each billing cycle.'}
            </p>
          </div>
        )}
      </section>

      {/* ━━━ Section 2: Virtual Try-on (Fitting Credits) ━━━ */}
      <section className="bg-white border border-[var(--color-line)] rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--color-title-active)] flex items-center gap-2">
            <Shirt size={20} className="text-[var(--color-accent)]" />
            {locale === 'ja' ? 'バーチャル試着' : 'Virtual Try-on'}
          </h2>
          <span className="text-xs text-[var(--color-text-label)] bg-[var(--color-bg-element)] px-3 py-1 rounded-full">
            {locale === 'ja' ? '顧客がショップ上で利用' : 'Used by customers on your shop'}
          </span>
        </div>

        {/* Fitting Credit Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent)]/80 rounded-xl p-6 text-white"
          >
            <div className="flex items-center gap-2 mb-3 opacity-90">
              <Coins size={20} />
              <span className="text-sm font-medium">{t('balance')}</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              {(balance?.balance ?? 0).toLocaleString()}
            </p>
            <p className="text-sm opacity-80 mt-1">{t('credits')}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2 text-[var(--color-text-label)]">
              <TrendingUp size={18} />
              <span className="text-sm">{t('totalPurchased')}</span>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-title-active)]">
              {(balance?.totalPurchased ?? 0).toLocaleString()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-2 text-[var(--color-text-label)]">
              <TrendingDown size={18} />
              <span className="text-sm">{t('totalConsumed')}</span>
            </div>
            <p className="text-2xl font-semibold text-[var(--color-title-active)]">
              {(balance?.totalConsumed ?? 0).toLocaleString()}
            </p>
          </motion.div>
        </div>

        {/* Settings */}
        <div className="bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-xl p-5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-title-active)] flex items-center gap-2">
                <Settings size={15} />
                {t('dailyTryonLimit')}
              </p>
              <p className="text-xs text-[var(--color-text-label)] mt-0.5 ml-[23px]">
                {t('dailyTryonLimitDesc')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={100}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-20 h-10 px-3 text-sm text-center bg-white border border-[var(--color-line)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-title-active)]"
              />
              <button
                onClick={handleSaveLimit}
                disabled={savingLimit || dailyLimit === dailyLimitSaved}
                className="h-10 px-4 flex items-center gap-2 text-sm font-medium bg-[var(--color-title-active)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingLimit ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {t('save')}
              </button>
            </div>
          </div>
        </div>

        {/* Purchase Fitting Credit Packs */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-3">{t('purchaseCredits')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PACKS.map((pack, idx) => (
              <motion.div
                key={pack.slug}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
                className={`relative bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${
                  pack.slug === 'store-standard'
                    ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                    : 'border-[var(--color-line)]'
                }`}
              >
                {pack.slug === 'store-standard' && (
                  <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded-full">
                    {locale === 'ja' ? '推奨' : 'Recommended'}
                  </div>
                )}
                <h4 className="text-sm font-semibold text-[var(--color-title-active)] mb-1">
                  {t(pack.nameKey)}
                </h4>
                <p className="text-xs text-[var(--color-text-label)] mb-4">
                  {t(pack.descKey)}
                </p>
                <p className="text-2xl font-bold text-[var(--color-title-active)] mb-4">
                  ¥{pack.price.toLocaleString()}
                </p>
                <button
                  onClick={() => handlePurchase(pack.slug)}
                  disabled={purchasingSlug !== null}
                  className="w-full h-10 flex items-center justify-center gap-2 text-sm font-medium bg-[var(--color-title-active)] text-white rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {purchasingSlug === pack.slug ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      {t('purchase')}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>

      </section>

      {/* ━━━ Section 3: Transaction History ━━━ */}
      <section className="bg-white border border-[var(--color-line)] rounded-2xl p-6">
        <h2 className="text-lg font-bold text-[var(--color-title-active)] mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-[var(--color-accent)]" />
          {t('transactionHistory')}
        </h2>
        <div className="border border-[var(--color-line)] rounded-xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Coins size={32} className="text-[var(--color-text-label)] mb-3" />
              <p className="text-sm text-[var(--color-text-label)]">{t('noTransactions')}</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-label)]">{t('type')}</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-label)]">{t('amount')}</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-label)]">{t('balanceAfter')}</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-label)]">{t('date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-[var(--color-line)]/50 last:border-0">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${typeColor(tx.type)}`}>
                          {typeLabel(tx.type)}
                        </span>
                        {tx.description && (
                          <p className="text-xs text-[var(--color-text-label)] mt-0.5 truncate max-w-[200px]">{tx.description}</p>
                        )}
                      </td>
                      <td className={`text-right px-4 py-3 font-medium ${tx.amount > 0 ? 'text-emerald-600' : 'text-[var(--color-text-body)]'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </td>
                      <td className="text-right px-4 py-3 text-[var(--color-text-body)]">
                        {tx.balance_after.toLocaleString()}
                      </td>
                      <td className="text-right px-4 py-3 text-[var(--color-text-label)] text-xs">
                        {new Date(tx.created_at).toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length < txTotal && (
                <div className="px-4 py-3 border-t border-[var(--color-line)]">
                  <button
                    onClick={() => fetchTransactions(txOffset)}
                    disabled={txLoading}
                    className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-50"
                  >
                    {txLoading ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
                    {t('loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
