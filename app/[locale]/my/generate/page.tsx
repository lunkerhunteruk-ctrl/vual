'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';
import { ThemeToggle } from '@/components/daily/ThemeToggle';
import { WardrobeUserBadge } from '@/components/wardrobe/UserBadge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Mode = 'quick' | 'standard' | 'full';
type Variant = 'A' | 'B';

// [outfitIdx][itemIdx][imageIdx] — null = empty slot
type AllOutfits = (string | null)[][][];

interface LookResult {
  outfitIdx: number;
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

const MODES: { value: Mode; label: string; outfits: number; looks: number; credits: number }[] = [
  { value: 'quick',    label: 'QUICK',    outfits: 1, looks: 2,  credits: 2  },
  { value: 'standard', label: 'STANDARD', outfits: 3, looks: 6,  credits: 6  },
  { value: 'full',     label: 'FULL',     outfits: 6, looks: 12, credits: 12 },
];

const BACKGROUNDS = [
  { value: 'studioWhite',   label: 'スタジオ (白)'     },
  { value: 'studioGray',    label: 'スタジオ (グレー)' },
  { value: 'outdoorUrban',  label: 'アーバン / 街'      },
  { value: 'outdoorNature', label: 'ナチュラル / 自然'  },
  { value: 'cafeIndoor',    label: 'カフェ / インドア'  },
  { value: 'beachResort',   label: 'ビーチ / リゾート'  },
];

const ETHNICITIES = [
  { value: 'japanese',         label: 'アジア系'     },
  { value: 'western-european', label: '西欧系'       },
  { value: 'eastern-european', label: '東欧系'       },
  { value: 'african',          label: 'アフリカ系'   },
  { value: 'latin',            label: 'ラテン系'     },
  { value: 'southeast-asian',  label: '東南アジア系' },
];

const MAX_ITEMS  = 6;
const MAX_IMAGES = 3; // per item
const MAX_TOTAL  = 14; // per outfit (Gemini limit)
const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

function buildOutfit(itemCount = 1): (string | null)[][] {
  return Array.from({ length: itemCount }, () => [null, null, null]);
}

function buildInitialOutfits(outfitCount: number): AllOutfits {
  return Array.from({ length: outfitCount }, () => buildOutfit(1));
}

function countImages(outfit: (string | null)[][]): number {
  return outfit.flat().filter(Boolean).length;
}

// ── ItemCard ──────────────────────────────────────────────────────────────────
function ItemCard({
  images,
  itemIdx,
  totalImages,
  onAdd,
  onRemove,
  onRemoveItem,
}: {
  images: (string | null)[];
  itemIdx: number;
  totalImages: number;
  onAdd: (slot: number, file: File) => void;
  onRemove: (slot: number) => void;
  onRemoveItem: () => void;
}) {
  const pickFile = (slot: number) => {
    if (totalImages >= MAX_TOTAL && !images[slot]) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onAdd(slot, file);
    };
    input.click();
  };

  const handleDrop = (slot: number, e: React.DragEvent) => {
    e.preventDefault();
    if (totalImages >= MAX_TOTAL && !images[slot]) return;
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onAdd(slot, file);
  };

  const mainImg = images[0];
  const det1    = images[1];
  const det2    = images[2];

  return (
    <div className="flex-shrink-0 relative" style={{ width: 120 }}>
      {/* Remove item button */}
      {itemIdx > 0 && (
        <button
          onClick={onRemoveItem}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 flex items-center justify-center rounded-full"
          style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
        >
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      <p className="text-[8px] tracking-[2px] mb-1" style={{ color: 'var(--vault-text-dim)' }}>
        ITEM {itemIdx + 1}
      </p>

      {/* Main image slot */}
      <div
        className="relative overflow-hidden cursor-pointer group"
        style={{ width: 120, height: 160, background: 'var(--vault-border)' }}
        onClick={() => pickFile(0)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(0, e)}
      >
        {mainImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainImg} alt="" className="w-full h-full object-cover" />
            <button
              className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'var(--vault-bg)' }}
              onClick={(e) => { e.stopPropagation(); onRemove(0); }}
            >
              <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.5">
              <path d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-[7px] tracking-[1px]" style={{ color: 'var(--vault-text-dim)' }}>MAIN</span>
          </div>
        )}
      </div>

      {/* Detail slots row */}
      <div className="flex gap-[2px] mt-[2px]">
        {[1, 2].map((slot) => {
          const img = images[slot];
          const canAdd = totalImages < MAX_TOTAL || !!img;
          return (
            <div
              key={slot}
              className="relative overflow-hidden cursor-pointer group"
              style={{ width: 59, height: 59, background: 'var(--vault-border)', opacity: canAdd ? 1 : 0.4 }}
              onClick={() => canAdd && pickFile(slot)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => canAdd && handleDrop(slot, e)}
            >
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--vault-bg)' }}
                    onClick={(e) => { e.stopPropagation(); onRemove(slot); }}
                  >
                    <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.5">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[6px] tracking-[1px]" style={{ color: 'var(--vault-text-dim)' }}>
                    {slot === 1 ? 'DET 1' : 'DET 2'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Slot 1=det1 only needed above — det1 det2 already rendered above */}
      <p className="text-[7px] tracking-[1px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>
        {images.filter(Boolean).length}/{MAX_IMAGES}枚
      </p>
    </div>
  );
}

// ── OutfitRow ─────────────────────────────────────────────────────────────────
function OutfitRow({
  outfit,
  outfitIdx,
  showLabel,
  onUpdate,
}: {
  outfit: (string | null)[][];
  outfitIdx: number;
  showLabel: boolean;
  onUpdate: (updated: (string | null)[][]) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalImages = countImages(outfit);

  const updateItem = useCallback((itemIdx: number, imageIdx: number, value: string | null) => {
    const next = outfit.map((item) => [...item]);
    next[itemIdx][imageIdx] = value;
    onUpdate(next);
  }, [outfit, onUpdate]);

  const addItem = () => {
    if (outfit.length >= MAX_ITEMS) return;
    const next = [...outfit, [null, null, null]];
    onUpdate(next);
    setTimeout(() => scrollRef.current?.scrollTo({ left: 9999, behavior: 'smooth' }), 50);
  };

  const removeItem = (itemIdx: number) => {
    if (outfit.length <= 1) return;
    onUpdate(outfit.filter((_, i) => i !== itemIdx));
  };

  const handleAdd = (itemIdx: number, slot: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => updateItem(itemIdx, slot, e.target?.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <p className="text-[9px] tracking-[3px]" style={{ color: 'var(--vault-text-dim)' }}>
          OUTFIT {outfitIdx + 1}
          <span className="ml-3" style={{ color: totalImages >= MAX_TOTAL ? 'var(--vault-cyan)' : 'var(--vault-text-dim)' }}>
            {totalImages}/{MAX_TOTAL}
          </span>
        </p>
      )}

      <div
        ref={scrollRef}
        className="flex gap-[6px] overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {outfit.map((item, itemIdx) => (
          <ItemCard
            key={itemIdx}
            images={item}
            itemIdx={itemIdx}
            totalImages={totalImages}
            onAdd={(slot, file) => handleAdd(itemIdx, slot, file)}
            onRemove={(slot) => updateItem(itemIdx, slot, null)}
            onRemoveItem={() => removeItem(itemIdx)}
          />
        ))}

        {/* Add Item button */}
        {outfit.length < MAX_ITEMS && (
          <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 48 }}>
            <button
              onClick={addItem}
              className="w-10 h-10 flex items-center justify-center transition-opacity hover:opacity-60"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const [mode, setMode] = useState<Mode>('quick');
  const [outfits, setOutfits] = useState<AllOutfits>(buildInitialOutfits(1));
  const [background, setBackground] = useState('studioWhite');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({ gender: 'female', height: 170, ethnicity: 'japanese' });
  const [looks, setLooks] = useState<LookResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ja';

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);

  const modeConfig = MODES.find((m) => m.value === mode)!;

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

  const handleModeChange = (newMode: Mode) => {
    const cfg = MODES.find((m) => m.value === newMode)!;
    setMode(newMode);
    setOutfits(buildInitialOutfits(cfg.outfits));
    setLooks([]);
  };

  const updateOutfit = useCallback((outfitIdx: number, updated: (string | null)[][]) => {
    setOutfits((prev) => prev.map((o, i) => (i === outfitIdx ? updated : o)));
  }, []);

  const hasAnyImage = outfits.some((o) => o.some((item) => item.some(Boolean)));
  const canGen = hasAnyImage && canGenerate() && !generating;

  const handleGenerate = async () => {
    if (!canGen) return;
    setGenerating(true);

    const tasks: { outfitIdx: number; variant: Variant; garmentImages: string[] }[] = [];
    outfits.forEach((outfit, idx) => {
      const images = outfit.flat().filter(Boolean) as string[];
      if (images.length === 0) return;
      tasks.push({ outfitIdx: idx, variant: 'A', garmentImages: images });
      tasks.push({ outfitIdx: idx, variant: 'B', garmentImages: images });
    });

    setLooks(tasks.map((t) => ({
      outfitIdx: t.outfitIdx, variant: t.variant,
      image: null, loading: true, saved: false, error: null,
    })));

    const results = await Promise.all(
      tasks.map(async (task) => {
        try {
          const res = await fetch('/api/my/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              garmentImages: task.garmentImages,
              background,
              modelSettings,
              firebaseUid: user?.id ?? null,
              variant: task.variant,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.image) {
            return { ...task, image: null, loading: false, saved: false, error: data.error || '生成失敗' };
          }
          return { ...task, image: data.image, loading: false, saved: false, error: null };
        } catch {
          return { ...task, image: null, loading: false, saved: false, error: 'ネットワークエラー' };
        }
      })
    );

    setLooks(results);
    results.forEach(() => incrementGeneration());
    setGenerating(false);
  };

  const handleDownload = (look: LookResult) => {
    if (!look.image) return;
    const a = document.createElement('a');
    a.href = look.image;
    a.download = `look-${look.outfitIdx + 1}${look.variant}-${Date.now()}.png`;
    a.click();
  };

  const handleSave = async (look: LookResult, taskIdx: number) => {
    if (!look.image || !user) return;
    setLooks((prev) => prev.map((l, i) => (i === taskIdx ? { ...l, loading: true } : l)));
    try {
      const res = await fetch('/api/my/save-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: look.image, firebaseUid: user.id, variant: look.variant }),
      });
      const data = await res.json();
      setLooks((prev) => prev.map((l, i) =>
        i === taskIdx ? { ...l, loading: false, saved: data.success, error: data.success ? null : '保存失敗' } : l
      ));
    } catch {
      setLooks((prev) => prev.map((l, i) =>
        i === taskIdx ? { ...l, loading: false, error: 'ネットワークエラー' } : l
      ));
    }
  };

  const handleSaveAll = async () => {
    if (!user) return;
    const unsaved = looks.filter((l) => l.image && !l.saved);
    await Promise.all(unsaved.map((look) => handleSave(look, looks.indexOf(look))));
  };

  const handlePublishAll = async () => {
    if (!user) return;
    setPublishingAll(true);
    await handleSaveAll();
    // TODO Step 4: set is_public = true
    setPublishingAll(false);
  };

  const looksByOutfit = outfits.map((_, idx) => looks.filter((l) => l.outfitIdx === idx));
  const hasResults = looks.some((l) => l.loading || l.image || l.error);
  const allSaved = looks.filter((l) => l.image).every((l) => l.saved);

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{ background: 'var(--vault-bg)', color: 'var(--vault-text)', fontFamily: MONO }}
    >
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

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-32 space-y-16">

        {/* Mode selector */}
        <section className="space-y-4">
          <p className="text-[10px] tracking-[4px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            MODE
          </p>
          <div className="flex gap-[2px]">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleModeChange(m.value)}
                className="flex-1 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70"
                style={{
                  background: mode === m.value ? 'var(--vault-text)' : 'var(--vault-border)',
                  color: mode === m.value ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[9px] tracking-[2px]" style={{ color: 'var(--vault-text-dim)' }}>
            {modeConfig.outfits} コーデ → {modeConfig.looks} ルック生成 — {modeConfig.credits} クレジット
          </p>
        </section>

        {/* Outfit rows */}
        <section className="space-y-10">
          <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            OUTFITS
            <span className="ml-3 text-[8px]" style={{ color: 'var(--vault-text-dim)' }}>
              各アイテム最大3枚・最大{MAX_ITEMS}アイテム・合計{MAX_TOTAL}枚
            </span>
          </p>

          {outfits.map((outfit, outfitIdx) => (
            <OutfitRow
              key={outfitIdx}
              outfit={outfit}
              outfitIdx={outfitIdx}
              showLabel={modeConfig.outfits > 1}
              onUpdate={(updated) => updateOutfit(outfitIdx, updated)}
            />
          ))}
        </section>

        {/* Model settings */}
        <section className="space-y-4">
          <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
            MODEL
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
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
          {!hasAnyImage && (
            <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
              ※ アイテムを1枚以上追加してください
            </p>
          )}
          {!canGenerate() && hasAnyImage && (
            <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-cyan)' }}>
              クレジットが不足しています
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGen}
            className="w-full py-5 text-[11px] tracking-[4px] font-light transition-opacity disabled:opacity-20"
            style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
          >
            {generating ? 'GENERATING...' : `GENERATE — ${modeConfig.credits} CREDITS`}
          </button>
        </section>

        {/* Results */}
        {hasResults && (
          <section className="space-y-10">
            <p className="text-[10px] tracking-[3px] font-light" style={{ color: 'var(--vault-text-dim)' }}>
              RESULTS
            </p>

            {looksByOutfit.map((outfitLooks, outfitIdx) => {
              if (outfitLooks.length === 0) return null;
              return (
                <div key={outfitIdx} className="space-y-2">
                  {modeConfig.outfits > 1 && (
                    <p className="text-[9px] tracking-[3px]" style={{ color: 'var(--vault-text-dim)' }}>
                      OUTFIT {outfitIdx + 1}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-[2px]">
                    {outfitLooks.map((look) => {
                      const taskIdx = looks.indexOf(look);
                      return (
                        <div key={`${outfitIdx}-${look.variant}`}>
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
                              <img src={look.image} alt={`Look ${outfitIdx + 1}${look.variant}`} className="w-full h-full object-cover" />
                            )}
                            {look.error && (
                              <div className="absolute inset-0 flex items-center justify-center p-4">
                                <p className="text-[10px] text-center" style={{ color: 'var(--vault-text-dim)' }}>{look.error}</p>
                              </div>
                            )}
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
                                    onClick={() => handleSave(look, taskIdx)}
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
                            LOOK {outfitIdx + 1}{look.variant}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {mode !== 'quick' && user && !generating && looks.some((l) => l.image) && (
              <div className="flex gap-[2px] pt-4">
                <button
                  onClick={handleSaveAll}
                  disabled={allSaved}
                  className="flex-1 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)' }}
                >
                  {allSaved ? 'ALL SAVED' : 'SAVE ALL'}
                </button>
                <button
                  onClick={handlePublishAll}
                  disabled={publishingAll}
                  className="flex-1 py-3 text-[10px] tracking-[3px] font-light transition-opacity hover:opacity-70 disabled:opacity-30"
                  style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
                >
                  {publishingAll ? 'PUBLISHING...' : 'PUBLISH TO GRID'}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
