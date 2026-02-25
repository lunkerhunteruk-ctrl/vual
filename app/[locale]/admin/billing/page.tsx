'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, ArrowRight, Loader2, Settings, Check } from 'lucide-react';
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

const PACKS = [
  { slug: 'store-starter', nameKey: 'starter', descKey: 'starterDesc', price: 10000, credits: 250 },
  { slug: 'store-standard', nameKey: 'standard', descKey: 'standardDesc', price: 35000, credits: 1000 },
  { slug: 'store-pro', nameKey: 'pro', descKey: 'proDesc', price: 90000, credits: 3000 },
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

  useEffect(() => {
    if (storeId) {
      setIsLoading(true);
      Promise.all([fetchBalance(), fetchTransactions(0), fetchSettings()]).finally(() => setIsLoading(false));
    } else {
      // If store context loaded but store is null, stop loading
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [storeId, fetchBalance, fetchTransactions, fetchSettings]);

  // Check for success query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success(locale === 'ja' ? 'クレジットを購入しました！' : 'Credits purchased successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      fetchBalance();
      fetchTransactions(0);
    }
  }, [locale, fetchBalance, fetchTransactions]);

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
    <div className="space-y-8">
      {/* Balance Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 md:col-span-1 bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent)]/80 rounded-xl p-6 text-white"
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
          className="bg-white border border-[var(--color-line)] rounded-xl p-6"
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
          className="bg-white border border-[var(--color-line)] rounded-xl p-6"
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h2 className="text-base font-semibold text-[var(--color-title-active)] mb-4 flex items-center gap-2">
          <Settings size={18} />
          {t('settings')}
        </h2>
        <div className="bg-white border border-[var(--color-line)] rounded-xl p-6">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-title-active)]">
                {t('dailyTryonLimit')}
              </p>
              <p className="text-xs text-[var(--color-text-label)] mt-0.5">
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
                className="w-20 h-10 px-3 text-sm text-center bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-lg focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-title-active)]"
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
      </motion.div>

      {/* Purchase Packs */}
      <div>
        <h2 className="text-base font-semibold text-[var(--color-title-active)] mb-4">{t('purchaseCredits')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PACKS.map((pack, idx) => (
            <motion.div
              key={pack.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className={`relative bg-white border rounded-xl p-6 hover:shadow-md transition-shadow ${
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
              <h3 className="text-sm font-semibold text-[var(--color-title-active)] mb-1">
                {t(pack.nameKey)}
              </h3>
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

      {/* Transaction History */}
      <div>
        <h2 className="text-base font-semibold text-[var(--color-title-active)] mb-4">{t('transactionHistory')}</h2>
        <div className="bg-white border border-[var(--color-line)] rounded-xl overflow-hidden">
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
      </div>
    </div>
  );
}
