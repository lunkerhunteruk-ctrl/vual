'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Loader2, Share2, ShoppingBag, Plus, Trash2, Sparkles,
  ChevronLeft, Check,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { useTryOnStore, type Portrait } from '@/lib/store/tryon';
import { useCartStore } from '@/lib/store/cart';
import { mapToVtonCategory, VTON_SLOTS, type VTONCategory } from '@/lib/utils/vton-category';
import { formatPrice } from '@/lib/utils/currency';

// --- Types ---

interface OutfitProduct {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  image: string;
  category: string; // e.g. "mens-wear-tops"
}

interface OutfitTryOnModalProps {
  initialProduct: OutfitProduct & { storeId: string };
  onClose: () => void;
  onPaymentRequired?: () => void;
  lineUserId?: string;
  customerId?: string;
}

type Phase = 'build' | 'processing' | 'result';

// --- Component ---

export function OutfitTryOnModal({
  initialProduct,
  onClose,
  onPaymentRequired,
  lineUserId,
  customerId,
}: OutfitTryOnModalProps) {
  const locale = useLocale();
  const isJa = locale === 'ja';
  const { portraits, addResult } = useTryOnStore();
  const addCartItem = useCartStore((s) => s.addItem);

  // --- State ---
  const [selectedItems, setSelectedItems] = useState<Map<VTONCategory, OutfitProduct>>(new Map());
  const [activeSlot, setActiveSlot] = useState<VTONCategory | null>(null);
  const [slotProducts, setSlotProducts] = useState<OutfitProduct[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [selectedPortrait, setSelectedPortrait] = useState<Portrait | null>(portraits[0] || null);
  const [phase, setPhase] = useState<Phase>('build');
  const [queueId, setQueueId] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Initialize with the product that triggered the modal ---
  useEffect(() => {
    const vtonCat = mapToVtonCategory(initialProduct.category);
    if (vtonCat) {
      setSelectedItems(new Map([[vtonCat, initialProduct]]));
    }
  }, [initialProduct]);

  // --- Fetch products for a slot ---
  const loadSlotProducts = useCallback(async (slot: VTONCategory) => {
    setSlotLoading(true);
    try {
      const params = new URLSearchParams({
        storeId: initialProduct.storeId,
        vtonSlot: slot,
        excludeId: initialProduct.id,
        limit: '20',
      });
      const res = await fetch(`/api/customer/store-products?${params}`);
      const data = await res.json();
      setSlotProducts(data.products || []);
    } catch {
      setSlotProducts([]);
    } finally {
      setSlotLoading(false);
    }
  }, [initialProduct.storeId, initialProduct.id]);

  // Load products when active slot changes
  useEffect(() => {
    if (activeSlot) {
      loadSlotProducts(activeSlot);
    }
  }, [activeSlot, loadSlotProducts]);

  // --- Handlers ---

  const handleSelectProduct = (slot: VTONCategory, product: OutfitProduct) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.set(slot, product);
      return next;
    });
  };

  const handleRemoveSlot = (slot: VTONCategory) => {
    // Don't allow removing the initial product's slot
    const initialSlot = mapToVtonCategory(initialProduct.category);
    if (slot === initialSlot) return;
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(slot);
      return next;
    });
  };

  // Convert image URL to base64
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
    if (!selectedPortrait || selectedItems.size === 0) return;
    setPhase('processing');
    setError(null);
    setProgress(isJa ? 'コーディネートを準備中...' : 'Preparing your outfit...');

    try {
      // Prepare garment images + categories
      const entries = Array.from(selectedItems.entries());
      const garmentImages: string[] = [];
      const categories: VTONCategory[] = [];

      for (const [cat, product] of entries) {
        const base64 = await toBase64(product.image);
        garmentImages.push(base64);
        categories.push(cat);
      }

      setProgress(isJa ? 'キューに送信中...' : 'Submitting to queue...');

      const res = await fetch('/api/ai/vton-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: selectedPortrait.dataUrl,
          garmentImages,
          categories,
          storeId: initialProduct.storeId,
          productId: initialProduct.id,
          lineUserId,
          customerId,
        }),
      });

      if (res.status === 402) {
        setPhase('build');
        onPaymentRequired?.();
        return;
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Queue submission failed');
      }

      setQueueId(data.queueId);
      setProgress(isJa ? 'コーディネートを生成中...' : 'Creating your outfit...');

      // Start polling
      startPolling(data.queueId);
    } catch (err: any) {
      setError(err.message || (isJa ? '試着に失敗しました' : 'Try-on failed'));
      setPhase('build');
    }
  };

  const startPolling = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/vton-queue?id=${id}`);
        const data = await res.json();
        const item = data.item;

        if (!item) return;

        if (item.status === 'completed' && item.resultData?.results?.[0]) {
          stopPolling();
          const firstResult = item.resultData.results[0];
          setResultImage(firstResult.resultImage);
          setPhase('result');

          // Save result to store
          addResult({
            id: `outfit-${Date.now()}`,
            portraitId: selectedPortrait!.id,
            garmentName: Array.from(selectedItems.values()).map(p => p.name).join(' + '),
            resultImage: firstResult.resultImage,
            createdAt: new Date().toISOString(),
          });
        } else if (item.status === 'failed') {
          stopPolling();
          setError(item.errorMessage || (isJa ? '処理に失敗しました' : 'Processing failed'));
          setPhase('build');
        } else if (item.status === 'processing') {
          setProgress(isJa ? '生成中...' : 'Generating...');
        } else {
          setProgress(
            isJa
              ? `キュー待機中 (${item.itemsAhead + 1}番目)...`
              : `In queue (position ${item.itemsAhead + 1})...`
          );
        }
      } catch {
        // Continue polling on network errors
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);

  const handleAddAllToCart = () => {
    for (const product of selectedItems.values()) {
      addCartItem({
        productId: product.id,
        variantId: 'default',
        name: product.name,
        price: product.price,
        currency: product.currency || 'jpy',
        image: product.image,
        options: {},
      });
    }
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const totalPrice = Array.from(selectedItems.values()).reduce((sum, p) => sum + p.price, 0);
  const itemCount = selectedItems.size;
  const initialSlot = mapToVtonCategory(initialProduct.category);

  // --- Available slots (exclude already-selected) for "add more" ---
  const availableSlots = VTON_SLOTS.filter(
    (s) => !selectedItems.has(s.id) && s.id !== initialSlot
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-line)] shrink-0">
          {phase === 'result' ? (
            <button
              onClick={() => { setPhase('build'); setResultImage(null); }}
              className="flex items-center gap-1 text-sm text-[var(--color-text-body)]"
            >
              <ChevronLeft size={18} />
              {isJa ? '戻る' : 'Back'}
            </button>
          ) : (
            <h3 className="text-base font-semibold text-[var(--color-title-active)]">
              {isJa ? 'コーディネート試着' : 'Outfit Try-On'}
            </h3>
          )}
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--color-bg-element)]">
            <X size={20} className="text-[var(--color-text-label)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {phase === 'build' && (
            <BuildPhase
              selectedItems={selectedItems}
              activeSlot={activeSlot}
              slotProducts={slotProducts}
              slotLoading={slotLoading}
              portraits={portraits}
              selectedPortrait={selectedPortrait}
              initialSlot={initialSlot}
              availableSlots={availableSlots}
              error={error}
              isJa={isJa}
              onSelectPortrait={setSelectedPortrait}
              onSetActiveSlot={setActiveSlot}
              onSelectProduct={handleSelectProduct}
              onRemoveSlot={handleRemoveSlot}
            />
          )}

          {phase === 'processing' && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Loader2 size={40} className="animate-spin text-[var(--color-accent)] mb-4" />
              <p className="text-sm text-[var(--color-title-active)] font-medium">{progress}</p>
              <p className="text-xs text-[var(--color-text-label)] mt-2">
                {isJa ? 'このまましばらくお待ちください' : 'Please wait a moment'}
              </p>
            </div>
          )}

          {phase === 'result' && resultImage && (
            <ResultPhase
              resultImage={resultImage}
              selectedItems={selectedItems}
              selectedPortrait={selectedPortrait}
              showComparison={showComparison}
              addedToCart={addedToCart}
              totalPrice={totalPrice}
              isJa={isJa}
              onToggleComparison={setShowComparison}
              onAddAllToCart={handleAddAllToCart}
            />
          )}
        </div>

        {/* Bottom CTA — Build phase only */}
        {phase === 'build' && (
          <div className="p-4 border-t border-[var(--color-line)] shrink-0">
            <button
              onClick={handleTryOn}
              disabled={!selectedPortrait || selectedItems.size === 0}
              className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              {isJa
                ? `試着する (${itemCount}アイテム)`
                : `Try On (${itemCount} item${itemCount > 1 ? 's' : ''})`}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function BuildPhase({
  selectedItems,
  activeSlot,
  slotProducts,
  slotLoading,
  portraits,
  selectedPortrait,
  initialSlot,
  availableSlots,
  error,
  isJa,
  onSelectPortrait,
  onSetActiveSlot,
  onSelectProduct,
  onRemoveSlot,
}: {
  selectedItems: Map<VTONCategory, OutfitProduct>;
  activeSlot: VTONCategory | null;
  slotProducts: OutfitProduct[];
  slotLoading: boolean;
  portraits: Portrait[];
  selectedPortrait: Portrait | null;
  initialSlot: VTONCategory | null;
  availableSlots: typeof VTON_SLOTS;
  error: string | null;
  isJa: boolean;
  onSelectPortrait: (p: Portrait) => void;
  onSetActiveSlot: (s: VTONCategory | null) => void;
  onSelectProduct: (slot: VTONCategory, product: OutfitProduct) => void;
  onRemoveSlot: (slot: VTONCategory) => void;
}) {
  return (
    <div className="p-4 space-y-5">
      {/* Portrait Selector */}
      <div>
        <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
          {isJa ? 'ポートレート' : 'Portrait'}
        </p>
        {portraits.length === 0 ? (
          <div className="p-3 bg-[var(--color-bg-element)] rounded-xl text-center">
            <p className="text-sm text-[var(--color-text-body)]">
              {isJa ? 'ポートレートを登録してください' : 'Please register a portrait first'}
            </p>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {portraits.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelectPortrait(p)}
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
      </div>

      {/* Selected Items */}
      <div>
        <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
          {isJa ? 'アイテム' : 'Items'}
        </p>
        <div className="space-y-2">
          {VTON_SLOTS.map((slot) => {
            const item = selectedItems.get(slot.id);
            if (!item) return null;
            const isInitial = slot.id === initialSlot;
            return (
              <div
                key={slot.id}
                className="flex items-center gap-3 p-2 rounded-xl bg-[var(--color-bg-element)]"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-white shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--color-text-label)]">
                    {isJa ? slot.labelJa : slot.labelEn}
                  </p>
                  <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-accent)]">
                    {formatPrice(item.price, item.currency || 'jpy', isJa ? 'ja-JP' : undefined, false)}
                  </p>
                </div>
                {!isInitial && (
                  <button
                    onClick={() => onRemoveSlot(slot.id)}
                    className="p-1.5 rounded-full hover:bg-white/60"
                  >
                    <Trash2 size={14} className="text-[var(--color-text-label)]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add More Slots */}
      {availableSlots.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wider mb-2">
            {isJa ? 'アイテムを追加' : 'Add Items'}
          </p>
          <div className="flex gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => onSetActiveSlot(activeSlot === slot.id ? null : slot.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeSlot === slot.id
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-bg-element)] text-[var(--color-title-active)]'
                }`}
              >
                <Plus size={12} />
                {isJa ? slot.labelJa : slot.labelEn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Slot Product Picker */}
      <AnimatePresence>
        {activeSlot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {slotLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-[var(--color-text-label)]" />
              </div>
            ) : slotProducts.length === 0 ? (
              <p className="text-sm text-[var(--color-text-label)] text-center py-4">
                {isJa ? 'このカテゴリの商品がありません' : 'No products in this category'}
              </p>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {slotProducts.map((product) => {
                  const isSelected = selectedItems.get(activeSlot)?.id === product.id;
                  return (
                    <button
                      key={product.id}
                      onClick={() => {
                        onSelectProduct(activeSlot, product);
                        onSetActiveSlot(null);
                      }}
                      className={`shrink-0 w-24 rounded-xl overflow-hidden border-2 transition-colors ${
                        isSelected
                          ? 'border-[var(--color-accent)]'
                          : 'border-[var(--color-line)]'
                      }`}
                    >
                      <div className="aspect-square bg-[var(--color-bg-element)]">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] text-[var(--color-title-active)] truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-[var(--color-accent)] font-medium">
                          {formatPrice(product.price, product.currency || 'jpy', isJa ? 'ja-JP' : undefined, false)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

function ResultPhase({
  resultImage,
  selectedItems,
  selectedPortrait,
  showComparison,
  addedToCart,
  totalPrice,
  isJa,
  onToggleComparison,
  onAddAllToCart,
}: {
  resultImage: string;
  selectedItems: Map<VTONCategory, OutfitProduct>;
  selectedPortrait: Portrait | null;
  showComparison: boolean;
  addedToCart: boolean;
  totalPrice: number;
  isJa: boolean;
  onToggleComparison: (v: boolean) => void;
  onAddAllToCart: () => void;
}) {
  return (
    <div className="p-4">
      {/* Result Image */}
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--color-bg-element)] mb-4">
        <img
          src={showComparison ? selectedPortrait?.dataUrl : resultImage}
          alt="Try-on result"
          className="w-full h-full object-contain"
        />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 rounded-full p-1">
          <button
            onClick={() => onToggleComparison(false)}
            className={`px-3 py-1 rounded-full text-xs ${!showComparison ? 'bg-white text-black' : 'text-white'}`}
          >
            After
          </button>
          <button
            onClick={() => onToggleComparison(true)}
            className={`px-3 py-1 rounded-full text-xs ${showComparison ? 'bg-white text-black' : 'text-white'}`}
          >
            Before
          </button>
        </div>
      </div>

      {/* Items Summary */}
      <div className="space-y-2 mb-4">
        {Array.from(selectedItems.entries()).map(([cat, product]) => (
          <div key={cat} className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-body)] truncate">{product.name}</span>
            <span className="text-[var(--color-title-active)] font-medium shrink-0 ml-2">
              {formatPrice(product.price, product.currency || 'jpy', isJa ? 'ja-JP' : undefined, false)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-line)]">
          <span className="text-sm font-semibold text-[var(--color-title-active)]">
            {isJa ? '合計' : 'Total'}
          </span>
          <span className="text-sm font-semibold text-[var(--color-accent)]">
            {formatPrice(totalPrice, 'jpy', isJa ? 'ja-JP' : undefined, false)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 py-2.5 rounded-xl border border-[var(--color-line)] text-sm flex items-center justify-center gap-2 text-[var(--color-title-active)]">
          <Share2 size={16} />
          {isJa ? '共有' : 'Share'}
        </button>
        <button
          onClick={onAddAllToCart}
          disabled={addedToCart}
          className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {addedToCart ? (
            <>
              <Check size={16} />
              {isJa ? '追加しました' : 'Added!'}
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              {isJa ? 'まとめてカートへ' : 'Add All to Cart'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
