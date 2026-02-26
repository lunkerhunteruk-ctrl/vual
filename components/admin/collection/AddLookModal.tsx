'use client';

import { useState, useEffect } from 'react';
import { X, Check, Loader2, Search } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useStoreContext } from '@/lib/store/store-context';

interface GeminiResult {
  id: string;
  image_url: string;
  created_at: string;
}

interface ModelImage {
  id: string;
  image_url: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  images: { url: string }[];
  base_price: number;
  price: number;
  currency: string;
}

interface AddLookModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: {
    imageUrl: string;
    sourceModelImageId?: string;
    sourceGeminiResultId?: string;
    productIds: string[];
  }) => Promise<void>;
}

export function AddLookModal({ open, onClose, onAdd }: AddLookModalProps) {
  const locale = useLocale();
  const store = useStoreContext((s) => s.store);
  const [tab, setTab] = useState<'gemini' | 'model'>('gemini');
  const [geminiResults, setGeminiResults] = useState<GeminiResult[]>([]);
  const [modelImages, setModelImages] = useState<ModelImage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<{ url: string; type: 'gemini' | 'model'; id: string } | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<'image' | 'products'>('image');

  // Fetch gemini results and model images
  useEffect(() => {
    if (!open) return;
    setSelectedImage(null);
    setSelectedProductIds([]);
    setStep('image');

    const fetchImages = async () => {
      setIsLoadingImages(true);
      try {
        const geminiRes = await fetch(`/api/ai/gemini-results?storeId=${store?.id || ''}&limit=50`);
        const geminiData = await geminiRes.json();
        setGeminiResults(geminiData.results || []);
        // Model images (from product_model_images) — fetched from collections API
        try {
          const modelRes = await fetch(`/api/collections/model-images`);
          const modelData = await modelRes.json();
          setModelImages(modelData.images || []);
        } catch {
          setModelImages([]);
        }
      } catch (err) {
        console.error('Failed to fetch images:', err);
      } finally {
        setIsLoadingImages(false);
      }
    };
    fetchImages();
  }, [open, store?.id]);

  // Fetch products for step 2
  useEffect(() => {
    if (step !== 'products') return;
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const res = await fetch('/api/products?status=published&limit=100');
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [step]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleAdd = async () => {
    if (!selectedImage) return;
    setIsSaving(true);
    try {
      await onAdd({
        imageUrl: selectedImage.url,
        sourceModelImageId: selectedImage.type === 'model' ? selectedImage.id : undefined,
        sourceGeminiResultId: selectedImage.type === 'gemini' ? selectedImage.id : undefined,
        productIds: selectedProductIds,
      });
      onClose();
    } catch (err) {
      console.error('Failed to add look:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (!open) return null;

  const ja = locale === 'ja';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-line)]">
          <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
            {ja ? 'ルックを追加' : 'Add Look'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {step === 'image' ? (
          <>
            {/* Tab bar */}
            <div className="flex border-b border-[var(--color-line)]">
              <button
                onClick={() => setTab('gemini')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === 'gemini'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-label)]'
                }`}
              >
                {ja ? '生成済み画像' : 'Generated Images'}
              </button>
              <button
                onClick={() => setTab('model')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === 'model'
                    ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                    : 'text-[var(--color-text-label)]'
                }`}
              >
                {ja ? '商品リンク画像' : 'Model Images'}
              </button>
            </div>

            {/* Image grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(tab === 'gemini' ? geminiResults : modelImages).map((img) => {
                    const isSelected = selectedImage?.id === img.id && selectedImage?.type === tab;
                    return (
                      <button
                        key={img.id}
                        onClick={() =>
                          setSelectedImage(
                            isSelected ? null : { url: img.image_url, type: tab, id: img.id }
                          )
                        }
                        className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30'
                            : 'border-[var(--color-line)] hover:border-[var(--color-text-label)]'
                        }`}
                      >
                        <img
                          src={img.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                            <Check size={14} className="text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  {(tab === 'gemini' ? geminiResults : modelImages).length === 0 && (
                    <p className="col-span-3 text-center text-sm text-[var(--color-text-label)] py-12">
                      {ja ? '画像がありません' : 'No images found'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-line)] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
              >
                {ja ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={() => setStep('products')}
                disabled={!selectedImage}
                className="px-6 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {ja ? '次へ' : 'Next'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Product selection step */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setStep('image')}
                  className="text-sm text-[var(--color-accent)] hover:underline"
                >
                  ← {ja ? '画像選択に戻る' : 'Back to image'}
                </button>
              </div>

              {/* Selected image preview */}
              {selectedImage && (
                <div className="flex gap-3 mb-4">
                  <img
                    src={selectedImage.url}
                    alt=""
                    className="w-20 h-28 object-cover rounded-lg border border-[var(--color-line)]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--color-title-active)]">
                      {ja ? '商品を選択（最大4点）' : 'Select products (max 4)'}
                    </p>
                    <p className="text-xs text-[var(--color-text-label)] mt-1">
                      {selectedProductIds.length}/4 {ja ? '選択中' : 'selected'}
                    </p>
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="relative mb-3">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-label)]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder={ja ? '商品を検索...' : 'Search products...'}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-line)] rounded-lg bg-[var(--color-bg-input)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            {/* Product list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isLoadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => toggleProduct(product.id)}
                        disabled={!isSelected && selectedProductIds.length >= 4}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                            : 'border-[var(--color-line)] hover:border-[var(--color-text-label)] disabled:opacity-40'
                        }`}
                      >
                        <div className="w-12 h-16 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0">
                          {product.images?.[0]?.url && (
                            <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-[var(--color-text-label)]">
                            ¥{(product.price || product.base_price || 0).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                              : 'border-[var(--color-line)]'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--color-line)] flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
              >
                {ja ? 'キャンセル' : 'Cancel'}
              </button>
              <button
                onClick={handleAdd}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg disabled:opacity-60 hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {ja ? 'コレクションに追加' : 'Add to Collection'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AddLookModal;
