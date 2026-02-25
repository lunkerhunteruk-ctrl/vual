'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, CreditCard, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui';

export default function StorePoliciesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [shippingPolicy, setShippingPolicy] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [codPolicy, setCodPolicy] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch('/api/stores/policies');
        const data = await res.json();
        setShippingPolicy(data.shippingPolicy || '');
        setFreeShippingThreshold(data.freeShippingThreshold?.toString() || '');
        setCodPolicy(data.codPolicy || '');
        setReturnPolicy(data.returnPolicy || '');
      } catch {
        setError('設定の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/stores/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingPolicy,
          freeShippingThreshold: freeShippingThreshold ? parseInt(freeShippingThreshold) : null,
          codPolicy,
          returnPolicy,
        }),
      });
      if (!res.ok) throw new Error('保存に失敗しました');
      setSuccess('保存しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-lg font-semibold text-[var(--color-title-active)] mb-6">
          ストアポリシー設定
        </h1>

        {error && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-green-50 text-green-600 text-sm flex items-center gap-2">
            <CheckCircle2 size={16} />
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Shipping Policy */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={18} className="text-[var(--color-text-label)]" />
              <h3 className="text-sm font-semibold text-[var(--color-title-active)]">
                送料・配送ポリシー
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-[var(--color-text-body)] mb-1.5">
                  送料無料の条件（税込金額）
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[var(--color-text-label)]">¥</span>
                  <input
                    type="number"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    placeholder="例: 10000"
                    className="flex-1 h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-text-label)]">以上で送料無料</span>
                </div>
                <p className="text-xs text-[var(--color-text-label)] mt-1">
                  空欄の場合は送料無料条件なし
                </p>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-body)] mb-1.5">
                  配送ポリシー詳細
                </label>
                <textarea
                  rows={3}
                  value={shippingPolicy}
                  onChange={(e) => setShippingPolicy(e.target.value)}
                  placeholder="例: 通常配送3〜5営業日でお届けします。北海道・沖縄・離島は別途送料がかかります。"
                  className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
                />
              </div>
            </div>
          </div>

          {/* COD Policy */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} className="text-[var(--color-text-label)]" />
              <h3 className="text-sm font-semibold text-[var(--color-title-active)]">
                代引きポリシー
              </h3>
            </div>
            <textarea
              rows={3}
              value={codPolicy}
              onChange={(e) => setCodPolicy(e.target.value)}
              placeholder="例: 代金引換は30,000円以下のご注文でご利用いただけます。代引き手数料330円がかかります。"
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>

          {/* Return Policy */}
          <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw size={18} className="text-[var(--color-text-label)]" />
              <h3 className="text-sm font-semibold text-[var(--color-title-active)]">
                返品ポリシー
              </h3>
            </div>
            <textarea
              rows={3}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              placeholder="例: 商品到着後7日以内であれば返品可能です。未使用品に限ります。お客様都合の返品送料はお客様ご負担となります。"
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>
        </div>

        <div className="mt-6">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                保存中...
              </span>
            ) : '保存する'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
