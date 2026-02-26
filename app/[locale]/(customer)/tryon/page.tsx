'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, X, Download, Plus, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTryOnStore } from '@/lib/store/tryon';
import { VTON_SLOTS } from '@/lib/utils/vton-category';
import { PortraitCapture, CreditStatusBar, CreditPurchaseSheet } from '@/components/customer/tryon';

export default function TryOnPage() {
  const locale = useLocale();
  const {
    portraits,
    results,
    removePortrait,
    credits,
    loadCredits,
    tryOnList,
    removeFromTryOnList,
    clearTryOnList,
    addResult,
  } = useTryOnStore();

  const [showCapture, setShowCapture] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedPortraitId, setSelectedPortraitId] = useState<string | null>(null);

  // Try-on execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<string | null>(null);

  const tryOnListCount = Object.keys(tryOnList).length;
  const selectedPortrait = portraits.find((p) => p.id === selectedPortraitId);
  const canStartTryOn = tryOnListCount > 0 && selectedPortrait && !isProcessing;

  useEffect(() => {
    const lineUserId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('lineUserId') ||
          localStorage.getItem('vual-line-user-id')
        : null;
    if (lineUserId) {
      loadCredits(lineUserId);
    }
  }, [loadCredits]);

  // Auto-select first portrait if none selected
  useEffect(() => {
    if (!selectedPortraitId && portraits.length > 0) {
      setSelectedPortraitId(portraits[0].id);
    }
  }, [portraits, selectedPortraitId]);

  const toBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleTryOn = async () => {
    if (!selectedPortrait || tryOnListCount === 0) return;

    setIsProcessing(true);
    setTryOnError(null);
    setLatestResult(null);
    setProcessingStatus(locale === 'ja' ? '画像を準備中...' : 'Preparing images...');

    try {
      const items = Object.values(tryOnList);
      const personImage = await toBase64(selectedPortrait.dataUrl);

      const lineUserId =
        typeof window !== 'undefined' ? localStorage.getItem('vual-line-user-id') || undefined : undefined;

      // Build garment images per slot (same format as gemini-image API)
      // Slots: garmentImages (1st item), secondGarmentImages (2nd), thirdGarmentImages (3rd)
      const slotOrder = ['upper_body', 'lower_body', 'footwear'] as const;
      const garmentSlots: string[][] = [[], [], []];
      for (const item of items) {
        const slotKey = item.category === 'dresses' ? 'upper_body' : item.category;
        const idx = slotOrder.indexOf(slotKey as typeof slotOrder[number]);
        if (idx >= 0) {
          garmentSlots[idx].push(await toBase64(item.image));
        }
      }

      // Find first non-empty slot as primary, rest as additional
      const nonEmpty = garmentSlots.map((imgs, i) => ({ imgs, i })).filter(s => s.imgs.length > 0);
      if (nonEmpty.length === 0) throw new Error('No garment images');

      setProcessingStatus(locale === 'ja' ? 'AI生成中...' : 'AI generating...');

      const res = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImages: nonEmpty[0]?.imgs || [],
          secondGarmentImages: nonEmpty[1]?.imgs || [],
          thirdGarmentImages: nonEmpty[2]?.imgs || [],
          modelImage: personImage,
          modelSettings: {
            gender: 'female',
            height: 165,
            ethnicity: 'japanese',
            pose: 'standing',
          },
          background: 'studioWhite',
          aspectRatio: '3:4',
          lineUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errorCode === 'INSUFFICIENT_CREDITS') {
          setIsProcessing(false);
          setProcessingStatus('');
          setShowPurchase(true);
          return;
        }
        throw new Error(data.error || 'Generation failed');
      }

      if (data.success && data.images?.[0]) {
        const resultImage = data.images[0];
        const garmentNames = items.map((i) => i.name).join(' + ');
        addResult({
          id: `outfit-${Date.now()}`,
          portraitId: selectedPortrait.id,
          garmentName: garmentNames,
          resultImage,
          createdAt: new Date().toISOString(),
        });
        setLatestResult(resultImage);
      } else {
        throw new Error(data.error || (locale === 'ja' ? '画像生成に失敗しました' : 'Image generation failed'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (locale === 'ja' ? 'エラーが発生しました' : 'An error occurred');
      setTryOnError(message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-title-active)] mb-2">
          {locale === 'ja' ? 'バーチャル試着' : 'Virtual Try-On'}
        </h1>
        <p className="text-sm text-[var(--color-text-body)]">
          {locale === 'ja' ? 'アイテムを選んで試着しよう' : 'Select items and try them on'}
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

      {/* Try-On List (Slot UI) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
            {locale === 'ja' ? '試着リスト' : 'Try-On List'}
          </h2>
          {tryOnListCount > 0 && (
            <button
              onClick={clearTryOnList}
              className="text-xs text-[var(--color-text-label)] hover:text-[var(--color-text-body)]"
            >
              {locale === 'ja' ? 'クリア' : 'Clear'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {VTON_SLOTS.map((slot) => {
            const item = tryOnList[slot.id];
            return (
              <div key={slot.id} className="flex flex-col items-center">
                {item ? (
                  <div className="relative w-full aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden border-2 border-[var(--color-accent)] bg-[var(--color-bg-element)]">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removeFromTryOnList(slot.id)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/${locale}/search`}
                    className="w-full aspect-[3/4] rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] flex flex-col items-center justify-center gap-2 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <Plus size={24} className="text-[var(--color-text-label)]" />
                  </Link>
                )}
                <p className="text-[10px] text-[var(--color-text-label)] mt-1.5 text-center truncate w-full">
                  {item ? item.name : (locale === 'ja' ? slot.labelJa : slot.labelEn)}
                </p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Portrait Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          {locale === 'ja' ? '写真を選択' : 'Select Photo'}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setShowCapture(true)}
            className="shrink-0 w-20 h-28 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] flex flex-col items-center justify-center gap-1.5 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Camera size={20} className="text-[var(--color-text-label)]" />
            <span className="text-[10px] text-[var(--color-text-label)]">
              {locale === 'ja' ? '追加' : 'Add'}
            </span>
          </button>

          {portraits.map((portrait) => {
            const isSelected = portrait.id === selectedPortraitId;
            return (
              <button
                key={portrait.id}
                onClick={() => setSelectedPortraitId(portrait.id)}
                className={`shrink-0 w-20 h-28 rounded-[var(--radius-md)] overflow-hidden relative border-2 transition-colors ${
                  isSelected ? 'border-[var(--color-accent)]' : 'border-transparent'
                }`}
              >
                <img
                  src={portrait.dataUrl}
                  alt={portrait.name}
                  className="w-full h-full object-cover"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-[var(--color-accent)]/10 flex items-end justify-center pb-1">
                    <CheckCircle size={16} className="text-[var(--color-accent)]" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePortrait(portrait.id);
                    if (selectedPortraitId === portrait.id) setSelectedPortraitId(null);
                  }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full"
                >
                  <X size={10} className="text-white" />
                </button>
              </button>
            );
          })}
        </div>
        {portraits.length === 0 && (
          <p className="text-xs text-[var(--color-text-label)] mt-2">
            {locale === 'ja' ? '全身写真を登録してください' : 'Please add a full-body photo'}
          </p>
        )}
      </motion.div>

      {/* Try On Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        {tryOnError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
            <p className="text-sm text-red-700">{tryOnError}</p>
          </div>
        )}

        <button
          onClick={handleTryOn}
          disabled={!canStartTryOn}
          className={`w-full py-3.5 rounded-[var(--radius-md)] text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            canStartTryOn
              ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
              : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)] cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {processingStatus}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {locale === 'ja' ? '試着する' : 'Try On'}
              {tryOnListCount > 0 && ` (${tryOnListCount})`}
            </>
          )}
        </button>

        {!selectedPortrait && tryOnListCount > 0 && (
          <p className="text-xs text-[var(--color-text-label)] text-center mt-2">
            {locale === 'ja' ? '写真を選択してください' : 'Please select a photo'}
          </p>
        )}
        {tryOnListCount === 0 && (
          <p className="text-xs text-[var(--color-text-label)] text-center mt-2">
            {locale === 'ja'
              ? '商品ページから試着リストにアイテムを追加してください'
              : 'Add items to your try-on list from product pages'}
          </p>
        )}
      </motion.div>

      {/* Latest Result */}
      {latestResult && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-white border border-[var(--color-accent)] rounded-[var(--radius-lg)]"
        >
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-3">
            {locale === 'ja' ? '試着結果' : 'Try-On Result'}
          </h2>
          <div className="aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)]">
            <img src={latestResult} alt="Try-on result" className="w-full h-full object-contain" />
          </div>
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = latestResult;
              a.download = `vual-tryon-${Date.now()}.png`;
              a.click();
            }}
            className="mt-3 w-full py-2 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] rounded-[var(--radius-md)] flex items-center justify-center gap-2 hover:bg-[var(--color-accent)]/5 transition-colors"
          >
            <Download size={14} />
            {locale === 'ja' ? '画像を保存' : 'Save Image'}
          </button>
        </motion.div>
      )}

      {/* Recent Results */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
            {locale === 'ja' ? '最近の試着結果' : 'Recent Results'}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {results.map((result) => (
              <div key={result.id} className="shrink-0 w-20 flex flex-col items-end gap-1">
                <div className="w-full aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)]">
                  <img
                    src={result.resultImage}
                    alt={result.garmentName}
                    className="w-full h-full object-contain"
                  />
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
          {locale === 'ja' ? '使い方' : 'How It Works'}
        </h2>
        <div className="flex gap-4">
          {[
            { step: '1', label: locale === 'ja' ? '商品を試着リストに追加' : 'Add items to list' },
            { step: '2', label: locale === 'ja' ? '全身写真を選ぶ' : 'Select a photo' },
            { step: '3', label: locale === 'ja' ? '試着結果を確認' : 'View results' },
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
