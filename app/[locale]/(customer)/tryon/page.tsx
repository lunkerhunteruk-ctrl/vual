'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, X, Download } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTryOnStore } from '@/lib/store/tryon';
import { PortraitCapture, CreditStatusBar, CreditPurchaseSheet } from '@/components/customer/tryon';

export default function TryOnPage() {
  const locale = useLocale();
  const { portraits, results, removePortrait, credits, loadCredits } = useTryOnStore();
  const [showCapture, setShowCapture] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  useEffect(() => {
    // Load credits if a lineUserId is available from LIFF
    const lineUserId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('lineUserId') || localStorage.getItem('vual-line-user-id')
      : null;
    if (lineUserId) {
      loadCredits(lineUserId);
    }
  }, [loadCredits]);

  return (
    <div className="px-4 py-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-title-active)] mb-2">
          バーチャル試着
        </h1>
        <p className="text-sm text-[var(--color-text-body)]">
          自分に合う服を見つけよう
        </p>
      </motion.div>

      {/* Credit Status */}
      {credits && (
        <div className="mb-6">
          <CreditStatusBar
            freeTickets={credits.freeTickets}
            paidCredits={credits.paidCredits}
            subscriptionCredits={credits.subscriptionCredits}
            isSubscribed={credits.isSubscribed}
            onBuyCredits={() => setShowPurchase(true)}
          />
        </div>
      )}

      {/* My Portraits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          マイポートレート
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {/* Add button */}
          <button
            onClick={() => setShowCapture(true)}
            className="shrink-0 w-24 h-32 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] flex flex-col items-center justify-center gap-2 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Camera size={24} className="text-[var(--color-text-label)]" />
            <span className="text-[10px] text-[var(--color-text-label)]">追加</span>
          </button>

          {/* Saved portraits */}
          {portraits.map((portrait) => (
            <div key={portrait.id} className="shrink-0 w-24 h-32 rounded-[var(--radius-md)] overflow-hidden relative group">
              <img src={portrait.dataUrl} alt={portrait.name} className="w-full h-full object-cover" />
              <button
                onClick={() => removePortrait(portrait.id)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Try-on CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <Link
          href={`/${locale}/search`}
          className="block p-5 rounded-[var(--radius-lg)] border border-[var(--color-line)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors text-center"
        >
          <Sparkles size={28} className="text-[var(--color-accent)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-title-active)] mb-1">商品を選んで試着</p>
          <p className="text-xs text-[var(--color-text-label)]">気になるアイテムを試着してみよう</p>
        </Link>
      </motion.div>

      {/* Recent Results */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
            最近の試着結果
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {results.map((result) => (
              <div key={result.id} className="shrink-0 w-20 flex flex-col items-end gap-1">
                <div className="w-full aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)]">
                  <img src={result.resultImage} alt={result.garmentName} className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = result.resultImage;
                    a.download = `vual-tryon-${result.id}.png`;
                    a.click();
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-[var(--color-line)] shadow-sm"
                >
                  <Download size={11} className="text-[var(--color-text-label)]" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          使い方
        </h2>
        <div className="flex gap-4">
          {[
            { step: '1', label: '全身写真を登録' },
            { step: '2', label: '気になる服を選ぶ' },
            { step: '3', label: '試着結果を確認' },
          ].map((item) => (
            <div key={item.step} className="flex-1 text-center">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <p className="text-xs text-[var(--color-text-body)]">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Portrait Capture Modal */}
      <AnimatePresence>
        {showCapture && (
          <PortraitCapture
            onClose={() => setShowCapture(false)}
            onCaptured={() => setShowCapture(false)}
          />
        )}
      </AnimatePresence>

      {/* Credit Purchase Sheet */}
      <CreditPurchaseSheet
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
      />
    </div>
  );
}
