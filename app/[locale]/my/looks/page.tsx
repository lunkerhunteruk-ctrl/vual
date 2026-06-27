'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';
import { ThemeToggle } from '@/components/daily/ThemeToggle';
import { WardrobeUserBadge } from '@/components/wardrobe/UserBadge';
import { NavPill } from '@/components/wardrobe/NavPill';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface LookRecipe {
  garmentUrls?: string[];
  outfitIdx?: number;
  [key: string]: unknown;
}

interface Look {
  id: string;
  image_url: string;
  created_at: string;
  recipe?: LookRecipe | null;
}

interface CollectionLook {
  id: string;
  image_url: string;
  bundle_position: number;
  recipe?: LookRecipe | null;
}

interface Collection {
  id: string;
  title: string | null;
  created_at: string;
  looks: CollectionLook[];
}

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

const CATEGORIES = [
  { value: 'high_fashion', label: 'HIGH' },
  { value: 'street',       label: 'STREET' },
  { value: 'casual',       label: 'CASUAL' },
  { value: 'minimal',      label: 'MINIMAL' },
  { value: 'feminine',     label: 'FEMININE' },
  { value: 'classic',      label: 'CLASSIC' },
  { value: 'vintage',      label: 'VINTAGE' },
  { value: 'resort',       label: 'RESORT' },
];

export default function MyLooksPage() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // published collections
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [deletingLook, setDeletingLook] = useState<string | null>(null);
  // add-to-collection picker
  const [addTarget, setAddTarget] = useState<string | null>(null); // bundleId
  const [adding, setAdding] = useState<string | null>(null); // generationId being added

  // select + publish
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishCategory, setPublishCategory] = useState('casual');
  const [publishTitle, setPublishTitle] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ja';

  const fetchLooks = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/my/looks?uid=${uid}`);
      const data = await res.json();
      setLooks(data.looks ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCollections = useCallback(async (uid: string) => {
    setCollectionsLoading(true);
    try {
      const res = await fetch(`/api/my/collections?uid=${uid}`);
      const data = await res.json();
      setCollections(data.collections ?? []);
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!user) {
          const credits = await fetchCreditsFromSupabase(firebaseUser.uid);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || undefined,
            paidCredits: credits?.paidCredits ?? 0,
            freeUsed: credits?.freeUsed ?? 0,
            points: 0,
            createdAt: new Date(),
          });
          if (credits) syncFromFirestore(credits.paidCredits, credits.freeUsed, credits.freeResetDate);
        }
        fetchLooks(firebaseUser.uid);
        fetchCollections(firebaseUser.uid);
      } else {
        setLoading(false);
        setCollectionsLoading(false);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteCollectionLook = async (lookId: string, bundleId: string) => {
    if (!user || !confirm('このルックをコレクションから削除しますか？')) return;
    setDeletingLook(lookId);
    try {
      const res = await fetch('/api/my/collection-look', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookId, firebaseUid: user.id }),
      });
      if (res.ok) {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === bundleId
              ? { ...c, looks: c.looks.filter((l) => l.id !== lookId) }
              : c
          ).filter((c) => c.looks.length > 0)
        );
      }
    } finally {
      setDeletingLook(null);
    }
  };

  const handleAddToCollection = async (bundleId: string, generationId: string) => {
    if (!user) return;
    setAdding(generationId);
    try {
      const res = await fetch('/api/my/collection-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, generationId, firebaseUid: user.id }),
      });
      if (res.ok) {
        await fetchCollections(user.id);
        setAddTarget(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`追加失敗: ${err.error || res.status}`);
      }
    } finally {
      setAdding(null);
    }
  };

  const toggleSelect = (look: Look) => {
    if (!look.recipe) return; // only own creations can be selected
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(look.id)) next.delete(look.id); else next.add(look.id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setPublished(false);
  };

  const handleDelete = async (look: Look) => {
    if (!user || !confirm('このルックを削除しますか？')) return;
    setDeleting(look.id);
    try {
      await fetch(`/api/my/looks/${look.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.id }),
      });
      setLooks((prev) => prev.filter((l) => l.id !== look.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = (look: Look) => {
    const a = document.createElement('a');
    a.href = look.image_url;
    a.download = `look-${look.id.slice(0, 8)}.jpg`;
    a.target = '_blank';
    a.click();
  };

  const handlePublish = async () => {
    if (!user || selectedIds.size === 0) return;
    setPublishing(true);
    try {
      const selected = looks.filter((l) => selectedIds.has(l.id));
      const imageUrls = selected.map((l) => l.image_url);
      const recipes = selected.map((l) => l.recipe ?? null);

      // Build garmentUrlSets from recipes (keyed by outfitIdx)
      const garmentUrlSets: Record<number, string[]> = {};
      selected.forEach((l, i) => {
        if (l.recipe?.garmentUrls?.length) {
          const idx = l.recipe.outfitIdx ?? i;
          garmentUrlSets[idx] = l.recipe.garmentUrls;
        }
      });

      const res = await fetch('/api/my/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrls,
          category: publishCategory,
          title: publishTitle || null,
          firebaseUid: user.id,
          recipes,
          garmentUrlSets,
        }),
      });

      if (res.ok) {
        setPublished(true);
        setShowPublishModal(false);
        setSelectMode(false);
        setSelectedIds(new Set());
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`公開に失敗しました: ${err.error || res.status}`);
      }
    } catch (e) {
      alert(`公開エラー: ${String(e)}`);
    } finally {
      setPublishing(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const ownCreationCount = looks.filter((l) => !!l.recipe).length;

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{ background: 'var(--vault-bg)', color: 'var(--vault-text)', fontFamily: MONO }}
    >
      <NavPill active="wardrobe" locale={locale} />
      <WardrobeUserBadge />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>


      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-32 space-y-12">

        {/* Page title + select toggle */}
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <p className="text-[10px] tracking-[4px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
              MY WARDROBE
            </p>
            <h1 className="text-[13px] font-light" style={{ color: 'var(--vault-text)' }}>
              保存したルック
            </h1>
          </div>
          {!loading && user && ownCreationCount > 0 && (
            selectMode ? (
              <div className="flex items-center gap-3">
                {selectedIds.size > 0 && !published && (
                  <button
                    onClick={() => setShowPublishModal(true)}
                    className="px-4 py-2 text-[10px] tracking-[2px] transition-opacity hover:opacity-70"
                    style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
                  >
                    {selectedIds.size}枚を公開
                  </button>
                )}
                {published && (
                  <span className="text-[10px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
                    公開済み ✓
                  </span>
                )}
                <button
                  onClick={exitSelectMode}
                  className="text-[10px] tracking-[2px] transition-opacity hover:opacity-60"
                  style={{ color: 'var(--vault-text-dim)' }}
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSelectMode(true)}
                className="text-[10px] tracking-[2px] transition-opacity hover:opacity-60"
                style={{ color: 'var(--vault-text-dim)' }}
              >
                SELECT
              </button>
            )
          )}
        </div>

        {/* Published collections */}
        {user && !collectionsLoading && collections.length > 0 && (
          <div className="space-y-6">
            <p className="text-[10px] tracking-[4px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
              PUBLISHED COLLECTIONS
            </p>
            {collections.map((col) => (
              <div key={col.id} className="space-y-3">
                {/* Collection header */}
                <div className="flex items-baseline justify-between">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text)' }}>
                    {col.title || '—'}{' '}
                    <span className="text-[10px]" style={{ color: 'var(--vault-text-dim)' }}>
                      · {col.looks.length}枚
                    </span>
                  </p>
                  <button
                    onClick={() => setAddTarget(col.id)}
                    className="text-[10px] tracking-[2px] transition-opacity hover:opacity-60"
                    style={{ color: 'var(--vault-text-dim)' }}
                  >
                    ＋ ADD
                  </button>
                </div>

                {/* Horizontal look strip */}
                <div className="flex gap-[2px] overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {col.looks.map((look) => (
                    <div
                      key={look.id}
                      className="relative flex-shrink-0 group"
                      style={{ width: 80, height: 107 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={look.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      {/* Delete overlay */}
                      <button
                        onClick={() => handleDeleteCollectionLook(look.id, col.id)}
                        disabled={deletingLook === look.id}
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                        style={{ background: 'rgba(0,0,0,0.45)' }}
                      >
                        {deletingLook === look.id ? (
                          <div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div style={{ borderBottom: '1px solid var(--vault-border)' }} />
          </div>
        )}

        {/* Not logged in */}
        {!user && !loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <p className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              LOGIN TO VIEW YOUR WARDROBE
            </p>
            <button
              onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
              className="px-6 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)' }}
            >
              SIGN IN WITH GOOGLE
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div
              className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: 'var(--vault-text-dim)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {/* Empty */}
        {!loading && user && looks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <p className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              NO LOOKS SAVED YET
            </p>
            <Link
              href={`/${locale}/my/generate`}
              className="px-6 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)' }}
            >
              GENERATE YOUR FIRST LOOK
            </Link>
          </div>
        )}

        {/* Grid */}
        {!loading && looks.length > 0 && (
          <div className="grid grid-cols-3 gap-[2px]">
            {looks.map((look) => {
              const isOwn = !!look.recipe;
              const isSelected = selectedIds.has(look.id);
              const selectable = selectMode && isOwn;

              return (
                <div key={look.id} className="group">
                  <div
                    className="aspect-[3/4] relative overflow-hidden"
                    style={{
                      background: 'var(--vault-border)',
                      cursor: selectable ? 'pointer' : 'default',
                    }}
                    onClick={() => selectable && toggleSelect(look)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={look.image_url} alt="look" className="w-full h-full object-cover" />

                    {/* Selection overlay */}
                    {selectable && isSelected && (
                      <>
                        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #fff' }} />
                        <div
                          className="absolute top-2 right-2 pointer-events-none flex items-center justify-center rounded-full"
                          style={{ width: 22, height: 22, background: '#fff' }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Own creation badge */}
                    {isOwn && !selectMode && (
                      <div
                        className="absolute top-1.5 left-1.5 pointer-events-none"
                        style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--vault-cyan, #0ff)' }}
                      />
                    )}

                    {/* Hover actions (normal mode only) */}
                    {!selectMode && (
                      <div className="absolute inset-x-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div
                          className="absolute inset-x-0 bottom-0 pointer-events-none"
                          style={{ height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 100%)' }}
                        />
                        <div className="relative flex gap-[1px]">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownload(look); }}
                            className="flex-1 py-2 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-80"
                            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
                          >
                            DL
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(look); }}
                            disabled={deleting === look.id}
                            className="flex-1 py-2 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                            style={{ background: 'rgba(160,0,0,0.55)', backdropFilter: 'blur(10px)' }}
                          >
                            {deleting === look.id ? '...' : 'DEL'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] tracking-[2px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>
                    {formatDate(look.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Hint */}
        {!loading && user && ownCreationCount > 0 && !selectMode && (
          <p className="text-[9px] tracking-[2px] text-center" style={{ color: 'var(--vault-text-dim)' }}>
            ● 自分が生成したルック — SELECT で公開できます
          </p>
        )}
      </div>

      {/* Add-to-collection picker */}
      {addTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAddTarget(null); }}
        >
          <div
            className="w-full sm:max-w-sm mx-auto flex flex-col"
            style={{ background: 'var(--vault-bg)', maxHeight: '75dvh', fontFamily: MONO }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--vault-border)' }}
            >
              <span className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
                ルックを追加
              </span>
              <button onClick={() => setAddTarget(null)} style={{ color: 'var(--vault-text-dim)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              {looks.filter((l) => !!l.recipe).length === 0 ? (
                <p className="text-[11px] text-center py-8" style={{ color: 'var(--vault-text-dim)' }}>
                  追加できるルックがありません
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {looks.filter((l) => !!l.recipe).map((look) => (
                    <button
                      key={look.id}
                      onClick={() => handleAddToCollection(addTarget, look.id)}
                      disabled={!!adding}
                      className="relative aspect-[3/4] overflow-hidden disabled:opacity-40"
                      style={{ background: 'var(--vault-border)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={look.image_url} alt="" className="w-full h-full object-cover" />
                      {adding === look.id && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
                          <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Publish modal */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowPublishModal(false); }}
        >
          <div
            className="w-full max-w-sm mx-4 p-6 flex flex-col gap-5"
            style={{ background: 'var(--vault-bg)', border: '1px solid var(--vault-border)', fontFamily: MONO }}
          >
            <div className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text)' }}>
              {selectedIds.size}枚のルックを公開
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>カテゴリ</span>
              <div className="grid grid-cols-4 gap-[2px]">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setPublishCategory(c.value)}
                    className="py-2 text-[9px] tracking-wider transition-opacity hover:opacity-80"
                    style={{
                      background: publishCategory === c.value ? 'var(--vault-text)' : 'var(--vault-border)',
                      color: publishCategory === c.value ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>タイトル（任意）</span>
              <input
                type="text"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="My Look"
                className="w-full px-3 py-2 text-[12px] outline-none bg-transparent"
                style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
              />
            </div>

            <div className="flex gap-[2px]">
              <button
                onClick={() => setShowPublishModal(false)}
                className="flex-1 py-3 text-[12px] tracking-wide hover:opacity-70"
                style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)' }}
              >
                キャンセル
              </button>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="flex-1 py-3 text-[12px] tracking-wide hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
              >
                {publishing ? '公開中...' : '公開する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
