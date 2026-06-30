'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle, fetchCreditsFromSupabase } from '@/lib/daily/auth';
import { ThemeToggle } from '@/components/daily/ThemeToggle';
import { WardrobeUserBadge } from '@/components/wardrobe/UserBadge';
import { NavPill } from '@/components/wardrobe/NavPill';
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

interface SceneSettings {
  location: string;
  situation: string;
  filmMode: string; // '' = AI AUTO
}

interface GarmentItem {
  id: string;
  image_url: string;
  category: string;
  detail_urls?: string[];
}

interface GarmentDropData {
  imageUrl: string;
  detailUrls: string[];
  category: string;
}

const FILM_OPTIONS = [
  { value: '',              label: 'AI AUTO'           },
  { value: 'leicaPortra800',label: 'Leica Portra 800'  },
  { value: 'leica',         label: 'Leica Portra 400'  },
  { value: 'contax',        label: 'Contax T3'         },
  { value: 'pentax',        label: 'Pentax 67'         },
  { value: 'nikon',         label: 'Nikon Tri-X (B&W)' },
  { value: 'nikon800',      label: 'Nikon Cinestill 800T' },
  { value: 'superia',       label: 'Nikon Superia 800' },
];

const MODES: { value: Mode; label: string; outfits: number; looks: number; credits: number }[] = [
  { value: 'quick',    label: 'QUICK',    outfits: 1, looks: 2,  credits: 2  },
  { value: 'standard', label: 'STANDARD', outfits: 3, looks: 6,  credits: 6  },
  { value: 'full',     label: 'FULL',     outfits: 6, looks: 12, credits: 12 },
];

const BACKGROUNDS = [
  { value: '',              label: 'LOCATION 優先'      },
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
const MAX_IMAGES = 4; // per item: 1 main + 3 detail
const MAX_TOTAL  = 14; // per outfit (Gemini limit)
const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

const GARMENT_CATEGORIES = [
  { value: 'トップス',     label: 'トップス'     },
  { value: 'アウター',     label: 'アウター'     },
  { value: 'パンツ',       label: 'パンツ'       },
  { value: 'スカート',     label: 'スカート'     },
  { value: 'ワンピース',   label: 'ワンピース'   },
  { value: 'シューズ',     label: 'シューズ'     },
  { value: 'バッグ',       label: 'バッグ'       },
  { value: 'アクセサリー', label: 'アクセサリー' },
  { value: 'その他',       label: 'その他'       },
];

function buildOutfit(itemCount = 1): (string | null)[][] {
  return Array.from({ length: itemCount }, () => [null, null, null, null]);
}

function buildInitialOutfits(outfitCount: number): AllOutfits {
  return Array.from({ length: outfitCount }, () => buildOutfit(1));
}

function countImages(outfit: (string | null)[][]): number {
  return outfit.flat().filter(Boolean).length;
}

const CARD_W  = 280;  // item card width
const MAIN_H  = 374;  // main slot height (≈3:4 ratio)
const DET_H   = 96;   // detail slot height

// ── ItemCard ──────────────────────────────────────────────────────────────────
function ItemCard({
  images,
  itemIdx,
  totalImages,
  category,
  onAdd,
  onRemove,
  onRemoveItem,
  onCategoryChange,
  onGarmentDrop,
}: {
  images: (string | null)[];
  itemIdx: number;
  totalImages: number;
  category: string;
  onAdd: (slot: number, file: File) => void;
  onRemove: (slot: number) => void;
  onRemoveItem: () => void;
  onCategoryChange: (cat: string) => void;
  onGarmentDrop?: (data: GarmentDropData) => void;
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
    // Garment drop from MY ITEMS picker (main slot only)
    if (slot === 0 && _draggedGarment) {
      onGarmentDrop?.(_draggedGarment);
      _draggedGarment = null;
      return;
    }
    if (totalImages >= MAX_TOTAL && !images[slot]) return;
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) onAdd(slot, file);
  };

  const mainImg = images[0];

  return (
    <div className="flex-shrink-0 relative" style={{ width: CARD_W }}>
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

      <div className="flex items-baseline gap-2 mb-1">
        <p className="text-[11px] flex-shrink-0" style={{ color: 'var(--vault-text-dim)' }}>
          ITEM {itemIdx + 1}
        </p>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="flex-1 text-[10px] bg-transparent outline-none border-b"
          style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text-dim)' }}
        >
          {GARMENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Main image slot */}
      <div
        className="relative overflow-hidden cursor-pointer group"
        style={{ width: CARD_W, height: MAIN_H, background: 'var(--vault-border)' }}
        onClick={() => pickFile(0)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(0, e)}
      >
        {mainImg ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainImg} alt="" className="w-full h-full object-cover" />
            <button
              className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'var(--vault-bg)' }}
              onClick={(e) => { e.stopPropagation(); onRemove(0); }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text)' }}>服の写真をここへ</span>
              <span className="text-[10px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>タップまたはドロップ</span>
            </div>
          </div>
        )}
      </div>

      {/* Detail slots — 3 equal columns */}
      <div className="flex gap-[2px] mt-[2px]">
        {[1, 2, 3].map((slot) => {
          const img = images[slot];
          const canAdd = totalImages < MAX_TOTAL || !!img;
          const label = slot === 1 ? 'DET 1' : slot === 2 ? 'DET 2' : 'DET 3';
          return (
            <div
              key={slot}
              className="relative overflow-hidden cursor-pointer group flex-1"
              style={{ height: DET_H, background: 'var(--vault-border)', opacity: canAdd ? 1 : 0.35 }}
              onClick={() => canAdd && pickFile(slot)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => canAdd && handleDrop(slot, e)}
            >
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.5">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-[9px]" style={{ color: 'var(--vault-text-dim)' }}>
                    {label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] mt-2" style={{ color: 'var(--vault-text-dim)' }}>
        {images.filter(Boolean).length}/{MAX_IMAGES}枚
      </p>
    </div>
  );
}

// Module-level ref for drag — avoids custom MIME type restrictions in browsers
let _draggedGarment: GarmentDropData | null = null;

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function compressImage(file: File, maxPx = 1024, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, maxPx / Math.max(width, height));
      const w = Math.round(width * scale);
      const h = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── OutfitRow ─────────────────────────────────────────────────────────────────
function OutfitRow({
  outfit,
  outfitIdx,
  showLabel,
  categories,
  onUpdate,
  onCategoriesUpdate,
  onGarmentDrop,
}: {
  outfit: (string | null)[][];
  outfitIdx: number;
  showLabel: boolean;
  categories: string[];
  onUpdate: (updated: (string | null)[][]) => void;
  onCategoriesUpdate: (updated: string[]) => void;
  onGarmentDrop?: (outfitIdx: number, itemIdx: number, data: GarmentDropData) => void;
}) {
  const totalImages = countImages(outfit);

  const updateItem = useCallback((itemIdx: number, imageIdx: number, value: string | null) => {
    const next = outfit.map((item) => [...item]);
    next[itemIdx][imageIdx] = value;
    onUpdate(next);
  }, [outfit, onUpdate]);

  const addItem = () => {
    if (outfit.length >= MAX_ITEMS) return;
    onUpdate([...outfit, [null, null, null, null]]);
    onCategoriesUpdate([...categories, 'その他']);
  };

  const removeItem = (itemIdx: number) => {
    if (outfit.length <= 1) return;
    onUpdate(outfit.filter((_, i) => i !== itemIdx));
    onCategoriesUpdate(categories.filter((_, i) => i !== itemIdx));
  };

  const handleAdd = (itemIdx: number, slot: number, file: File) => {
    compressImage(file).then((dataUrl) => updateItem(itemIdx, slot, dataUrl));
  };

  return (
    <div className="space-y-3">
      {showLabel && (
        <p className="text-[12px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
          OUTFIT {outfitIdx + 1}
          <span className="ml-3" style={{ color: totalImages >= MAX_TOTAL ? 'var(--vault-cyan)' : 'var(--vault-text-dim)' }}>
            {totalImages}/{MAX_TOTAL}
          </span>
        </p>
      )}

      {/*
        Outer: clips overflow and enables horizontal scroll.
        Inner: fit-content + mx-auto → centered when narrow, scrolls when wide.
      */}
      <div className="overflow-x-auto pt-3 pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-4 items-start mx-auto" style={{ width: 'fit-content' }}>
          {outfit.map((item, itemIdx) => (
            <ItemCard
              key={itemIdx}
              images={item}
              itemIdx={itemIdx}
              totalImages={totalImages}
              category={categories[itemIdx] ?? 'その他'}
              onAdd={(slot, file) => handleAdd(itemIdx, slot, file)}
              onRemove={(slot) => updateItem(itemIdx, slot, null)}
              onRemoveItem={() => removeItem(itemIdx)}
              onCategoryChange={(cat) => {
                const next = [...categories];
                next[itemIdx] = cat;
                onCategoriesUpdate(next);
              }}
              onGarmentDrop={(data) => onGarmentDrop?.(outfitIdx, itemIdx, data)}
            />
          ))}

          {/* Circle add button — sits at the vertical midpoint of the main slot */}
          {outfit.length < MAX_ITEMS && (
            <div style={{ paddingTop: 22, alignSelf: 'flex-start' }}>
              <button
                onClick={addItem}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-50"
                style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)', marginTop: MAIN_H / 2 - 20 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeneratePage() {
  const [mode, setMode] = useState<Mode>('quick');
  const [outfits, setOutfits] = useState<AllOutfits>(buildInitialOutfits(1));
  const [outfitCategories, setOutfitCategories] = useState<string[][]>([['その他']]);
  const [background, setBackground] = useState('');
  const [modelSettings, setModelSettings] = useState<ModelSettings>({ gender: 'female', height: 170, ethnicity: 'japanese' });
  const [sceneSettings, setSceneSettings] = useState<SceneSettings>({ location: '', situation: '', filmMode: '' });
  const [aspectRatio, setAspectRatio] = useState<'3:4' | '9:16' | '1:1' | '16:9' | '4:3' | '4:5'>('3:4');
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [looks, setLooks] = useState<LookResult[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishingAll, setPublishingAll] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [publishCategory, setPublishCategory] = useState('casual');
  const [publishTitle, setPublishTitle] = useState('');
  const [published, setPublished] = useState(false);
  const [selectedLooks, setSelectedLooks] = useState<Set<string>>(new Set());
  const [wardrobe, setWardrobe] = useState<GarmentItem[]>([]);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeLoaded, setWardrobeLoaded] = useState(false);
  const [wardrobeCat, setWardrobeCat] = useState('');
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'ja';

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const syncFromFirestore = useVaultStore((s) => s.syncFromFirestore);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

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
          earnedCredits: credits?.earnedCredits ?? 0,
          createdAt: new Date(),
        });
        if (credits) syncFromFirestore(credits.paidCredits, credits.freeUsed, credits.freeResetDate, undefined, credits.earnedCredits);
        // Restore saved face image
        if (credits?.faceImageUrl) setFaceImage(credits.faceImageUrl);
      }
    });
    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user?.id && !wardrobeLoaded) {
      fetch(`/api/my/garments?uid=${user.id}`)
        .then((r) => r.json())
        .then((d) => { setWardrobe(d.garments ?? []); setWardrobeLoaded(true); });
    }
  }, [user?.id, wardrobeLoaded]);

  const pickFaceImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        setFaceImage(dataUrl);
        // Persist to R2 + DB if logged in
        if (user?.id) {
          fetch('/api/my/face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: dataUrl, firebaseUid: user.id }),
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const clearFaceImage = () => {
    setFaceImage(null);
    if (user?.id) {
      fetch('/api/my/face', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseUid: user.id }),
      });
    }
  };

  const lookKey = (l: { outfitIdx: number; variant: string }) => `${l.outfitIdx}${l.variant}`;

  const toggleLookSelection = (look: LookResult) => {
    if (!look.image) return;
    setSelectedLooks((prev) => {
      const next = new Set(prev);
      const k = lookKey(look);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleModeChange = (newMode: Mode) => {
    const cfg = MODES.find((m) => m.value === newMode)!;
    setMode(newMode);
    setOutfits(buildInitialOutfits(cfg.outfits));
    setOutfitCategories(Array.from({ length: cfg.outfits }, () => ['その他']));
    setLooks([]);
    setSelectedLooks(new Set());
    setPublished(false);
  };

  const updateOutfit = useCallback((outfitIdx: number, updated: (string | null)[][]) => {
    setOutfits((prev) => prev.map((o, i) => (i === outfitIdx ? updated : o)));
  }, []);

  const updateCategories = useCallback((outfitIdx: number, updated: string[]) => {
    setOutfitCategories((prev) => prev.map((c, i) => (i === outfitIdx ? updated : c)));
  }, []);

  // Drag-drop from MY ITEMS picker onto a specific ITEM slot
  const handleGarmentDrop = useCallback(async (outfitIdx: number, itemIdx: number, data: GarmentDropData) => {
    const allUrls = [data.imageUrl, ...data.detailUrls.slice(0, 3)];
    const converted = await Promise.all(allUrls.map(urlToDataUrl));
    const [main, d1 = null, d2 = null, d3 = null] = converted;
    setOutfits((prev) => {
      const next = prev.map((o) => o.map((item) => [...item]));
      next[outfitIdx][itemIdx] = [main, d1, d2, d3];
      return next;
    });
    setOutfitCategories((prev) => {
      const next = prev.map((c) => [...c]);
      next[outfitIdx][itemIdx] = data.category;
      return next;
    });
  }, []);

  // Tap in MY ITEMS picker → insert into first empty slot
  const insertGarment = useCallback(async (garment: GarmentItem) => {
    let targetOi = -1, targetIi = -1, isNew = false;
    const snap = outfits;
    outer: for (let oi = 0; oi < snap.length; oi++) {
      for (let ii = 0; ii < snap[oi].length; ii++) {
        if (!snap[oi][ii][0]) { targetOi = oi; targetIi = ii; break outer; }
      }
      if (snap[oi].length < MAX_ITEMS) { targetOi = oi; targetIi = snap[oi].length; isNew = true; break; }
    }
    if (targetOi === -1) return;

    const allUrls = [garment.image_url, ...(garment.detail_urls ?? []).slice(0, 3)];
    const converted = await Promise.all(allUrls.map(urlToDataUrl));
    const [main, d1 = null, d2 = null, d3 = null] = converted;

    setOutfits((prev) => {
      const next = prev.map((o) => o.map((item) => [...item]));
      if (isNew) next[targetOi] = [...next[targetOi], [main, d1, d2, d3]];
      else next[targetOi][targetIi] = [main, d1, d2, d3];
      return next;
    });
    setOutfitCategories((prev) => {
      const next = prev.map((c) => [...c]);
      if (isNew) next[targetOi] = [...next[targetOi], garment.category];
      else next[targetOi][targetIi] = garment.category;
      return next;
    });
  }, [outfits]);

  const hasAnyImage = outfits.some((o) => o.some((item) => item.some(Boolean)));
  const canGen = hasAnyImage && canGenerate() && !generating;

  const handleGenerate = async () => {
    if (!canGen) return;
    setGenerating(true);
    setSelectedLooks(new Set());
    setPublished(false);

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

    // Submit all jobs in parallel, then poll each independently
    await Promise.all(
      tasks.map(async (task, taskIdx) => {
        try {
          // 1. Submit
          const res = await fetch('/api/my/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              garmentImages: task.garmentImages,
              faceImage,
              background,
              modelSettings,
              sceneSettings,
              aspectRatio,
              firebaseUid: user?.id ?? null,
              variant: task.variant,
            }),
          });
          const submit = await res.json();
          if (!res.ok || !submit.taskId) {
            setLooks((prev) => prev.map((l, i) => i === taskIdx
              ? { ...l, loading: false, error: submit.error || '生成失敗' } : l));
            return;
          }

          const { taskId, creditId } = submit;

          // 2. Poll until completed (client-side, no serverless timeout)
          const maxAttempts = 60; // 60 × 3s = 3 min max
          for (let i = 0; i < maxAttempts; i++) {
            await new Promise((r) => setTimeout(r, 3000));
            try {
              const params = new URLSearchParams({ taskId });
              if (creditId) params.set('creditId', creditId);
              if (user?.id) params.set('firebaseUid', user.id);
              const pollRes = await fetch(`/api/my/generate/poll?${params}`);
              const poll = await pollRes.json();

              if (poll.status === 'completed' && poll.image) {
                setLooks((prev) => prev.map((l, i) => i === taskIdx
                  ? { ...l, image: poll.image, loading: false, error: null } : l));
                incrementGeneration();
                return;
              }
              if (poll.status === 'failed') {
                setLooks((prev) => prev.map((l, i) => i === taskIdx
                  ? { ...l, loading: false, error: poll.error || '生成失敗' } : l));
                return;
              }
            } catch {
              // network hiccup — keep polling
            }
          }
          // timeout
          setLooks((prev) => prev.map((l, i) => i === taskIdx
            ? { ...l, loading: false, error: '生成がタイムアウトしました' } : l));
        } catch {
          setLooks((prev) => prev.map((l, i) => i === taskIdx
            ? { ...l, loading: false, error: 'ネットワークエラー' } : l));
        }
      })
    );

    setGenerating(false);
  };

  const handleDownload = async (look: LookResult) => {
    if (!look.image) return;
    const filename = `look-${look.outfitIdx + 1}${look.variant}-${Date.now()}.jpg`;
    try {
      const res = await fetch(look.image);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // share failed or not supported — fall through to link download
    }
    const a = document.createElement('a');
    a.href = look.image;
    a.download = filename;
    a.click();
  };

  const buildRecipe = (look: LookResult) => ({
    aspectRatio,
    background,
    location: sceneSettings.location,
    situation: sceneSettings.situation,
    filmMode: sceneSettings.filmMode,
    variant: look.variant,
    gender: modelSettings.gender,
    height: modelSettings.height,
    ethnicity: modelSettings.ethnicity,
    outfitIdx: look.outfitIdx,
  });

  const handleSave = async (look: LookResult, taskIdx: number) => {
    if (!look.image || !user) return;
    setLooks((prev) => prev.map((l, i) => (i === taskIdx ? { ...l, loading: true } : l)));
    const garmentImages = outfits[look.outfitIdx]?.flat().filter(Boolean) as string[];
    try {
      const res = await fetch('/api/my/save-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: look.image,
          firebaseUid: user.id,
          variant: look.variant,
          garmentImages,
          recipe: buildRecipe(look),
        }),
      });
      const data = await res.json();
      setLooks((prev) => prev.map((l, i) =>
        i === taskIdx ? { ...l, loading: false, saved: data.success, error: data.success ? null : '保存失敗' } : l
      ));
      if (data.success) {
        showToast('MY WARDROBE に保存されました');
        if (look.variant === 'A') {
          const outfitItems = outfits[look.outfitIdx] ?? [];
          const cats = outfitCategories[look.outfitIdx] ?? [];
          const garmentPayload = outfitItems
            .map((item, i) => ({ imageDataUrl: item[0] ?? null, category: cats[i] ?? 'その他' }))
            .filter((g): g is { imageDataUrl: string; category: string } => !!g.imageDataUrl);
          if (garmentPayload.length > 0) {
            fetch('/api/my/garments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firebaseUid: user.id, items: garmentPayload }),
            }).catch(() => {});
          }
        }
      }
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
    try {
      const publishedLooks = looks.filter((l) => l.image && selectedLooks.has(lookKey(l)));
      const images = publishedLooks.map((l) => l.image as string);
      const recipes = publishedLooks.map((l) => buildRecipe(l));

      // Step 1: Upload garment images separately to keep publish payload small
      const garmentImageSets: Record<number, string[]> = {};
      const selectedOutfitIdxs = new Set(publishedLooks.map((l) => l.outfitIdx));
      outfits.forEach((outfit, idx) => {
        if (!selectedOutfitIdxs.has(idx)) return;
        const imgs = outfit.flat().filter(Boolean) as string[];
        if (imgs.length > 0) garmentImageSets[idx] = imgs;
      });

      let garmentUrlSets: Record<number, string[]> = {};
      if (Object.keys(garmentImageSets).length > 0) {
        const garmentRes = await fetch('/api/my/upload-garments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ garmentImageSets, firebaseUid: user.id }),
        });
        if (garmentRes.ok) {
          const garmentData = await garmentRes.json();
          garmentUrlSets = garmentData.garmentUrlSets ?? {};
        } else {
          const err = await garmentRes.json().catch(() => ({}));
          console.error('[Publish] garment upload failed:', err);
        }
      }

      // Step 2: Publish looks with garment URLs (no base64 in body)
      const res = await fetch('/api/my/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          category: publishCategory,
          title: publishTitle || sceneSettings.location || null,
          firebaseUid: user.id,
          recipes,
          garmentUrlSets,
        }),
      });

      if (res.ok) {
        setPublished(true);
        setShowPublishModal(false);
      } else {
        const err = await res.json().catch(() => ({}));
        console.error('[Publish] publish failed:', err);
        alert(`公開に失敗しました: ${err.error || res.status}`);
      }
    } catch (e) {
      console.error('[Publish] exception:', e);
      alert(`公開エラー: ${String(e)}`);
    } finally {
      setPublishingAll(false);
    }
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
      <NavPill active="generate" locale={locale} />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 text-[12px] tracking-wider whitespace-nowrap"
          style={{
            background: 'var(--vault-text)',
            color: 'var(--vault-bg)',
            fontFamily: MONO,
            animation: 'slideUp 0.2s ease',
          }}
        >
          {toast}
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-32 space-y-16">

        {/* Mode selector */}
        <section className="space-y-4">
          <p className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
            MODE
          </p>
          <div className="flex gap-[2px]">
            {MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleModeChange(m.value)}
                className="flex-1 py-4 text-[13px] tracking-wide transition-opacity hover:opacity-70"
                style={{
                  background: mode === m.value ? 'var(--vault-text)' : 'var(--vault-border)',
                  color: mode === m.value ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>
            {modeConfig.outfits} コーデ → {modeConfig.looks} ルック生成 — {modeConfig.credits} クレジット
          </p>
        </section>

        {/* MY ITEMS picker */}
        {user && (
          <section className="space-y-3">
            <button
              onClick={() => setWardrobeOpen((v) => !v)}
              className="flex items-center gap-2 text-[11px] tracking-[3px] transition-opacity hover:opacity-60"
              style={{ color: 'var(--vault-text-dim)' }}
            >
              MY ITEMS
              <svg
                width="8" height="8" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5"
                style={{ transform: wardrobeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              {wardrobe.length > 0 && (
                <span className="text-[9px] tracking-normal" style={{ opacity: 0.5 }}>
                  {wardrobe.length}
                </span>
              )}
            </button>

            {wardrobeOpen && (
              <div className="space-y-3">
                {/* Category chips — only show cats that have items */}
                <div className="flex gap-[2px] flex-wrap">
                  <button
                    onClick={() => setWardrobeCat('')}
                    className="px-2.5 py-1 text-[9px] tracking-[2px] transition-opacity hover:opacity-70"
                    style={{ background: !wardrobeCat ? 'var(--vault-text)' : 'var(--vault-border)', color: !wardrobeCat ? 'var(--vault-bg)' : 'var(--vault-text-dim)' }}
                  >ALL</button>
                  {GARMENT_CATEGORIES.map((c) => {
                    if (!wardrobe.some((g) => g.category === c.value)) return null;
                    return (
                      <button
                        key={c.value}
                        onClick={() => setWardrobeCat(c.value)}
                        className="px-2.5 py-1 text-[9px] tracking-[2px] transition-opacity hover:opacity-70"
                        style={{ background: wardrobeCat === c.value ? 'var(--vault-text)' : 'var(--vault-border)', color: wardrobeCat === c.value ? 'var(--vault-bg)' : 'var(--vault-text-dim)' }}
                      >{c.label}</button>
                    );
                  })}
                </div>

                {wardrobe.length === 0 ? (
                  <p className="text-[10px] py-6 text-center" style={{ color: 'var(--vault-text-dim)' }}>
                    MY WARDROBE にアイテムがありません
                  </p>
                ) : (
                  <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    <div className="flex gap-[3px]" style={{ width: 'fit-content' }}>
                      {wardrobe
                        .filter((g) => !wardrobeCat || g.category === wardrobeCat)
                        .map((g) => (
                          <div
                            key={g.id}
                            draggable
                            onDragStart={(e) => {
                              _draggedGarment = { imageUrl: g.image_url, detailUrls: g.detail_urls ?? [], category: g.category };
                              e.dataTransfer.setData('text/plain', 'garment');
                              e.dataTransfer.effectAllowed = 'copy';
                            }}
                            onDragEnd={() => { _draggedGarment = null; }}
                            onClick={() => insertGarment(g)}
                            className="flex-shrink-0 relative cursor-grab active:cursor-grabbing"
                            style={{ width: 72, height: 96, background: 'var(--vault-border)' }}
                            title={`${g.category}${(g.detail_urls?.length ?? 0) > 0 ? ` +${g.detail_urls!.length}枚` : ''}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={g.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                            {(g.detail_urls?.length ?? 0) > 0 && (
                              <div
                                className="absolute bottom-1 right-1 rounded-full flex items-center justify-center"
                                style={{ width: 14, height: 14, background: 'var(--vault-text)', opacity: 0.75 }}
                              >
                                <span className="text-[6px]" style={{ color: 'var(--vault-bg)' }}>
                                  +{g.detail_urls!.length}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <p className="text-[9px] tracking-[1px]" style={{ color: 'var(--vault-text-dim)', opacity: 0.5 }}>
                  タップで挿入 / ドラッグ&ドロップでスロット指定
                </p>
              </div>
            )}
          </section>
        )}

        {/* Outfit rows */}
        <section className="space-y-10">
          {outfits.map((outfit, outfitIdx) => (
            <OutfitRow
              key={outfitIdx}
              outfit={outfit}
              outfitIdx={outfitIdx}
              showLabel={modeConfig.outfits > 1}
              categories={outfitCategories[outfitIdx] ?? []}
              onUpdate={(updated) => updateOutfit(outfitIdx, updated)}
              onCategoriesUpdate={(updated) => updateCategories(outfitIdx, updated)}
              onGarmentDrop={handleGarmentDrop}
            />
          ))}
        </section>

        {/* Model settings */}
        <section className="space-y-6">
          <p className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
            MODEL
          </p>

          {/* Face photo + basic settings row */}
          <div className="flex gap-4 items-start">
            {/* Face photo upload */}
            <div className="flex-shrink-0 space-y-1">
              <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>FACE</p>
              <button
                onClick={faceImage ? clearFaceImage : pickFaceImage}
                className="relative group overflow-hidden"
                style={{ width: 52, height: 52, background: 'var(--vault-border)', border: faceImage ? 'none' : '1px dashed var(--vault-border)' }}
              >
                {faceImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faceImage} alt="face" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--vault-text-dim)" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                )}
              </button>
              <p className="text-[10px]" style={{ color: 'var(--vault-text-dim)' }}>
                {faceImage ? 'CLEAR' : 'OPT'}
              </p>
            </div>

            {/* Model selectors — SEX + MODEL hidden when face photo is uploaded */}
            {faceImage ? (
              <div className="flex-1 grid grid-cols-2 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>
                    HEIGHT — {modelSettings.height}cm
                  </p>
                  <input
                    type="range" min={150} max={195} step={1}
                    value={modelSettings.height}
                    onChange={(e) => setModelSettings((s) => ({ ...s, height: parseInt(e.target.value) }))}
                    className="w-full mt-3"
                    style={{ accentColor: 'var(--vault-text)' }}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>BG</p>
                  <select
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full text-[13px] py-2 bg-transparent border-b outline-none"
                    style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
                  >
                    {BACKGROUNDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex-1 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>SEX</p>
                  <div className="flex" style={{ borderBottom: '1px solid var(--vault-border)' }}>
                    {(['female', 'male'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setModelSettings((s) => ({ ...s, gender: g }))}
                        className="flex-1 py-2 text-[12px] tracking-wide transition-opacity"
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
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>
                    HEIGHT — {modelSettings.height}cm
                  </p>
                  <input
                    type="range" min={150} max={195} step={1}
                    value={modelSettings.height}
                    onChange={(e) => setModelSettings((s) => ({ ...s, height: parseInt(e.target.value) }))}
                    className="w-full mt-3"
                    style={{ accentColor: 'var(--vault-text)' }}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>MODEL</p>
                  <select
                    value={modelSettings.ethnicity}
                    onChange={(e) => setModelSettings((s) => ({ ...s, ethnicity: e.target.value }))}
                    className="w-full text-[13px] py-2 bg-transparent border-b outline-none"
                    style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
                  >
                    {ETHNICITIES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>BG</p>
                  <select
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full text-[13px] py-2 bg-transparent border-b outline-none"
                    style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
                  >
                    {BACKGROUNDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Scene settings */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Location — disabled when a specific BG is chosen */}
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>
                LOCATION
                {background && <span className="ml-2" style={{ opacity: 0.4 }}>— BG優先</span>}
              </p>
              <input
                type="text"
                value={sceneSettings.location}
                onChange={(e) => setSceneSettings((s) => ({ ...s, location: e.target.value }))}
                placeholder="東京 / Paris / Studio..."
                disabled={!!background}
                className="w-full text-[13px] py-2 bg-transparent border-b outline-none placeholder:opacity-30 disabled:opacity-30"
                style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
              />
            </div>

            {/* Situation */}
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>
                SITUATION
                {background ? <span className="ml-2" style={{ opacity: 0.4 }}>— BG優先</span> : <span style={{ opacity: 0.4 }}> — OPT</span>}
              </p>
              <input
                type="text"
                value={sceneSettings.situation}
                onChange={(e) => setSceneSettings((s) => ({ ...s, situation: e.target.value }))}
                placeholder="未記入でGeminiが考える"
                disabled={!!background}
                className="w-full text-[13px] py-2 bg-transparent border-b outline-none placeholder:opacity-30 disabled:opacity-30"
                style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
              />
            </div>

            {/* Film look */}
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>FILM LOOK</p>
              <select
                value={sceneSettings.filmMode}
                onChange={(e) => setSceneSettings((s) => ({ ...s, filmMode: e.target.value }))}
                className="w-full text-[13px] py-2 bg-transparent border-b outline-none"
                style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)' }}
              >
                {FILM_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            {/* Aspect ratio */}
            <div className="space-y-2">
              <p className="text-[12px]" style={{ color: 'var(--vault-text-dim)' }}>AR</p>
              <div className="flex gap-[2px]">
                {(['3:4', '9:16', '1:1', '16:9', '4:3', '4:5'] as const).map((ar) => (
                  <button
                    key={ar}
                    onClick={() => setAspectRatio(ar)}
                    className="flex-1 py-2 text-[11px] tracking-wider transition-opacity hover:opacity-80"
                    style={{
                      background: aspectRatio === ar ? 'var(--vault-text)' : 'var(--vault-border)',
                      color: aspectRatio === ar ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                    }}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Generate */}
        <section className="space-y-3">
          {!hasAnyImage && (
            <p className="text-[12px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
              ※ アイテムを1枚以上追加してください
            </p>
          )}
          {!canGenerate() && hasAnyImage && (
            <p className="text-[12px] tracking-wide" style={{ color: 'var(--vault-cyan)' }}>
              クレジットが不足しています
            </p>
          )}
          <button
            onClick={handleGenerate}
            disabled={!canGen}
            className="w-full py-5 text-[14px] tracking-wider transition-opacity disabled:opacity-20"
            style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
          >
            {generating ? 'GENERATING...' : `GENERATE — ${modeConfig.credits} CREDITS`}
          </button>
        </section>

        {/* Results */}
        {hasResults && (
          <section className="space-y-10">
            <p className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
              RESULTS
            </p>

            {looksByOutfit.map((outfitLooks, outfitIdx) => {
              if (outfitLooks.length === 0) return null;
              return (
                <div key={outfitIdx} className="space-y-2">
                  {modeConfig.outfits > 1 && (
                    <p className="text-[12px] tracking-wide" style={{ color: 'var(--vault-text-dim)' }}>
                      OUTFIT {outfitIdx + 1}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-[2px]">
                    {outfitLooks.map((look) => {
                      const taskIdx = looks.indexOf(look);
                      const arRatioMap: Record<string, string> = {
                        '3:4': '3/4', '9:16': '9/16', '1:1': '1/1',
                        '16:9': '16/9', '4:3': '4/3', '4:5': '4/5',
                      };
                      const arRatio = arRatioMap[aspectRatio] || '3/4';
                      const isSelected = selectedLooks.has(lookKey(look));
                      const canSelect = !!look.image && mode !== 'quick';
                      return (
                        <div key={`${outfitIdx}-${look.variant}`}>
                          <div
                            className="relative overflow-hidden"
                            style={{
                              background: 'var(--vault-border)',
                              aspectRatio: arRatio,
                              cursor: canSelect ? 'pointer' : 'default',
                            }}
                            onClick={() => canSelect && toggleLookSelection(look)}
                          >
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
                                <p className="text-[12px] text-center" style={{ color: 'var(--vault-text-dim)' }}>{look.error}</p>
                              </div>
                            )}

                            {/* Selection overlay */}
                            {canSelect && isSelected && (
                              <>
                                <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2px #fff' }} />
                                <div
                                  className="absolute top-2 right-2 pointer-events-none flex items-center justify-center rounded-full"
                                  style={{ width: 22, height: 22, background: '#fff' }}
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              </>
                            )}

                            {look.image && (
                              <div className="absolute bottom-0 left-0 right-0 flex">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(look); }}
                                  className="flex-1 py-[10px] text-[11px] tracking-widest transition-opacity hover:opacity-75"
                                  style={{ background: 'rgba(0,0,0,0.70)', color: '#fff', backdropFilter: 'blur(6px)' }}
                                >
                                  DL
                                </button>
                                <div style={{ width: 1, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                                {user ? (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSave(look, taskIdx); }}
                                    disabled={look.saved || look.loading}
                                    className="flex-1 py-[10px] text-[11px] tracking-widest transition-opacity hover:opacity-75 disabled:opacity-50"
                                    style={{
                                      background: 'rgba(0,0,0,0.70)',
                                      color: look.saved ? '#7ecfb3' : '#fff',
                                      backdropFilter: 'blur(6px)',
                                    }}
                                  >
                                    {look.saved ? 'SAVED' : look.loading ? '...' : 'SAVE'}
                                  </button>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); signInWithGoogle().then((u) => u && setUser(u)); }}
                                    className="flex-1 py-[10px] text-[11px] tracking-widest transition-opacity hover:opacity-75"
                                    style={{ background: 'rgba(0,0,0,0.70)', color: '#fff', backdropFilter: 'blur(6px)' }}
                                  >
                                    LOGIN
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-[12px] mt-1" style={{ color: 'var(--vault-text-dim)' }}>
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
              <div className="space-y-2 pt-4">
                <p className="text-[11px] tracking-widest text-center" style={{ color: 'var(--vault-text-dim)' }}>
                  タップして公開するルックを選択
                </p>
                <div className="flex gap-[2px]">
                  <button
                    onClick={handleSaveAll}
                    disabled={allSaved}
                    className="flex-1 py-3 text-[13px] tracking-wide transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)' }}
                  >
                    {allSaved ? 'ALL SAVED' : 'SAVE ALL'}
                  </button>
                  <button
                    onClick={() => (!published && selectedLooks.size >= 3) ? setShowPublishModal(true) : undefined}
                    disabled={publishingAll || published || selectedLooks.size < 3}
                    className="flex-1 py-3 text-[13px] tracking-wide transition-opacity hover:opacity-70 disabled:opacity-40"
                    style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
                  >
                    {published
                      ? '公開済み ✓'
                      : selectedLooks.size >= 3
                        ? `${selectedLooks.size}枚を公開`
                        : `${selectedLooks.size} / 3 選択`}
                  </button>
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
                  style={{ background: 'var(--vault-bg)', border: '1px solid var(--vault-border)' }}
                >
                  <div className="text-[13px] tracking-wide" style={{ color: 'var(--vault-text)' }}>
                    このワードローブを公開
                  </div>

                  {/* Category */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>カテゴリ</span>
                    <div className="grid grid-cols-4 gap-[2px]">
                      {[
                        { value: 'high_fashion', label: 'HIGH' },
                        { value: 'street',       label: 'STREET' },
                        { value: 'casual',       label: 'CASUAL' },
                        { value: 'minimal',      label: 'MINIMAL' },
                        { value: 'feminine',     label: 'FEMININE' },
                        { value: 'classic',      label: 'CLASSIC' },
                        { value: 'vintage',      label: 'VINTAGE' },
                        { value: 'resort',       label: 'RESORT' },
                      ].map((c) => (
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

                  {/* Title (optional) */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>タイトル（任意）</span>
                    <input
                      type="text"
                      value={publishTitle}
                      onChange={(e) => setPublishTitle(e.target.value)}
                      placeholder={sceneSettings.location || 'My Look'}
                      className="w-full px-3 py-2 text-[12px] outline-none bg-transparent"
                      style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text)' }}
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
                      onClick={handlePublishAll}
                      disabled={publishingAll}
                      className="flex-1 py-3 text-[12px] tracking-wide hover:opacity-80 disabled:opacity-40"
                      style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
                    >
                      {publishingAll ? '公開中...' : '公開する'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
