'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';
import { ThemeToggle } from '@/components/daily/ThemeToggle';
import { WardrobeUserBadge } from '@/components/wardrobe/UserBadge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Variant = 'A' | 'B';

interface LookResult {
  variant: Variant;
  image: string | null;
  loading: boolean;
  saved: boolean;
  error: string | null;
}

interface ModelSettings {
  gender: 'female' | 'male';
  height: number;
  ethnicity: string;
}

const BACKGROUNDS = [
  { value: 'studioWhite', label: 'スタジオ (白)' },
  { value: 'studioGray', label: 'スタジオ (グレー)' },
  { value: 'outdoorUrban', label: 'アーバン / 街' },
  { value: 'outdoorNature', label: 'ナチュラル / 自然' },
  { value: 'cafeIndoor', label: 'カフェ / インドア' },
  { value: 'beachResort', label: 'ビーチ / リゾート' },
];

const ETHNICITIES = [
  { value: 'japanese', label: 'アジア系' },
  { value: 'western-european', label: '西欧系' },
  { value: 'eastern-european', label: '東欧系' },
  { value: 'african', label: 'アフリカ系' },
  { value: 'latin', label: 'ラテン系' },
  { value: 'southeast-asian', label: '東南アジア系' },
];

const GARMENT_SLOTS = ['トップス', 'ボトムス', 'シューズ / バッグ'] as const;

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

export default function QuickGeneratePage() {
  const [garmentImages, setGarmentImages] = useState<(string | null)[]>([null, null, null]);
  const [background, setBackground] = useState('studioWhite');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({ gender: 'female', height: 170, ethnicity: 'japanese' });
  const [looks, setLooks] = useState<LookResult[]>([
    { variant: 'A', image: null, loading: false, saved: false, error: null },
    { variant: 'B', image: null, loading: false, saved: false, error: null },
  ]);
  const [generating, setGenerating] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ja';

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !user) {
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
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = useCallback((slot: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setGarmentImages((prev) => { const next = [...prev]; next[slot] = result; return next; });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((slot: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleUpload(slot, file);
  }, [handleUpload]);

  const clearSlot = (slot: number) => {
    setGarmentImages((prev) => { const next = [...prev]; next[slot] = null; return next; });
    if (fileRefs.current[slot]) fileRefs.current[slot]!.value = '';
  };

  const activeImages = garmentImages.filter(Boolean) as string[];
  const canGen = activeImages.length > 0 && canGenerate() && !generating;

  const handleGenerate = async () => {
    if (!canGen) return;
    setGenerating(true);
    setLooks([
      { variant: 'A', image: null, loading: true, saved: false, error: null },
      { variant: 'B', image: null, loading: true, saved: false, error: null },
    ]);
    const requestBase = { garmentImages: activeImages, background, modelSettings, firebaseUid: user?.id ?? null };
    const fetchVariant = async (variant: Variant): Promise<LookResult> => {
      try {
        const res = await fetch('/api/my/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBase, variant }),
        });
        const data = await res.json();
        if (!res.ok || !data.image) return { variant, image: null, loading: false, saved: false, error: data.error || '生成失敗' };
        return { variant, image: data.image, loading: false, saved: false, error: null };
      } catch {
        return { variant, image: null, loading: false, saved: false, error: 'ネットワークエラー' };
      }
    };
    const [resultA, resultB] = await Promise.all([fetchVariant('A'), fetchVariant('B')]);
    setLooks([resultA, resultB]);
    incrementGeneration();
    incrementGeneration();
    setGenerating(false);
  };

  const handleDownload = (look: LookResult) => {
    if (!look.image) return;
    const a = document.createElement('a');
    a.href = look.image;
    a.download = `look-${look.variant}-${Date.now()}.png`;
    a.click();
  };

  const handleSave = async (look: LookResult, idx: number) => {
    if (!look.image || !user) return;
    setLooks((prev) => prev.map((l, i) => (i === idx ? { ...l, loading: true } : l)));
    try {
      const res = await fetch('/api/my/save-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: look.image, firebaseUid: user.id, variant: look.variant }),
      });
      const data = await res.json();
      setLooks((prev) => prev.map((l, i) =>
        i === idx ? { ...l, loading: false, saved: data.success, error: data.success ? null : '保存失敗' } : l
      ));
    } catch {
      setLooks((prev) => prev.map((l, i) => (i === idx ? { ...l, loading: false, error: 'ネットワークエラー' } : l)));
    }
  };

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{ background: 'var(--vault-bg)', color: 'var(--vault-text)', fontFamily: MONO }}
    >
      {/* Fixed nav */}
      <WardrobeUserBadge />

      <Link
        href={`/${locale}/wardrobe`}
        className="fixed top-5 left-5 z-50 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-60"
        style={{ color: 'var(--vault-text-dim)' }}
      >
        ← GRID
      </Link>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-32 space-y-16">

        {/* Page title */}
        <div className="space-y-1">
          <p className="text-[10px] tracking-[4px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            QUICK GENERATE
          </p>
          <h1 className="text-[13px] font-light" style={{ color: 'var(--vault-text)' }}>
            1コーデ → 2ルック生成
          </h1>
        </div>

        {/* Garment upload */}
        <section className="space-y-4">
          <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            ITEMS
          </p>
          <div className="grid grid-cols-3 gap-[2px]">
            {GARMENT_SLOTS.map((label, i) => (
              <div key={i}>
                <div
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer group"
                  style={{ background: 'var(--vault-border)' }}
                  onClick={() => fileRefs.current[i]?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(i, e)}
                >
                  {garmentImages[i] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={garmentImages[i]!} alt={label} className="w-full h-full object-cover" />
                      <button
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: 'var(--vault-bg)', color: 'var(--vault-text)' }}
                        onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1">
                        <path d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
                        {label.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[i] = el; }}
                    type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(i, e.target.files[0])}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section className="space-y-4">
          <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            MODEL
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {/* Gender */}
            <div className="space-y-2">
              <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>SEX</p>
              <div className="flex" style={{ borderBottom: '1px solid var(--vault-border)' }}>
                {(['female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setModelSettings((s) => ({ ...s, gender: g }))}
                    className="flex-1 py-1.5 text-[10px] tracking-widest transition-opacity"
                    style={{
                      color: modelSettings.gender === g ? 'var(--vault-text)' : 'var(--vault-text-dim)',
                      borderBottom: modelSettings.gender === g ? '1px solid var(--vault-text)' : '1px solid transparent',
                      marginBottom: -1,
                    }}
                  >
                    {g === 'female' ? '女性' : '男性'}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-2">
              <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
                HEIGHT — {modelSettings.height}cm
              </p>
              <input
                type="range" min={155} max={185} step={5}
                value={modelSettings.height}
                onChange={(e) => setModelSettings((s) => ({ ...s, height: parseInt(e.target.value) }))}
                className="w-full mt-3"
                style={{ accentColor: 'var(--vault-text)' }}
              />
            </div>

            {/* Ethnicity */}
            <div className="space-y-2">
              <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>MODEL</p>
              <select
                value={modelSettings.ethnicity}
                onChange={(e) => setModelSettings((s) => ({ ...s, ethnicity: e.target.value }))}
                className="w-full text-[10px] py-1.5 bg-transparent border-b outline-none"
                style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
              >
                {ETHNICITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>

            {/* Background */}
            <div className="space-y-2">
              <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>BG</p>
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full text-[10px] py-1.5 bg-transparent border-b outline-none"
                style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
              >
                {BACKGROUNDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Generate */}
        <section className="space-y-3">
          {activeImages.length === 0 && (
            <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              ※ アイテムを1枚以上追加してください
            </p>
          )}
          {!canGenerate() && activeImages.length > 0 && (
            <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-cyan)' }}>
              クレジットが不足しています
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGen}
            className="w-full py-5 text-[11px] tracking-[4px] font-light transition-opacity disabled:opacity-20"
            style={{
              background: 'var(--vault-text)',
              color: 'var(--vault-bg)',
            }}
          >
            {generating ? 'GENERATING...' : 'GENERATE — 2 CREDITS'}
          </button>
        </section>

        {/* Results */}
        {looks.some((l) => l.loading || l.image || l.error) && (
          <section className="space-y-4">
            <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
              RESULTS
            </p>
            <div className="grid grid-cols-2 gap-[2px]">
              {looks.map((look, idx) => (
                <div key={look.variant}>
                  <div className="aspect-[3/4] relative overflow-hidden" style={{ background: 'var(--vault-border)' }}>
                    {look.loading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="w-5 h-5 rounded-full border border-t-transparent animate-spin"
                          style={{ borderColor: 'var(--vault-text-dim)', borderTopColor: 'transparent' }}
                        />
                      </div>
                    )}
                    {look.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={look.image} alt={`Look ${look.variant}`} className="w-full h-full object-cover" />
                    )}
                    {look.error && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-[10px] text-center" style={{ color: 'var(--vault-text-dim)' }}>{look.error}</p>
                      </div>
                    )}

                    {/* Overlay actions */}
                    {look.image && (
                      <div
                        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-end gap-[2px] p-2"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }}
                      >
                        <button
                          onClick={() => handleDownload(look)}
                          className="flex-1 py-2 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-70"
                          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                        >
                          DL
                        </button>
                        {user ? (
                          <button
                            onClick={() => handleSave(look, idx)}
                            disabled={look.saved || look.loading}
                            className="flex-1 py-2 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-70 disabled:opacity-40"
                            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                          >
                            {look.saved ? 'SAVED' : look.loading ? '...' : 'SAVE'}
                          </button>
                        ) : (
                          <button
                            onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
                            className="flex-1 py-2 text-[9px] tracking-[2px] text-white transition-opacity hover:opacity-70"
                            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
                          >
                            LOGIN
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[9px] tracking-[2px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>
                    LOOK {look.variant}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
