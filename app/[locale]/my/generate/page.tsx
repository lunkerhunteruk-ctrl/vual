'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';

// ─── Types ───────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────
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

const GARMENT_SLOTS = ['トップス', 'ボトムス / スカート', 'シューズ / バッグ'] as const;

// ─── Component ───────────────────────────────────────────────
export default function QuickGeneratePage() {
  const [garmentImages, setGarmentImages] = useState<(string | null)[]>([null, null, null]);
  const [background, setBackground] = useState('studioWhite');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({
    gender: 'female',
    height: 170,
    ethnicity: 'japanese',
  });
  const [looks, setLooks] = useState<LookResult[]>([
    { variant: 'A', image: null, loading: false, saved: false, error: null },
    { variant: 'B', image: null, loading: false, saved: false, error: null },
  ]);
  const [generating, setGenerating] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);
  const freeRemaining = useVaultStore((s) => s.freeRemaining);
  const totalRemaining = useVaultStore((s) => s.totalRemaining);

  // Sync Firebase auth → Zustand
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !user) {
        const credits = await fetchCreditsFromSupabase(firebaseUser.uid);
        const vaultUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || undefined,
          paidCredits: credits?.paidCredits ?? 0,
          freeUsed: credits?.freeUsed ?? 0,
          points: 0,
          createdAt: new Date(),
        };
        setUser(vaultUser);
        if (credits) syncFromFirestore(credits.paidCredits, credits.freeUsed, credits.freeResetDate);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = useCallback((slot: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setGarmentImages((prev) => {
        const next = [...prev];
        next[slot] = result;
        return next;
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (slot: number, e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) handleUpload(slot, file);
    },
    [handleUpload]
  );

  const clearSlot = (slot: number) => {
    setGarmentImages((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
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

    const requestBase = {
      garmentImages: activeImages,
      background,
      modelSettings,
      firebaseUid: user?.id ?? null,
    };

    const fetchVariant = async (variant: Variant): Promise<LookResult> => {
      try {
        const res = await fetch('/api/my/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...requestBase, variant }),
        });
        const data = await res.json();
        if (!res.ok || !data.image) {
          return { variant, image: null, loading: false, saved: false, error: data.error || '生成失敗' };
        }
        return { variant, image: data.image, loading: false, saved: false, error: null };
      } catch {
        return { variant, image: null, loading: false, saved: false, error: 'ネットワークエラー' };
      }
    };

    const [resultA, resultB] = await Promise.all([fetchVariant('A'), fetchVariant('B')]);
    setLooks([resultA, resultB]);

    // Consume credits from Zustand (2 credits = A + B)
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
    setLooks((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, loading: true } : l))
    );
    try {
      const res = await fetch('/api/my/save-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: look.image,
          firebaseUid: user.id,
          variant: look.variant,
        }),
      });
      const data = await res.json();
      setLooks((prev) =>
        prev.map((l, i) =>
          i === idx
            ? { ...l, loading: false, saved: data.success, error: data.success ? null : '保存失敗' }
            : l
        )
      );
    } catch {
      setLooks((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, loading: false, error: 'ネットワークエラー' } : l))
      );
    }
  };

  const creditLabel = user
    ? `無料 ${freeRemaining()} / 合計 ${totalRemaining()} クレジット`
    : `ゲスト: 残 ${freeRemaining()} 回`;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-medium tracking-widest uppercase text-zinc-400">Quick Generate</h1>
          <p className="text-xs text-zinc-600 mt-0.5">1コーデ → 2ルック生成</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500">{creditLabel}</span>
          {!user && (
            <button
              onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
              className="text-xs px-3 py-1.5 border border-zinc-700 rounded-sm text-zinc-300 hover:border-zinc-400 transition-colors"
            >
              ログイン
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Garment upload */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-zinc-500 mb-4">アイテムをアップロード</h2>
          <div className="grid grid-cols-3 gap-4">
            {GARMENT_SLOTS.map((label, i) => (
              <div key={i} className="space-y-2">
                <label className="text-xs text-zinc-600">{label}</label>
                <div
                  className="relative aspect-[3/4] border border-dashed border-zinc-700 rounded-sm overflow-hidden cursor-pointer hover:border-zinc-500 transition-colors group"
                  onClick={() => fileRefs.current[i]?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(i, e)}
                >
                  {garmentImages[i] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={garmentImages[i]!}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                      <button
                        className="absolute top-1 right-1 bg-black/60 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                      <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-zinc-700">追加</span>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[i] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleUpload(i, e.target.files[0])}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Settings */}
        <section>
          <h2 className="text-xs tracking-widest uppercase text-zinc-500 mb-4">設定</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Gender */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-600">性別</label>
              <div className="flex rounded-sm border border-zinc-800 overflow-hidden">
                {(['female', 'male'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setModelSettings((s) => ({ ...s, gender: g }))}
                    className={`flex-1 text-xs py-2 transition-colors ${
                      modelSettings.gender === g
                        ? 'bg-zinc-700 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {g === 'female' ? '女性' : '男性'}
                  </button>
                ))}
              </div>
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-600">身長 {modelSettings.height}cm</label>
              <input
                type="range"
                min={155}
                max={185}
                step={5}
                value={modelSettings.height}
                onChange={(e) => setModelSettings((s) => ({ ...s, height: parseInt(e.target.value) }))}
                className="w-full accent-white"
              />
            </div>

            {/* Ethnicity */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-600">モデル</label>
              <select
                value={modelSettings.ethnicity}
                onChange={(e) => setModelSettings((s) => ({ ...s, ethnicity: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-300 py-2 px-2"
              >
                {ETHNICITIES.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* Background */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-600">背景</label>
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-sm text-xs text-zinc-300 py-2 px-2"
              >
                {BACKGROUNDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Generate button */}
        <section>
          {activeImages.length === 0 && (
            <p className="text-xs text-zinc-600 mb-3">※ アイテムを1枚以上アップロードしてください</p>
          )}
          {!canGenerate() && activeImages.length > 0 && (
            <p className="text-xs text-amber-600 mb-3">クレジットが不足しています</p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGen}
            className="w-full py-4 text-sm tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-white text-black hover:bg-zinc-100 rounded-sm font-medium"
          >
            {generating ? '生成中...' : '生成する — 2クレジット'}
          </button>
        </section>

        {/* Results */}
        {(looks.some((l) => l.loading || l.image || l.error)) && (
          <section>
            <h2 className="text-xs tracking-widest uppercase text-zinc-500 mb-4">生成結果</h2>
            <div className="grid grid-cols-2 gap-4">
              {looks.map((look, idx) => (
                <div key={look.variant} className="space-y-3">
                  <div className="text-xs text-zinc-600 tracking-widest">Look {look.variant}</div>
                  <div className="aspect-[3/4] bg-zinc-900 rounded-sm overflow-hidden relative">
                    {look.loading && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 border border-zinc-600 border-t-white rounded-full animate-spin" />
                      </div>
                    )}
                    {look.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={look.image} alt={`Look ${look.variant}`} className="w-full h-full object-cover" />
                    )}
                    {look.error && (
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <p className="text-xs text-red-400 text-center">{look.error}</p>
                      </div>
                    )}
                  </div>

                  {look.image && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(look)}
                        className="flex-1 text-xs py-2 border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors rounded-sm"
                      >
                        DL
                      </button>
                      {user ? (
                        <button
                          onClick={() => handleSave(look, idx)}
                          disabled={look.saved || look.loading}
                          className="flex-1 text-xs py-2 border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {look.saved ? '保存済み' : look.loading ? '...' : 'ワードローブに保存'}
                        </button>
                      ) : (
                        <button
                          onClick={() => signInWithGoogle().then((u) => u && setUser(u))}
                          className="flex-1 text-xs py-2 border border-zinc-700 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors rounded-sm"
                        >
                          ログインして保存
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
