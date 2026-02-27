'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Upload, Loader2, Sparkles,
  X, Share2, RotateCcw, ChevronDown, Download,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useTryOnStore, type Portrait } from '@/lib/store/tryon';
import { CreditStatusBar, CreditPurchaseSheet } from '@/components/customer/tryon';

// --- Types ---

type SlotType = 'tops' | 'bottoms' | 'shoes';

interface SlotItem {
  image: string; // base64 data URL or URL
  name: string;
}

interface SlotConfig {
  id: SlotType;
  labelJa: string;
  labelEn: string;
}

const SLOTS: SlotConfig[] = [
  { id: 'tops', labelJa: 'トップス', labelEn: 'Tops' },
  { id: 'bottoms', labelJa: 'ボトムス', labelEn: 'Bottoms' },
  { id: 'shoes', labelJa: 'シューズ', labelEn: 'Shoes' },
];

type Phase = 'build' | 'processing' | 'result';

// --- Component ---

export default function ExternalTryOnPage() {
  const locale = useLocale();
  const isJa = locale === 'ja';
  const { portraits, credits, loadCredits, addResult } = useTryOnStore();

  // Slot state
  const [items, setItems] = useState<Map<SlotType, SlotItem>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [draggingSlot, setDraggingSlot] = useState<SlotType | null>(null);

  // Portrait & model settings
  const [selectedPortrait, setSelectedPortrait] = useState<Portrait | null>(portraits[0] || null);
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [height, setHeight] = useState(165);
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '9:16'>('3:4');

  // Generation state
  const [phase, setPhase] = useState<Phase>('build');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);

  const fileInputRefs = useRef<Record<SlotType, HTMLInputElement | null>>({
    tops: null, bottoms: null, shoes: null,
  });

  useEffect(() => {
    const lineUserId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('lineUserId') || localStorage.getItem('vual-line-user-id')
      : null;
    if (lineUserId) {
      loadCredits(lineUserId);
    }
  }, [loadCredits]);

  // Update portrait selection when portraits load
  useEffect(() => {
    if (!selectedPortrait && portraits.length > 0) {
      setSelectedPortrait(portraits[0]);
    }
  }, [portraits, selectedPortrait]);

  const lineUserId = typeof window !== 'undefined'
    ? localStorage.getItem('vual-line-user-id') || undefined
    : undefined;

  // --- File upload (for a specific slot) ---

  const processFile = useCallback((file: File, slot: SlotType) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1024;
        let { width, height: h } = img;
        if (width > maxSize || h > maxSize) {
          if (width > h) {
            h = (h / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / h) * maxSize;
            h = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setItems((prev) => {
          const next = new Map(prev);
          next.set(slot, { image: dataUrl, name: file.name.substring(0, 30) });
          return next;
        });
        setError(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, slot: SlotType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, slot);
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent, slot: SlotType) => {
    e.preventDefault();
    setDraggingSlot(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file, slot);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent, slot: SlotType) => {
    e.preventDefault();
    setDraggingSlot(slot);
  }, []);

  const handleRemoveSlot = (slot: SlotType) => {
    setItems((prev) => {
      const next = new Map(prev);
      next.delete(slot);
      return next;
    });
  };

  // --- Convert URL to base64 ---

  const toBase64 = async (src: string): Promise<string> => {
    if (src.startsWith('data:')) return src;
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // --- Generate outfit ---

  const handleGenerate = async () => {
    if (!selectedPortrait || items.size === 0) return;
    setPhase('processing');
    setError(null);

    try {
      // Convert all images to base64
      const slotEntries = Array.from(items.entries());
      const garmentArrays: string[][] = [[], [], []];

      for (let i = 0; i < slotEntries.length && i < 3; i++) {
        const base64 = await toBase64(slotEntries[i][1].image);
        garmentArrays[i] = [base64];
      }

      const res = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImages: garmentArrays[0].length > 0 ? garmentArrays[0] : undefined,
          secondGarmentImages: garmentArrays[1].length > 0 ? garmentArrays[1] : undefined,
          thirdGarmentImages: garmentArrays[2].length > 0 ? garmentArrays[2] : undefined,
          modelImage: selectedPortrait.dataUrl,
          modelSettings: {
            gender,
            height,
            ethnicity: 'japanese',
            pose: 'standing',
          },
          background: 'studioWhite',
          aspectRatio,
          lineUserId,
        }),
      });

      if (res.status === 402) {
        setPhase('build');
        setShowPurchase(true);
        return;
      }

      const data = await res.json();

      if (data.success && data.images?.[0]) {
        setResultImage(data.images[0]);
        setSavedImageUrl(data.savedImageUrl || null);
        setPhase('result');

        addResult({
          id: `outfit-ext-${Date.now()}`,
          portraitId: selectedPortrait.id,
          garmentName: slotEntries.map(([, item]) => item.name).join(' + '),
          resultImage: data.images[0],
          createdAt: new Date().toISOString(),
        });
      } else {
        throw new Error(data.error || (isJa ? '生成に失敗しました' : 'Generation failed'));
      }
    } catch (err: any) {
      setError(err.message || (isJa ? '試着に失敗しました' : 'Try-on failed'));
      setPhase('build');
    }
  };

  // --- Download result image ---
  const handleDownload = () => {
    const src = savedImageUrl || resultImage;
    if (!src) return;

    const a = document.createElement('a');
    a.href = src;
    a.download = `vual-tryon-${Date.now()}.png`;
    // For base64 data URLs, direct download works.
    // For remote URLs, we need to fetch and create a blob.
    if (src.startsWith('data:')) {
      a.click();
    } else {
      fetch(src)
        .then((res) => res.blob())
        .then((blob) => {
          a.href = URL.createObjectURL(blob);
          a.click();
          URL.revokeObjectURL(a.href);
        })
        .catch(() => {
          // Fallback: open in new tab
          window.open(src, '_blank');
        });
    }
  };

  const itemCount = items.size;

  // ---- Render ----

  return (
    <div className="px-4 py-6 pb-32">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/${locale}/tryon`}
          className="p-1.5 rounded-xl hover:bg-[var(--color-bg-element)] transition-colors"
        >
          <ArrowLeft size={20} className="text-[var(--color-title-active)]" />
        </Link>
        <h1 className="text-lg font-semibold text-[var(--color-title-active)]">
          {isJa ? '外部商品でコーデ試着' : 'External Outfit Try-On'}
        </h1>
      </div>

      {/* Credit Status */}
      {credits && (
        <div className="mb-6">
          <CreditStatusBar
            freeTickets={credits.freeTickets}
            dailyFreeLimit={credits.dailyFreeLimit}
            paidCredits={credits.paidCredits}
            subscriptionCredits={credits.subscriptionCredits}
            isSubscribed={credits.isSubscribed}
            onBuyCredits={() => setShowPurchase(true)}
          />
        </div>
      )}

      {phase === 'build' && (
        <>
          {/* Portrait Selector */}
          <section className="mb-6">
            <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
              {isJa ? 'ポートレート' : 'Portrait'}
            </p>
            {portraits.length === 0 ? (
              <div className="p-4 bg-[var(--color-bg-element)] rounded-xl text-center">
                <p className="text-sm text-[var(--color-text-body)] mb-2">
                  {isJa ? 'ポートレートが必要です' : 'Portrait required'}
                </p>
                <Link
                  href={`/${locale}/tryon`}
                  className="text-sm text-[var(--color-accent)] font-medium"
                >
                  {isJa ? 'ポートレートを登録する' : 'Register Portrait'}
                </Link>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {portraits.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPortrait(p)}
                    className={`shrink-0 w-14 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedPortrait?.id === p.id
                        ? 'border-[var(--color-accent)]'
                        : 'border-transparent'
                    }`}
                  >
                    <img src={p.dataUrl} alt={p.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Model Settings (simple) */}
          <section className="mb-6">
            <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
              {isJa ? 'モデル設定' : 'Model Settings'}
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--color-text-label)] mb-1 block">
                  {isJa ? '性別' : 'Gender'}
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setGender('female')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      gender === 'female'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
                    }`}
                  >
                    {isJa ? '女性' : 'Female'}
                  </button>
                  <button
                    onClick={() => setGender('male')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      gender === 'male'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
                    }`}
                  >
                    {isJa ? '男性' : 'Male'}
                  </button>
                </div>
              </div>
              <div className="w-24">
                <label className="text-[10px] text-[var(--color-text-label)] mb-1 block">
                  {isJa ? '身長' : 'Height'}
                </label>
                <div className="relative">
                  <select
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full py-2 px-3 pr-8 rounded-lg text-xs bg-[var(--color-bg-element)] border border-[var(--color-line)] text-[var(--color-text-body)] appearance-none"
                  >
                    {Array.from({ length: 8 }, (_, i) => 150 + i * 5).map((h) => (
                      <option key={h} value={h}>{h}cm</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-label)] pointer-events-none" />
                </div>
              </div>
              <div className="w-24">
                <label className="text-[10px] text-[var(--color-text-label)] mb-1 block">
                  {isJa ? '比率' : 'Ratio'}
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setAspectRatio('3:4')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      aspectRatio === '3:4'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
                    }`}
                  >
                    3:4
                  </button>
                  <button
                    onClick={() => setAspectRatio('9:16')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      aspectRatio === '9:16'
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
                    }`}
                  >
                    9:16
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Item Slots */}
          <section className="mb-6">
            <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
              {isJa ? 'アイテム' : 'Items'} ({itemCount}/3)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SLOTS.map((slot) => {
                const item = items.get(slot.id);
                const isDragging = draggingSlot === slot.id;
                return (
                  <div key={slot.id} className="relative">
                    {item ? (
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-white border border-[var(--color-line)] relative group">
                        <img src={item.image} alt={isJa ? slot.labelJa : slot.labelEn} className="w-full h-full object-contain" />
                        <button
                          onClick={() => handleRemoveSlot(slot.id)}
                          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-white" />
                        </button>
                        {/* Tap to replace */}
                        <button
                          onClick={() => fileInputRefs.current[slot.id]?.click()}
                          className="absolute inset-0"
                        />
                        <p className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-[var(--color-text-label)] bg-white/80 py-0.5">
                          {isJa ? slot.labelJa : slot.labelEn}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[slot.id]?.click()}
                        onDrop={(e) => handleDrop(e, slot.id)}
                        onDragOver={(e) => handleDragOver(e, slot.id)}
                        onDragLeave={() => setDraggingSlot(null)}
                        className={`w-full aspect-[3/4] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors ${
                          isDragging
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                            : 'border-[var(--color-line)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)]'
                        }`}
                      >
                        <Upload size={16} className="text-[var(--color-text-label)]" />
                        <span className="text-[10px] text-[var(--color-text-label)] leading-tight text-center px-1">
                          {isJa ? slot.labelJa : slot.labelEn}
                        </span>
                      </button>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[slot.id] = el; }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, slot.id)}
                      className="hidden"
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-[var(--color-text-label)] mt-2 leading-relaxed">
              {isJa
                ? '※ タップまたはドラッグ&ドロップで画像を追加'
                : '※ Tap or drag & drop to add images'}
            </p>
          </section>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl mb-4 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

        </>
      )}

      {/* Processing Phase */}
      {phase === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[var(--color-accent)] mb-4" />
          <p className="text-sm text-[var(--color-title-active)] font-medium">
            {isJa ? 'コーディネートを生成中...' : 'Creating your outfit...'}
          </p>
          <p className="text-xs text-[var(--color-text-label)] mt-2">
            {isJa ? '30秒〜1分ほどかかります' : 'This may take 30s to 1 minute'}
          </p>
        </div>
      )}

      {/* Result Phase */}
      {phase === 'result' && resultImage && (
        <div>
          {/* Result Image */}
          <div className={`relative ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[3/4]'} rounded-xl overflow-hidden bg-[var(--color-bg-element)] mb-4`}>
            <img
              src={showComparison ? selectedPortrait?.dataUrl : resultImage}
              alt="Try-on result"
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 rounded-full p-1">
              <button
                onClick={() => setShowComparison(false)}
                className={`px-3 py-1 rounded-full text-xs ${!showComparison ? 'bg-white text-black' : 'text-white'}`}
              >
                After
              </button>
              <button
                onClick={() => setShowComparison(true)}
                className={`px-3 py-1 rounded-full text-xs ${showComparison ? 'bg-white text-black' : 'text-white'}`}
              >
                Before
              </button>
            </div>
          </div>

          {/* Item Thumbnails */}
          <div className={`grid gap-2 mb-4 ${
            items.size === 1 ? 'grid-cols-1 max-w-[120px]'
              : items.size === 2 ? 'grid-cols-2 max-w-[256px]'
              : 'grid-cols-3'
          }`}>
            {Array.from(items.entries()).map(([slot, item]) => (
              <div key={slot} className="flex flex-col items-center gap-1">
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-white border border-[var(--color-line)]">
                  <img src={item.image} alt="" className="w-full h-full object-contain" />
                </div>
                <span className="text-[10px] text-[var(--color-text-label)]">
                  {isJa
                    ? SLOTS.find(s => s.id === slot)?.labelJa
                    : SLOTS.find(s => s.id === slot)?.labelEn}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-title-active)] text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <Download size={16} />
              {isJa ? '保存' : 'Save'}
            </button>
            <button className="py-2.5 px-4 rounded-xl border border-[var(--color-line)] text-sm flex items-center justify-center gap-2 text-[var(--color-title-active)]">
              <Share2 size={16} />
            </button>
            <button
              onClick={() => {
                setPhase('build');
                setResultImage(null);
                setSavedImageUrl(null);
              }}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center gap-2"
            >
              <RotateCcw size={16} />
              {isJa ? 'もう一度' : 'Try Again'}
            </button>
          </div>
        </div>
      )}

      {/* Fixed Generate Button */}
      {phase === 'build' && itemCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 pt-2 bg-gradient-to-t from-[var(--color-bg-base)] via-[var(--color-bg-base)] to-transparent z-10">
          <button
            onClick={handleGenerate}
            disabled={!selectedPortrait || itemCount === 0}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            <Sparkles size={16} />
            {isJa
              ? `試着する (${itemCount}アイテム)`
              : `Try On (${itemCount} item${itemCount > 1 ? 's' : ''})`}
          </button>
        </div>
      )}

      {/* Credit Purchase Sheet */}
      <CreditPurchaseSheet
        isOpen={showPurchase}
        onClose={() => setShowPurchase(false)}
        lineUserId={lineUserId}
      />
    </div>
  );
}
