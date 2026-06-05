'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { Search, Loader2, X, Trash2, Plus, Check, Shirt } from 'lucide-react';
import { getCategoryLabel } from '@/lib/utils/category';

interface Product {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  product_images?: { id: string; url: string; is_primary: boolean }[];
}

interface CoordinateItem {
  productId: string;
  category: string;
  position: number;
}

interface Coordinate {
  id: string;
  name: string;
  items: CoordinateItem[];
  cover_image_url: string | null;
  created_at: string;
}

const SLOT_COUNT = 5;

export default function CoordinatePage() {
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state: one product (or null) per slot.
  const [slots, setSlots] = useState<(Product | null)[]>(Array(SLOT_COUNT).fill(null));
  const [name, setName] = useState('');
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const productName = (p: Product) => (locale === 'ja' ? p.name : p.name_en || p.name);
  const productImage = (p: Product | null) => {
    if (!p?.product_images?.length) return null;
    return (p.product_images.find((i) => i.is_primary) || p.product_images[0])?.url || null;
  };

  // Load products + coordinates
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          fetch('/api/products?status=all&limit=200'),
          fetch('/api/coordinates'),
        ]);
        const pData = await pRes.json();
        const cData = await cRes.json();
        if (pData.products) setProducts(pData.products);
        if (cData.coordinates) setCoordinates(cData.coordinates);
      } catch (e) {
        console.error('Load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedIds = slots.filter(Boolean).map((p) => p!.id);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedIds.includes(p.id)) return false; // hide already-picked
      if (!q) return true;
      return productName(p).toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    });
  }, [products, search, selectedIds, locale]);

  const pickProduct = (p: Product) => {
    if (activeSlot === null) return;
    setSlots((prev) => {
      const next = [...prev];
      next[activeSlot] = p;
      return next;
    });
    setActiveSlot(null);
    setSearch('');
  };

  const clearSlot = (i: number) =>
    setSlots((prev) => {
      const next = [...prev];
      next[i] = null;
      return next;
    });

  const reset = () => {
    setSlots(Array(SLOT_COUNT).fill(null));
    setName('');
    setActiveSlot(null);
  };

  const save = async () => {
    const filledSlots = slots.filter(Boolean) as Product[];
    if (filledSlots.length === 0) return;
    setSaving(true);
    try {
      const items: CoordinateItem[] = filledSlots.map((p, idx) => ({
        productId: p.id,
        category: p.category,
        position: idx,
      }));
      const coverImageUrl = productImage(filledSlots[0]);
      const res = await fetch('/api/coordinates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items, coverImageUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      const created = await res.json();
      setCoordinates((prev) => [created, ...prev]);
      reset();
    } catch (e) {
      console.error(e);
      alert(locale === 'ja' ? '保存に失敗しました' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteCoordinate = async (id: string) => {
    if (!confirm(locale === 'ja' ? 'このコーディネートを削除しますか？' : 'Delete this coordinate?')) return;
    try {
      const res = await fetch(`/api/coordinates?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setCoordinates((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const productById = (id: string) => products.find((p) => p.id === id);
  const filledCount = slots.filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[var(--color-text-label)]" size={24} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Shirt size={22} className="text-[var(--color-accent)]" />
        <h1 className="text-2xl font-bold text-[var(--color-text-title)]">
          {locale === 'ja' ? 'コーディネート' : 'Coordinate'}
        </h1>
      </div>
      <p className="text-sm text-[var(--color-text-label)] mb-8">
        {locale === 'ja'
          ? '登録商品を組み合わせてコーデを作成。スタジオで丸ごと挿入できます。'
          : 'Assemble outfits from your catalog. Insert them whole in the studio.'}
      </p>

      {/* Builder */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={locale === 'ja' ? 'コーデ名（任意）' : 'Coordinate name (optional)'}
            className="text-sm px-3 py-2 border border-[var(--color-line)] rounded-[var(--radius-sm)] w-64 bg-transparent"
          />
          <div className="flex gap-2">
            <button
              onClick={reset}
              className="text-xs px-3 py-2 rounded-[var(--radius-sm)] text-[var(--color-text-label)] hover:bg-[var(--color-bg-element)]"
            >
              {locale === 'ja' ? 'クリア' : 'Clear'}
            </button>
            <button
              onClick={save}
              disabled={filledCount === 0 || saving}
              className="text-xs px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] text-white font-medium disabled:opacity-40 flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {locale === 'ja' ? '保存' : 'Save'}
            </button>
          </div>
        </div>

        {/* Slots */}
        <div className="grid grid-cols-5 gap-3">
          {slots.map((p, i) => {
            const img = productImage(p);
            return (
              <div key={i} className="flex flex-col">
                <button
                  onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                  className={`relative aspect-[3/4] rounded-[var(--radius-sm)] border-2 overflow-hidden transition-colors ${
                    activeSlot === i
                      ? 'border-[var(--color-accent)]'
                      : p
                      ? 'border-[var(--color-line)]'
                      : 'border-dashed border-[var(--color-line)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  {p && img ? (
                    <img src={img} alt={productName(p)} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-element)] text-[var(--color-text-label)]">
                      <Plus size={20} />
                    </div>
                  )}
                  {p && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        clearSlot(i);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                    >
                      <X size={11} />
                    </span>
                  )}
                </button>
                <span className="text-[10px] text-center mt-1 text-[var(--color-text-label)] truncate">
                  {p ? getCategoryLabel(p.category, locale) : `${locale === 'ja' ? 'スロット' : 'Slot'} ${i + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Product picker (shown when a slot is active) */}
        {activeSlot !== null && (
          <div className="mt-5 border-t border-[var(--color-line)] pt-4">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-label)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                placeholder={locale === 'ja' ? '商品を検索…' : 'Search products…'}
                className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-line)] rounded-[var(--radius-sm)] bg-transparent"
              />
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-72 overflow-y-auto">
              {filtered.map((p) => {
                const img = productImage(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => pickProduct(p)}
                    className="text-left group"
                  >
                    <div className="aspect-[3/4] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-element)] mb-1">
                      {img ? (
                        <img src={img} alt={productName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-label)]">
                          <Shirt size={18} />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] truncate text-[var(--color-text-body)]">{productName(p)}</p>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="col-span-6 text-center text-xs text-[var(--color-text-label)] py-8">
                  {locale === 'ja' ? '商品がありません' : 'No products'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Saved coordinates */}
      <h2 className="text-sm font-semibold text-[var(--color-text-title)] mb-4">
        {locale === 'ja' ? '保存済みコーディネート' : 'Saved Coordinates'} ({coordinates.length})
      </h2>
      {coordinates.length === 0 ? (
        <p className="text-sm text-[var(--color-text-label)] py-8 text-center border border-dashed border-[var(--color-line)] rounded-[var(--radius-md)]">
          {locale === 'ja' ? 'まだコーディネートがありません' : 'No coordinates yet'}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {coordinates.map((c) => (
            <div key={c.id} className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden group">
              <div className="flex">
                {c.items.slice(0, SLOT_COUNT).map((item, idx) => {
                  const p = productById(item.productId);
                  const img = productImage(p || null);
                  return (
                    <div key={idx} className="flex-1 aspect-[3/4] bg-[var(--color-bg-element)] overflow-hidden">
                      {img ? (
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-text-label)]">
                          <Shirt size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--color-text-body)] truncate">
                    {c.name || (locale === 'ja' ? '無題のコーデ' : 'Untitled')}
                  </p>
                  <p className="text-[10px] text-[var(--color-text-label)]">
                    {c.items.length} {locale === 'ja' ? 'アイテム' : 'items'}
                  </p>
                </div>
                <button
                  onClick={() => deleteCoordinate(c.id)}
                  className="text-[var(--color-text-label)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
