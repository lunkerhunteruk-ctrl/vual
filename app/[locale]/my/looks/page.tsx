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
  garmentNames?: (string | null)[];
  garmentLinks?: (string | null)[];
  aspectRatio?: string;
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

interface UserProfile {
  displayName: string;
  avatarUrl: string;
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

  // look detail modal
  const [detailLook, setDetailLook] = useState<Look | null>(null);
  const [editNames, setEditNames] = useState<string[]>([]);
  const [editLinks, setEditLinks] = useState<string[]>([]);
  const [savingGarments, setSavingGarments] = useState(false);
  const [garmentSaved, setGarmentSaved] = useState(false);

  // published collections
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [deletingLook, setDeletingLook] = useState<string | null>(null);
  // add-to-collection picker
  const [addTarget, setAddTarget] = useState<string | null>(null); // bundleId
  const [pickerSelected, setPickerSelected] = useState<Set<string>>(new Set());
  const [addingBulk, setAddingBulk] = useState(false);

  // user profile
  const [profile, setProfile] = useState<UserProfile>({ displayName: '', avatarUrl: '' });
  const [editDisplayName, setEditDisplayName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);

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

  const fetchProfile = useCallback(async (uid: string) => {
    const res = await fetch(`/api/my/profile?uid=${uid}`);
    const data = await res.json();
    if (data.profile) {
      setProfile({ displayName: data.profile.display_name ?? '', avatarUrl: data.profile.avatar_url ?? '' });
      setEditDisplayName(data.profile.display_name ?? '');
      setAvatarPreview(data.profile.avatar_url ?? '');
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
        fetchProfile(firebaseUser.uid);
      } else {
        setLoading(false);
        setCollectionsLoading(false);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      const res = await fetch('/api/my/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: user.id,
          displayName: editDisplayName,
          avatarDataUrl: avatarDataUrl || undefined,
        }),
      });
      if (res.ok) {
        const { profile: updated } = await res.json();
        setProfile({ displayName: updated.display_name ?? '', avatarUrl: updated.avatar_url ?? '' });
        setAvatarDataUrl('');
        setProfileSaved(true);
        setTimeout(() => { setProfileSaved(false); setShowProfileEditor(false); }, 1500);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const openDetail = (look: Look) => {
    setDetailLook(look);
    setGarmentSaved(false);
    const urls = look.recipe?.garmentUrls ?? [];
    setEditNames(urls.map((_, i) => look.recipe?.garmentNames?.[i] ?? ''));
    setEditLinks(urls.map((_, i) => look.recipe?.garmentLinks?.[i] ?? ''));
  };

  const handleSaveGarments = async () => {
    if (!detailLook || !user) return;
    setSavingGarments(true);
    try {
      const res = await fetch(`/api/my/looks/${detailLook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.id, garmentNames: editNames, garmentLinks: editLinks }),
      });
      if (res.ok) {
        const { recipe } = await res.json();
        setDetailLook((prev) => prev ? { ...prev, recipe } : prev);
        setLooks((prev) => prev.map((l) => l.id === detailLook.id ? { ...l, recipe } : l));
        setGarmentSaved(true);
      }
    } finally {
      setSavingGarments(false);
    }
  };

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

  const handleAddBulk = async () => {
    if (!user || !addTarget || pickerSelected.size === 0) return;
    setAddingBulk(true);
    try {
      await Promise.all(
        [...pickerSelected].map((generationId) =>
          fetch('/api/my/collection-look', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bundleId: addTarget, generationId, firebaseUid: user.id }),
          })
        )
      );
      await fetchCollections(user.id);
      setAddTarget(null);
      setPickerSelected(new Set());
    } catch {
      alert('追加に失敗しました');
    } finally {
      setAddingBulk(false);
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

        {/* Profile section */}
        {user && (
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <label className="cursor-pointer flex-shrink-0" style={{ position: 'relative' }}>
              <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarPick} />
              {avatarPreview || profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview || profile.avatarUrl}
                  alt="avatar"
                  className="rounded-full object-cover"
                  style={{ width: 52, height: 52 }}
                />
              ) : (
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ width: 52, height: 52, background: 'var(--vault-border)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ color: 'var(--vault-text-dim)' }}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
              )}
              {/* Camera overlay */}
              <div
                className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.4)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </label>

            {/* Name + save */}
            {showProfileEditor ? (
              <div className="flex-1 flex gap-2 items-center min-w-0">
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="ニックネーム"
                  className="flex-1 text-[12px] py-1.5 bg-transparent border-b outline-none min-w-0"
                  style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
                  autoFocus
                />
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="text-[10px] tracking-[2px] px-3 py-1.5 transition-opacity hover:opacity-70 disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
                >
                  {profileSaved ? '✓' : savingProfile ? '...' : 'SAVE'}
                </button>
                <button
                  onClick={() => { setShowProfileEditor(false); setEditDisplayName(profile.displayName); setAvatarPreview(profile.avatarUrl); setAvatarDataUrl(''); }}
                  className="text-[10px] flex-shrink-0 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--vault-text-dim)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-3 min-w-0">
                <span className="text-[12px] truncate" style={{ color: 'var(--vault-text)' }}>
                  {profile.displayName || <span style={{ color: 'var(--vault-text-dim)', fontStyle: 'italic' }}>ニックネーム未設定</span>}
                </span>
                <button
                  onClick={() => setShowProfileEditor(true)}
                  className="text-[9px] tracking-[2px] flex-shrink-0 transition-opacity hover:opacity-60"
                  style={{ color: 'var(--vault-text-dim)' }}
                >
                  EDIT
                </button>
              </div>
            )}
          </div>
        )}

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
                    onClick={() => { setAddTarget(col.id); setPickerSelected(new Set()); }}
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
                      cursor: 'pointer',
                    }}
                    onClick={() => selectable ? toggleSelect(look) : openDetail(look)}
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

      {/* Look detail modal */}
      {detailLook && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDetailLook(null); }}
        >
          <div
            className="w-full sm:max-w-sm mx-auto flex flex-col overflow-y-auto"
            style={{ background: 'var(--vault-bg)', maxHeight: '92dvh', fontFamily: MONO }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--vault-border)' }}
            >
              <span className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
                {formatDate(detailLook.created_at)}
              </span>
              <button onClick={() => setDetailLook(null)} style={{ color: 'var(--vault-text-dim)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-5 px-5 py-5 overflow-y-auto">
              {/* Look image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detailLook.image_url}
                alt="look"
                className="w-full object-cover"
                style={{ aspectRatio: (detailLook.recipe?.aspectRatio || '3:4').replace(':', '/') }}
              />

              {/* DL + DEL */}
              <div className="flex gap-[2px]">
                <button
                  onClick={() => handleDownload(detailLook)}
                  className="flex-1 py-3 text-[11px] tracking-widest hover:opacity-70"
                  style={{ background: 'var(--vault-border)', color: 'var(--vault-text-dim)' }}
                >
                  DOWNLOAD
                </button>
                <button
                  onClick={async () => {
                    await handleDelete(detailLook);
                    setDetailLook(null);
                  }}
                  disabled={deleting === detailLook.id}
                  className="flex-1 py-3 text-[11px] tracking-widest hover:opacity-70 disabled:opacity-40"
                  style={{ background: 'rgba(160,0,0,0.12)', color: 'rgba(160,0,0,0.7)' }}
                >
                  {deleting === detailLook.id ? '...' : 'DELETE'}
                </button>
              </div>

              {/* Garment editor — only for own creations (recipe exists) */}
              {detailLook.recipe?.garmentUrls?.length ? (
                <div className="space-y-4">
                  <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
                    GARMENTS — 購入リンク設定
                  </p>
                  {detailLook.recipe.garmentUrls.map((url, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`garment ${i + 1}`}
                        className="object-cover flex-shrink-0"
                        style={{ width: 48, height: 64 }}
                      />
                      <div className="flex-1 space-y-2 min-w-0">
                        <input
                          type="text"
                          value={editNames[i] ?? ''}
                          onChange={(e) => setEditNames((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder={`アイテム名 ${i + 1}`}
                          className="w-full text-[11px] py-1.5 bg-transparent border-b outline-none placeholder:opacity-30"
                          style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
                        />
                        <input
                          type="url"
                          value={editLinks[i] ?? ''}
                          onChange={(e) => setEditLinks((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder="https://..."
                          className="w-full text-[10px] py-1.5 bg-transparent border-b outline-none placeholder:opacity-30"
                          style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text-dim)', fontFamily: MONO }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleSaveGarments}
                    disabled={savingGarments}
                    className="w-full py-3 text-[11px] tracking-widest hover:opacity-80 disabled:opacity-40 transition-opacity"
                    style={{
                      background: garmentSaved ? 'var(--vault-border)' : 'var(--vault-text)',
                      color: garmentSaved ? 'var(--vault-text-dim)' : 'var(--vault-bg)',
                    }}
                  >
                    {garmentSaved ? 'SAVED ✓' : savingGarments ? '...' : 'SAVE'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Add-to-collection picker */}
      {addTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setAddTarget(null); setPickerSelected(new Set()); } }}
        >
          <div
            className="w-full sm:max-w-sm mx-auto flex flex-col"
            style={{ background: 'var(--vault-bg)', maxHeight: '80dvh', fontFamily: MONO }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--vault-border)' }}
            >
              <span className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
                {pickerSelected.size > 0 ? `${pickerSelected.size}枚選択中` : 'ルックを選択'}
              </span>
              <button onClick={() => { setAddTarget(null); setPickerSelected(new Set()); }} style={{ color: 'var(--vault-text-dim)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Grid */}
            <div className="overflow-y-auto px-5 py-4 flex-1">
              {looks.filter((l) => !!l.recipe).length === 0 ? (
                <p className="text-[11px] text-center py-8" style={{ color: 'var(--vault-text-dim)' }}>
                  追加できるルックがありません
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-[2px]">
                  {looks.filter((l) => !!l.recipe).map((look) => {
                    const isChosen = pickerSelected.has(look.id);
                    return (
                      <div
                        key={look.id}
                        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                        style={{ background: 'var(--vault-border)' }}
                        onClick={() => setPickerSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(look.id)) next.delete(look.id); else next.add(look.id);
                          return next;
                        })}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={look.image_url} alt="" className="w-full h-full object-cover" />
                        {isChosen && (
                          <>
                            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #fff' }} />
                            <div
                              className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full"
                              style={{ width: 20, height: 20, background: '#fff' }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                                <path d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm button */}
            <div className="flex-shrink-0 px-5 py-4" style={{ borderTop: '1px solid var(--vault-border)' }}>
              <button
                onClick={handleAddBulk}
                disabled={pickerSelected.size === 0 || addingBulk}
                className="w-full py-3 text-[11px] tracking-widest transition-opacity hover:opacity-80 disabled:opacity-30"
                style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
              >
                {addingBulk ? '追加中...' : pickerSelected.size > 0 ? `${pickerSelected.size}枚を追加` : '選択してください'}
              </button>
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
