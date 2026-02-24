'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Share2, ShoppingBag, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTryOnStore, type Portrait, type TryOnResult } from '@/lib/store/tryon';

interface TryOnModalProps {
  garmentImage: string; // base64 or URL
  garmentName: string;
  onClose: () => void;
  onAddToCart?: () => void;
  onPaymentRequired?: () => void;
  lineUserId?: string;
  customerId?: string;
}

export function TryOnModal({ garmentImage, garmentName, onClose, onAddToCart, onPaymentRequired, lineUserId, customerId }: TryOnModalProps) {
  const { portraits, addResult } = useTryOnStore();
  const [selectedPortrait, setSelectedPortrait] = useState<Portrait | null>(portraits[0] || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const handleTryOn = async () => {
    if (!selectedPortrait) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Ensure garment image is base64
      let garmentBase64 = garmentImage;
      if (!garmentImage.startsWith('data:')) {
        // Fetch and convert URL to base64
        const res = await fetch(garmentImage);
        const blob = await res.blob();
        garmentBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const response = await fetch('/api/ai/vton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: selectedPortrait.dataUrl,
          garmentImage: garmentBase64,
          category: 'upper_body',
          lineUserId,
          customerId,
        }),
      });

      if (response.status === 402) {
        onPaymentRequired?.();
        return;
      }

      const data = await response.json();

      if (data.success && data.resultImage) {
        setResult(data.resultImage);
        addResult({
          id: `result-${Date.now()}`,
          portraitId: selectedPortrait.id,
          garmentName,
          garmentImageUrl: garmentImage,
          resultImage: data.resultImage,
          createdAt: new Date().toISOString(),
        });
      } else {
        setError(data.error || '試着に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '試着に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-md mx-4 rounded-[var(--radius-lg)] overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)]">
            <h3 className="text-base font-semibold text-[var(--color-title-active)]">
              バーチャル試着
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--color-bg-element)]">
              <X size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {result ? (
              /* Result View */
              <div>
                <div className="relative aspect-[3/4] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-bg-element)] mb-4">
                  <img
                    src={showComparison ? selectedPortrait?.dataUrl : result}
                    alt="Try-on result"
                    className="w-full h-full object-contain"
                  />
                  {/* Before/After toggle */}
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

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-line)] text-sm flex items-center justify-center gap-2 text-[var(--color-title-active)]">
                    <Share2 size={16} />
                    共有
                  </button>
                  {onAddToCart && (
                    <button
                      onClick={onAddToCart}
                      className="flex-1 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm flex items-center justify-center gap-2"
                    >
                      <ShoppingBag size={16} />
                      カートに追加
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Selection View */
              <div>
                {/* Garment Preview */}
                <div className="aspect-square w-32 mx-auto rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-bg-element)] mb-4">
                  <img
                    src={garmentImage}
                    alt={garmentName}
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-center text-sm text-[var(--color-title-active)] font-medium mb-6">
                  {garmentName}
                </p>

                {/* Portrait Selection */}
                {portraits.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-[var(--color-text-body)] mb-2">
                      ポートレートが登録されていません
                    </p>
                    <p className="text-xs text-[var(--color-text-label)]">
                      試着タブからポートレートを追加してください
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-[var(--color-title-active)] mb-3">
                      ポートレートを選択
                    </p>
                    <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
                      {portraits.map((portrait) => (
                        <button
                          key={portrait.id}
                          onClick={() => setSelectedPortrait(portrait)}
                          className={`shrink-0 w-20 h-28 rounded-[var(--radius-md)] overflow-hidden border-2 transition-colors ${
                            selectedPortrait?.id === portrait.id
                              ? 'border-[var(--color-accent)]'
                              : 'border-transparent'
                          }`}
                        >
                          <img
                            src={portrait.dataUrl}
                            alt={portrait.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 rounded-[var(--radius-md)] bg-red-50 text-red-600 text-sm mb-4">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleTryOn}
                  disabled={!selectedPortrait || isProcessing}
                  className="w-full py-3 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      試着中...
                    </>
                  ) : (
                    '試着する'
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
