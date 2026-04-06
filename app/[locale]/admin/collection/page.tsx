'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Plus, Trash2, GripVertical, Layers, Loader2, X, Check, Download, Link2, Unlink, ChevronLeft, ChevronRight, ChevronDown, Copy, Video } from 'lucide-react';
import JSZip from 'jszip';
import { useStoreContext } from '@/lib/store/store-context';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCollection, CollectionLook, CollectionItem } from '@/lib/hooks/useCollection';
import { AddLookModal } from '@/components/admin/collection/AddLookModal';
import { getCategoryLabel } from '@/lib/utils/category';

// Format price with currency
function formatPrice(price: number, currency: string): string {
  if (currency === 'jpy' || currency === 'JPY') {
    return `¥${price.toLocaleString()}`;
  }
  return `${currency.toUpperCase()} ${price.toLocaleString()}`;
}

// Single look card (used inside the list)
function SortableLookCard({
  look,
  onDelete,
  onClick,
  locale,
  isSelected,
  onToggleSelect,
  isBundled,
}: {
  look: CollectionLook;
  onDelete: (id: string) => void;
  onClick: () => void;
  locale: string;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isBundled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: look.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ja = locale === 'ja';
  const products = look.collection_look_products || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-[var(--color-line)] rounded-xl p-3 hover:shadow-sm transition-shadow"
    >
      {/* Checkbox (only for unbundled looks) */}
      {!isBundled && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(look.id)}
          className="w-4 h-4 rounded border-[var(--color-line)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] flex-shrink-0"
        />
      )}

      {/* Drag handle */}
      {!isBundled && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-[var(--color-text-label)] hover:text-[var(--color-title-active)]"
        >
          <GripVertical size={20} />
        </button>
      )}

      {/* Look image + info (clickable) */}
      <div className="flex-1 min-w-0 flex items-center gap-4 cursor-pointer" onClick={onClick}>
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0 flex items-center justify-center">
          <img src={look.image_url} alt="" className="max-w-full max-h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0">
          {look.title ? (
            <p className="text-sm font-medium text-[var(--color-title-active)] mb-0.5 truncate">
              {look.title}
            </p>
          ) : (
            <p className="text-sm text-[var(--color-text-placeholder)] mb-0.5 italic">
              {ja ? 'タイトル未設定' : 'No title'}
            </p>
          )}
          {look.description ? (
            <p className="text-xs text-[var(--color-text-body)] mb-2 line-clamp-2">
              {look.description}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-text-placeholder)] mb-2 italic">
              {ja ? '説明文未設定' : 'No description'}
            </p>
          )}
          <div className="flex gap-2">
            {products.map((lp) => (
              <div
                key={lp.id}
                className="w-10 h-10 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0 flex items-center justify-center"
                title={lp.products?.name}
              >
                {lp.products?.images?.[0]?.url && (
                  <img src={lp.products.images[0].url} alt="" className="max-w-full max-h-full object-contain" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Delete */}
      {!isBundled && (
        <button
          onClick={() => {
            if (confirm(ja ? 'このルックを削除しますか？' : 'Delete this look?')) {
              onDelete(look.id);
            }
          }}
          className="p-2 text-[var(--color-text-label)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}

// Bundle card (shows multiple thumbnails side by side)
function BundleCard({
  bundle,
  onClick,
  onDisband,
  onDelete,
  locale,
  isSelected,
  onToggleSelect,
}: {
  bundle: { id: string; looks: CollectionLook[] };
  onClick: () => void;
  onDisband: (bundleId: string) => void;
  onDelete: (bundleId: string, lookIds: string[]) => void;
  locale: string;
  isSelected: boolean;
  onToggleSelect: (bundleId: string) => void;
}) {
  const ja = locale === 'ja';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `bundle-${bundle.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-xl p-3 hover:shadow-sm transition-shadow ${isSelected ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'}`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(bundle.id)}
          className="w-4 h-4 rounded border-[var(--color-line)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] flex-shrink-0"
        />

        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-[var(--color-accent)]"
        >
          <GripVertical size={20} />
        </button>

        {/* Thumbnails row (clickable) */}
        <div className="flex-1 min-w-0 flex items-center gap-2 cursor-pointer" onClick={onClick}>
          {bundle.looks.map((look) => (
            <div
              key={look.id}
              className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-[var(--color-line)] flex-shrink-0 flex items-center justify-center"
            >
              <img src={look.image_url} alt="" className="max-w-full max-h-full object-contain" />
            </div>
          ))}
          <div className="ml-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Link2 size={12} className="text-[var(--color-accent)]" />
              <span className="text-xs font-semibold text-[var(--color-accent)]">
                {ja ? `${bundle.looks.length}枚バンドル` : `${bundle.looks.length}-look bundle`}
              </span>
              {bundle.looks.some(l => l.video_clip_url) && (
                <Video size={12} className="text-emerald-500" />
              )}
            </div>
            {bundle.looks[0]?.title && (
              <p className="text-xs text-[var(--color-text-body)] truncate max-w-[200px]">
                {bundle.looks[0].title}
              </p>
            )}
          </div>
        </div>

        {/* Disband & Delete */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <button
            onClick={() => {
              if (confirm(ja ? 'バンドルを解除しますか？（ルックは残ります）' : 'Disband this bundle? (looks will remain)')) {
                onDisband(bundle.id);
              }
            }}
            className="p-1.5 text-[var(--color-text-label)] hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
            title={ja ? 'バンドル解除' : 'Disband'}
          >
            <Unlink size={16} />
          </button>
          <button
            onClick={() => {
              if (confirm(ja ? `バンドル内の${bundle.looks.length}枚すべてを削除しますか？` : `Delete all ${bundle.looks.length} looks in this bundle?`)) {
                onDelete(bundle.id, bundle.looks.map(l => l.id));
              }
            }}
            className="p-1.5 text-[var(--color-text-label)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title={ja ? 'バンドルごと削除' : 'Delete bundle'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Credits section component
function CreditsSection({
  products,
  showCredits,
  onToggle,
  locale,
}: {
  products: CollectionLook['collection_look_products'];
  showCredits: boolean;
  onToggle: (value: boolean) => void;
  locale: string;
}) {
  const ja = locale === 'ja';
  if (!products || products.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide">
          {ja ? 'クレジット' : 'Credits'}
        </label>
        <button
          onClick={() => onToggle(!showCredits)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            showCredits ? 'bg-[var(--color-accent)]' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              showCredits ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <div className={`space-y-2 ${!showCredits ? 'opacity-40' : ''}`}>
        {products.map((lp) => {
          const p = lp.products;
          if (!p) return null;
          const catLabel = getCategoryLabel(p.category || '', locale);
          const brandPart = p.brand ? ` (${p.brand})` : '';
          return (
            <div key={lp.id} className="text-xs text-[var(--color-text-body)] leading-relaxed">
              <p className="font-medium">{catLabel}: {p.name}{brandPart}</p>
              <p className="text-[var(--color-text-label)]">{formatPrice(p.base_price, p.currency)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LookDetailModal({
  look,
  onClose,
  onSave,
  locale,
  bundleLooks,
  onNavigate,
}: {
  look: CollectionLook;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; description?: string; show_credits?: boolean; video_prompt_veo?: string; video_prompt_kling?: string; telop_caption_ja?: string; telop_caption_en?: string; shot_duration_sec?: number }) => Promise<void>;
  locale: string;
  bundleLooks?: CollectionLook[];
  onNavigate?: (look: CollectionLook) => void;
}) {
  const ja = locale === 'ja';
  const store = useStoreContext((s) => s.store);
  const isDevStore = store?.slug === 'vualofficial';
  const [downloadFilterOpen, setDownloadFilterOpen] = useState(false);
  const [glamDownloadFilterOpen, setGlamDownloadFilterOpen] = useState(false);
  const [title, setTitle] = useState(look.title || '');
  const [description, setDescription] = useState(look.description || '');
  const [showCredits, setShowCredits] = useState(look.show_credits ?? true);
  const [videoPromptVeo, setVideoPromptVeo] = useState(look.video_prompt_veo || '');
  const [videoPromptKling, setVideoPromptKling] = useState(look.video_prompt_kling || '');
  const [telopCaptionJa, setTelopCaptionJa] = useState(look.telop_caption_ja || '');
  const [telopCaptionEn, setTelopCaptionEn] = useState(look.telop_caption_en || '');
  const [shotDuration, setShotDuration] = useState(look.shot_duration_sec || 6);
  const [videoPromptsOpen, setVideoPromptsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const products = look.collection_look_products || [];

  const hasChanges =
    title !== (look.title || '') ||
    description !== (look.description || '') ||
    showCredits !== (look.show_credits ?? true) ||
    videoPromptVeo !== (look.video_prompt_veo || '') ||
    videoPromptKling !== (look.video_prompt_kling || '') ||
    telopCaptionJa !== (look.telop_caption_ja || '') ||
    telopCaptionEn !== (look.telop_caption_en || '') ||
    shotDuration !== (look.shot_duration_sec || 6);

  const handleCopyPrompt = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  // Bundle navigation
  const currentBundleIndex = bundleLooks ? bundleLooks.findIndex(l => l.id === look.id) : -1;
  const canGoPrev = bundleLooks && currentBundleIndex > 0;
  const canGoNext = bundleLooks && currentBundleIndex >= 0 && currentBundleIndex < bundleLooks.length - 1;

  const handleNavigate = async (direction: 'prev' | 'next') => {
    if (!bundleLooks || !onNavigate) return;
    // Auto-save if there are changes
    if (hasChanges) {
      await onSave(look.id, { title: title || '', description: description || '', show_credits: showCredits, video_prompt_veo: videoPromptVeo, video_prompt_kling: videoPromptKling, telop_caption_ja: telopCaptionJa, telop_caption_en: telopCaptionEn, shot_duration_sec: shotDuration });
    }
    const nextIndex = direction === 'prev' ? currentBundleIndex - 1 : currentBundleIndex + 1;
    if (nextIndex >= 0 && nextIndex < bundleLooks.length) {
      onNavigate(bundleLooks[nextIndex]);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(look.id, { title: title || '', description: description || '', show_credits: showCredits, video_prompt_veo: videoPromptVeo, video_prompt_kling: videoPromptKling, telop_caption_ja: telopCaptionJa, telop_caption_en: telopCaptionEn, shot_duration_sec: shotDuration });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-line)]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[var(--color-title-active)]">
              {ja ? 'ルック詳細' : 'Look Details'}
            </h2>
            {bundleLooks && currentBundleIndex >= 0 && (
              <span className="text-xs text-[var(--color-text-label)]">
                {currentBundleIndex + 1} / {bundleLooks.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setDownloadFilterOpen(prev => !prev)}
                className="flex items-center gap-0.5 p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
                title={ja ? 'ダウンロード' : 'Download'}
              >
                <Download size={18} className="text-[var(--color-text-label)]" />
                <ChevronDown size={12} className="text-[var(--color-text-label)]" />
              </button>
              {downloadFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDownloadFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-xl border border-[var(--color-line)] py-1 min-w-[150px]">
                    {([
                      { id: 'none' as const, label: 'Original' },
                      { id: 'natural' as const, label: 'Natural' },
                      { id: 'film' as const, label: 'Film' },
                      { id: 'chrome' as const, label: 'Chrome' },
                      { id: 'polaroid' as const, label: 'Polaroid' },
                      { id: 'polaroidDusk' as const, label: 'Polaroid Dusk' },
                      { id: 'polaroidBlue' as const, label: 'Polaroid Blue' },
                    ]).map((f) => (
                      <button
                        key={f.id}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors flex items-center gap-2"
                        onClick={async () => {
                          setDownloadFilterOpen(false);
                          try {
                            const proxyUrl = `/api/media/download?url=${encodeURIComponent(look.image_url)}`;
                            {
                              // Load image via proxy, draw to canvas, optionally apply filter
                              const img = new window.Image();
                              img.crossOrigin = 'anonymous';
                              img.src = proxyUrl;
                              await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => reject(new Error('Image load failed'));
                              });
                              const canvas = document.createElement('canvas');
                              canvas.width = img.naturalWidth;
                              canvas.height = img.naturalHeight;
                              canvas.getContext('2d')!.drawImage(img, 0, 0);
                              let dataUrl = canvas.toDataURL('image/png');
                              if (f.id !== 'none') {
                                const { applyFilter } = await import('@/lib/photo-filters');
                                dataUrl = await applyFilter(dataUrl, f.id);
                              }
                              const link = document.createElement('a');
                              link.href = dataUrl;
                              link.download = `look-${look.id}${f.id !== 'none' ? `-${f.id}` : ''}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }
                          } catch (err) {
                            console.error('Download failed:', err);
                          }
                        }}
                      >
                        <Download size={12} className="text-[var(--color-text-label)]" />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {/* Glam AI folder download */}
            <div className="relative">
              <button
                onClick={() => setGlamDownloadFilterOpen(prev => !prev)}
                className="flex items-center gap-0.5 p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
                title={ja ? 'Glam AI フォルダ形式' : 'Glam AI folder'}
              >
                <Layers size={18} className="text-[var(--color-text-label)]" />
                <ChevronDown size={12} className="text-[var(--color-text-label)]" />
              </button>
              {glamDownloadFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setGlamDownloadFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-xl border border-[var(--color-line)] py-1 min-w-[150px]">
                    {([
                      { id: 'none' as const, label: 'Original' },
                      { id: 'natural' as const, label: 'Natural' },
                      { id: 'film' as const, label: 'Film' },
                      { id: 'chrome' as const, label: 'Chrome' },
                      { id: 'polaroid' as const, label: 'Polaroid' },
                      { id: 'polaroidDusk' as const, label: 'Polaroid Dusk' },
                      { id: 'polaroidBlue' as const, label: 'Polaroid Blue' },
                    ]).map((f) => (
                      <button
                        key={f.id}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors flex items-center gap-2"
                        onClick={async () => {
                          setGlamDownloadFilterOpen(false);
                          try {
                            const idx = bundleLooks ? bundleLooks.findIndex(l => l.id === look.id) : -1;
                            const num = String((idx >= 0 ? idx : 0) + 1).padStart(3, '0');
                            const lookTitle = look.title || `look_${look.id.slice(0, 8)}`;
                            const folderName = `${num}_${lookTitle}`;

                            const zip = new JSZip();
                            const folder = zip.folder(folderName)!;

                            const proxyUrl = `/api/media/download?url=${encodeURIComponent(look.image_url)}`;
                            const res = await fetch(proxyUrl);
                            const blob = await res.blob();

                            if (f.id === 'none') {
                              const ext = blob.type === 'image/png' ? 'png' : 'jpg';
                              folder.file(`image.${ext}`, blob);
                            } else {
                              const img = new window.Image();
                              img.crossOrigin = 'anonymous';
                              img.src = URL.createObjectURL(blob);
                              await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => reject(new Error('Image load failed'));
                              });
                              const canvas = document.createElement('canvas');
                              canvas.width = img.naturalWidth;
                              canvas.height = img.naturalHeight;
                              canvas.getContext('2d')!.drawImage(img, 0, 0);
                              const base64 = canvas.toDataURL('image/png');
                              URL.revokeObjectURL(img.src);
                              const { applyFilter } = await import('@/lib/photo-filters');
                              const filtered = await applyFilter(base64, f.id);
                              const filteredBlob = await fetch(filtered).then(r => r.blob());
                              folder.file('image.png', filteredBlob);
                            }

                            folder.file('prompt.txt', look.video_prompt_veo || '');

                            const zipBlob = await zip.generateAsync({ type: 'blob' });
                            const url = URL.createObjectURL(zipBlob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${folderName}.zip`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Glam folder download failed:', err);
                          }
                        }}
                      >
                        <Download size={12} className="text-[var(--color-text-label)]" />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Image with bundle navigation arrows */}
          <div className="relative rounded-xl overflow-hidden bg-[var(--color-bg-element)] flex items-center justify-center">
            <img src={look.image_url} alt="" className="max-w-full max-h-[400px] object-contain" />
            {canGoPrev && (
              <button
                onClick={() => handleNavigate('prev')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <ChevronLeft size={20} className="text-[var(--color-title-active)]" />
              </button>
            )}
            {canGoNext && (
              <button
                onClick={() => handleNavigate('next')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <ChevronRight size={20} className="text-[var(--color-title-active)]" />
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-1.5 block">
              {ja ? 'タイトル' : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ja ? 'ルックのタイトル' : 'Look title'}
              className="w-full text-sm px-3 py-2.5 border border-[var(--color-line)] rounded-lg text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-1.5 block">
              {ja ? '説明文' : 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ja ? '情緒的なコピーライティング' : 'Editorial copy'}
              rows={4}
              className="w-full text-sm px-3 py-2.5 border border-[var(--color-line)] rounded-lg text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] resize-none leading-relaxed focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          {/* Video Prompts — developer store only */}
          {isDevStore && (
            <div className="border border-[var(--color-line)] rounded-lg overflow-hidden">
              <button
                onClick={() => setVideoPromptsOpen(!videoPromptsOpen)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <Video size={14} className="text-[var(--color-text-label)]" />
                <span className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide flex-1">
                  Video Prompts
                </span>
                <ChevronDown size={14} className={`text-[var(--color-text-label)] transition-transform ${videoPromptsOpen ? 'rotate-180' : ''}`} />
              </button>
              {videoPromptsOpen && (
                <div className="px-3 pb-3 space-y-3 border-t border-[var(--color-line)]">
                  {/* Veo 3.1 */}
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-[var(--color-text-label)] uppercase tracking-wide">Veo 3.1</span>
                      <button
                        onClick={() => handleCopyPrompt(videoPromptVeo, 'veo')}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--color-text-label)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-element)] rounded transition-colors"
                      >
                        {copiedField === 'veo' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {copiedField === 'veo' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={videoPromptVeo}
                      onChange={(e) => setVideoPromptVeo(e.target.value)}
                      placeholder="Veo 3.1 video generation prompt..."
                      rows={4}
                      className="w-full text-[11px] px-2.5 py-2 border border-[var(--color-line)] rounded-md text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] resize-none leading-relaxed focus:outline-none focus:border-[var(--color-accent)] font-mono"
                    />
                  </div>
                  {/* Kling 3.0 */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-[var(--color-text-label)] uppercase tracking-wide">Kling 3.0</span>
                      <button
                        onClick={() => handleCopyPrompt(videoPromptKling, 'kling')}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--color-text-label)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-element)] rounded transition-colors"
                      >
                        {copiedField === 'kling' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {copiedField === 'kling' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <textarea
                      value={videoPromptKling}
                      onChange={(e) => setVideoPromptKling(e.target.value)}
                      placeholder="Kling 3.0 video generation prompt..."
                      rows={4}
                      className="w-full text-[11px] px-2.5 py-2 border border-[var(--color-line)] rounded-md text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] resize-none leading-relaxed focus:outline-none focus:border-[var(--color-accent)] font-mono"
                    />
                  </div>
                  {/* Telop & Duration */}
                  <div className="border-t border-[var(--color-line)] pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-semibold text-[var(--color-text-label)] uppercase tracking-wide">Telop & Duration</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-[var(--color-text-label)]">Duration</span>
                          <select
                            value={shotDuration}
                            onChange={(e) => setShotDuration(Number(e.target.value))}
                            className="text-[10px] px-1 py-0.5 border border-[var(--color-line)] rounded bg-white text-[var(--color-text-body)]"
                          >
                            {[4, 5, 6, 7, 8].map(s => (
                              <option key={s} value={s}>{s}s</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const telopJson = JSON.stringify({
                            caption_ja: telopCaptionJa,
                            caption_en: telopCaptionEn,
                            title_ja: title,
                            shot_duration_sec: shotDuration,
                            timing: { startSec: 0.5, durationSec: Math.min(3, shotDuration - 1.5), fadeInSec: 0.3, fadeOutSec: 0.5 },
                          }, null, 2);
                          handleCopyPrompt(telopJson, 'telop');
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-[var(--color-text-label)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-element)] rounded transition-colors"
                      >
                        {copiedField === 'telop' ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        {copiedField === 'telop' ? 'Copied JSON' : 'Copy JSON'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-[var(--color-text-label)] mb-0.5 block">JA</span>
                        <input
                          type="text"
                          value={telopCaptionJa}
                          onChange={(e) => setTelopCaptionJa(e.target.value)}
                          placeholder="光の中で息をする"
                          className="w-full text-[11px] px-2 py-1.5 border border-[var(--color-line)] rounded-md text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-[var(--color-text-label)] mb-0.5 block">EN</span>
                        <input
                          type="text"
                          value={telopCaptionEn}
                          onChange={(e) => setTelopCaptionEn(e.target.value)}
                          placeholder="breathing in the light"
                          className="w-full text-[11px] px-2 py-1.5 border border-[var(--color-line)] rounded-md text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Credits with toggle */}
          <CreditsSection
            products={products}
            showCredits={showCredits}
            onToggle={setShowCredits}
            locale={locale}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--color-line)]">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check size={14} />
              {ja ? '保存しました' : 'Saved'}
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
          >
            {ja ? '閉じる' : 'Close'}
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {isSaving && <Loader2 size={14} className="animate-spin" />}
            {ja ? '保存' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Bundle detail modal (view/reorder looks within a bundle)
function BundleDetailModal({
  bundle,
  onClose,
  onClickLook,
  onReorder,
  onAddToBundle,
  onRemoveFromBundle,
  unbundledLooks,
  locale,
}: {
  bundle: { id: string; looks: CollectionLook[] };
  onClose: () => void;
  onClickLook: (look: CollectionLook) => void;
  onReorder: (bundleId: string, lookIds: string[]) => void;
  onAddToBundle: (bundleId: string, lookId: string) => Promise<void>;
  onRemoveFromBundle: (bundleId: string, lookId: string) => Promise<{ disbanded?: boolean }>;
  unbundledLooks: CollectionLook[];
  locale: string;
}) {
  const ja = locale === 'ja';
  const [orderedLooks, setOrderedLooks] = useState(bundle.looks);
  // Sync orderedLooks when bundle.looks changes (after add/remove)
  useEffect(() => {
    setOrderedLooks(bundle.looks);
  }, [bundle.looks]);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const store = useStoreContext((s) => s.store);
  const isDevStore = store?.slug === 'vualofficial';
  const [isDownloading, setIsDownloading] = useState(false);
  const [bundleDownloadFilterOpen, setBundleDownloadFilterOpen] = useState(false);

  const handleAddLook = async (lookId: string) => {
    setIsAdding(lookId);
    try {
      await onAddToBundle(bundle.id, lookId);
      setShowAddPicker(false);
    } catch (err) {
      console.error('Failed to add look to bundle:', err);
    } finally {
      setIsAdding(null);
    }
  };

  const handleRemoveLook = async (lookId: string) => {
    if (isRemoving) return;
    setIsRemoving(lookId);
    try {
      const result = await onRemoveFromBundle(bundle.id, lookId);
      if (result?.disbanded) {
        onClose();
      } else {
        setOrderedLooks(prev => prev.filter(l => l.id !== lookId));
      }
    } catch (err) {
      console.error('Failed to remove look from bundle:', err);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleDownloadBundleZip = async (filterId: string) => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const zipFolderName = `glam_jobs_${bundle.id.slice(0, 8)}`;
      const glamJobs = zip.folder(zipFolderName)!;
      const { applyFilter } = filterId !== 'none' ? await import('@/lib/photo-filters') : { applyFilter: null };

      for (let i = 0; i < orderedLooks.length; i++) {
        const look = orderedLooks[i];
        const num = String(i + 1).padStart(3, '0');
        const title = look.title || `look_${i + 1}`;
        const folder = glamJobs.folder(`${num}_${title}`)!;

        const proxyUrl = `/api/media/download?url=${encodeURIComponent(look.image_url)}`;
        const res = await fetch(proxyUrl);
        const blob = await res.blob();

        if (filterId === 'none' || !applyFilter) {
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          folder.file(`image.${ext}`, blob);
        } else {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.src = URL.createObjectURL(blob);
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          URL.revokeObjectURL(img.src);
          const filtered = await applyFilter(base64, filterId as any);
          const filteredBlob = await fetch(filtered).then(r => r.blob());
          folder.file('image.png', filteredBlob);
        }

        // Include prompt.txt for glam ai uploader compatibility
        const prompt = look.video_prompt_veo || '';
        folder.file('prompt.txt', prompt);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glam_jobs_${bundle.id.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Bundle ZIP download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadGlamJobsZip = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      const zipFolderName = `glam_jobs_${bundle.id.slice(0, 8)}`;
      const glamJobs = zip.folder(zipFolderName)!;

      for (let i = 0; i < orderedLooks.length; i++) {
        const look = orderedLooks[i];
        const num = String(i + 1).padStart(3, '0');
        const title = look.title || `look_${i + 1}`;
        const folderName = `${num}_${title}`;
        const folder = glamJobs.folder(folderName)!;

        const response = await fetch(look.image_url);
        const imageBlob = await response.blob();
        const ext = imageBlob.type === 'image/png' ? 'png' : 'jpg';
        folder.file(`image.${ext}`, imageBlob);

        const prompt = look.video_prompt_veo || '';
        folder.file('prompt.txt', prompt);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `glam_jobs_${bundle.id.slice(0, 8)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Glam Jobs ZIP download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedLooks.findIndex((l) => l.id === active.id);
    const newIndex = orderedLooks.findIndex((l) => l.id === over.id);
    const newOrder = arrayMove(orderedLooks, oldIndex, newIndex);
    setOrderedLooks(newOrder);
    onReorder(bundle.id, newOrder.map(l => l.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-line)]">
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-[var(--color-accent)]" />
            <h2 className="text-base font-bold text-[var(--color-title-active)]">
              {ja ? `バンドル (${orderedLooks.length}枚)` : `Bundle (${orderedLooks.length} looks)`}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowAddPicker(!showAddPicker)}
              className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
              title={ja ? 'カードを追加' : 'Add card'}
            >
              <Plus size={18} className="text-[var(--color-text-label)]" />
            </button>
            <div className="relative">
              <button
                onClick={() => setBundleDownloadFilterOpen(prev => !prev)}
                disabled={isDownloading}
                className="flex items-center gap-0.5 p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors disabled:opacity-50"
                title={ja ? 'バンドルをダウンロード' : 'Download bundle'}
              >
                {isDownloading
                  ? <Loader2 size={18} className="animate-spin text-[var(--color-text-label)]" />
                  : <Download size={18} className="text-[var(--color-text-label)]" />
                }
                <ChevronDown size={12} className="text-[var(--color-text-label)]" />
              </button>
              {bundleDownloadFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBundleDownloadFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-xl border border-[var(--color-line)] py-1 min-w-[150px]">
                    {([
                      { id: 'none' as const, label: 'Original' },
                      { id: 'natural' as const, label: 'Natural' },
                      { id: 'film' as const, label: 'Film' },
                      { id: 'chrome' as const, label: 'Chrome' },
                      { id: 'polaroid' as const, label: 'Polaroid' },
                      { id: 'polaroidDusk' as const, label: 'Polaroid Dusk' },
                      { id: 'polaroidBlue' as const, label: 'Polaroid Blue' },
                    ]).map((f) => (
                      <button
                        key={f.id}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors flex items-center gap-2"
                        onClick={() => {
                          setBundleDownloadFilterOpen(false);
                          handleDownloadBundleZip(f.id);
                        }}
                      >
                        <Download size={12} className="text-[var(--color-text-label)]" />
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </div>

        {/* Add card picker */}
        {showAddPicker && (
          <div className="border-b border-[var(--color-line)] p-4 bg-[var(--color-bg-element)]">
            <p className="text-xs font-medium text-[var(--color-text-label)] mb-2">
              {ja ? '追加するカードを選択' : 'Select a card to add'}
            </p>
            {unbundledLooks.length === 0 ? (
              <p className="text-xs text-[var(--color-text-label)]">
                {ja ? 'バンドルに追加可能なカードがありません' : 'No available cards to add'}
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {unbundledLooks.map(look => (
                  <button
                    key={look.id}
                    onClick={() => handleAddLook(look.id)}
                    disabled={isAdding !== null}
                    className="relative group rounded-lg overflow-hidden border border-[var(--color-line)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
                  >
                    <div className="aspect-[3/4] bg-[var(--color-bg-element)]">
                      <img src={look.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    {isAdding === look.id && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Loader2 size={16} className="animate-spin text-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <Plus size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="p-5">
          <p className="text-xs text-[var(--color-text-label)] mb-3">
            {ja ? 'ドラッグで順番を変更。クリックで詳細表示。' : 'Drag to reorder. Click for details.'}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedLooks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedLooks.map((look, idx) => (
                  <SortableBundleLookItem
                    key={look.id}
                    look={look}
                    index={idx}
                    onClick={() => onClickLook(look)}
                    onRemove={() => handleRemoveLook(look.id)}
                    isRemoving={isRemoving === look.id}
                    locale={locale}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

function SortableBundleLookItem({
  look,
  index,
  onClick,
  onRemove,
  isRemoving,
  locale,
}: {
  look: CollectionLook;
  index: number;
  onClick: () => void;
  onRemove: () => void;
  isRemoving: boolean;
  locale: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: look.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : isRemoving ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white border border-[var(--color-line)] rounded-lg p-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-[var(--color-text-label)]"
      >
        <GripVertical size={16} />
      </button>
      <span className="text-xs font-medium text-[var(--color-text-label)] w-5">{index + 1}</span>
      <div className="w-14 h-14 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0 flex items-center justify-center cursor-pointer" onClick={onClick}>
        <img src={look.image_url} alt="" className="max-w-full max-h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
          {look.title || (locale === 'ja' ? 'タイトル未設定' : 'No title')}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        disabled={isRemoving}
        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        title={locale === 'ja' ? 'バンドルから外す' : 'Remove from bundle'}
      >
        {isRemoving ? (
          <Loader2 size={14} className="animate-spin text-[var(--color-text-label)]" />
        ) : (
          <X size={14} className="text-[var(--color-text-label)] hover:text-red-500" />
        )}
      </button>
    </div>
  );
}

export default function CollectionPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const {
    looks, items, isLoading,
    addLook, updateLook, deleteLook, deleteBundle, bulkDeleteLooks, reorderLooks,
    createBundle, mergeBundles, disbandBundle, addToBundle, removeFromBundle, reorderBundleLooks,
  } = useCollection();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLook, setSelectedLook] = useState<CollectionLook | null>(null);
  const [selectedLookBundleLooks, setSelectedLookBundleLooks] = useState<CollectionLook[] | undefined>(undefined);
  const [selectedBundle, setSelectedBundle] = useState<{ id: string; looks: CollectionLook[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [isBundling, setIsBundling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keep selectedBundle in sync with looks data (after add/remove operations)
  useEffect(() => {
    if (!selectedBundle) return;
    const bundleItem = items.find(
      (item) => item.type === 'bundle' && item.bundle.id === selectedBundle.id
    );
    if (bundleItem && bundleItem.type === 'bundle') {
      setSelectedBundle(bundleItem.bundle);
    } else {
      // Bundle was disbanded (removed)
      setSelectedBundle(null);
    }
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectBundle = (bundleId: string) => {
    setSelectedBundleIds(prev => {
      const next = new Set(prev);
      if (next.has(bundleId)) next.delete(bundleId);
      else next.add(bundleId);
      return next;
    });
  };

  const handleCreateBundle = async () => {
    if (selectedIds.size < 2 && selectedBundleIds.size === 0) return;
    setIsBundling(true);
    try {
      if (selectedBundleIds.size > 0) {
        // Merge: bundles + any selected single looks
        await mergeBundles(Array.from(selectedBundleIds), Array.from(selectedIds));
      } else {
        await createBundle(Array.from(selectedIds));
      }
      setSelectedIds(new Set());
      setSelectedBundleIds(new Set());
    } catch (err) {
      console.error('Bundle creation/merge failed:', err);
    } finally {
      setIsBundling(false);
    }
  };

  const handleBulkDelete = async () => {
    const lookIdsToDelete = Array.from(selectedIds);
    // Also collect all look IDs from selected bundles
    for (const bundleId of selectedBundleIds) {
      const bundleItem = items.find(i => i.type === 'bundle' && i.bundle.id === bundleId);
      if (bundleItem && bundleItem.type === 'bundle') {
        for (const look of bundleItem.bundle.looks) {
          if (!lookIdsToDelete.includes(look.id)) {
            lookIdsToDelete.push(look.id);
          }
        }
      }
    }
    if (lookIdsToDelete.length === 0) return;

    const msg = ja
      ? `${lookIdsToDelete.length}件のルックを削除しますか？`
      : `Delete ${lookIdsToDelete.length} looks?`;
    if (!confirm(msg)) return;

    setIsDeleting(true);
    try {
      await bulkDeleteLooks(lookIdsToDelete);
      setSelectedIds(new Set());
      setSelectedBundleIds(new Set());
    } catch (err) {
      console.error('Bulk delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalSelected = selectedIds.size + selectedBundleIds.size;

  // Build sortable IDs for DnD — singles use look.id, bundles use bundle-{id}
  const sortableIds = items.map(item =>
    item.type === 'single' ? item.look.id : `bundle-${item.bundle.id}`
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    // Get all look IDs in order (expanding bundles)
    const reorderedItems = arrayMove(items, oldIndex, newIndex);
    const newLookOrder: string[] = [];
    for (const item of reorderedItems) {
      if (item.type === 'single') {
        newLookOrder.push(item.look.id);
      } else {
        for (const look of item.bundle.looks) {
          newLookOrder.push(look.id);
        }
      }
    }
    reorderLooks(newLookOrder);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-[var(--color-text-label)]">
            {ja ? 'AIで生成したルック画像をキュレーションしてショップフロントに表示' : 'Curate AI-generated look images for your storefront'}
          </p>
          {looks.length > 0 && (
            <p className="text-xs text-[var(--color-text-label)] mt-1">
              {looks.length} {ja ? 'ルック' : 'looks'}
            </p>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          {ja ? 'ルックを追加' : 'Add Look'}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      ) : looks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-element)] flex items-center justify-center mb-4">
            <Layers size={28} className="text-[var(--color-text-label)]" />
          </div>
          <h3 className="text-base font-medium text-[var(--color-title-active)] mb-2">
            {ja ? 'まだルックがありません' : 'No looks yet'}
          </h3>
          <p className="text-sm text-[var(--color-text-label)] max-w-sm">
            {ja
              ? 'VUALスタジオで生成した画像をコレクションに追加しましょう'
              : 'Add images generated in VUAL Studio to your collection'}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => {
                if (item.type === 'bundle') {
                  return (
                    <BundleCard
                      key={`bundle-${item.bundle.id}`}
                      bundle={item.bundle}
                      onClick={() => setSelectedBundle(item.bundle)}
                      onDisband={disbandBundle}
                      onDelete={deleteBundle}
                      locale={locale}
                      isSelected={selectedBundleIds.has(item.bundle.id)}
                      onToggleSelect={toggleSelectBundle}
                    />
                  );
                }
                return (
                  <SortableLookCard
                    key={item.look.id}
                    look={item.look}
                    onDelete={deleteLook}
                    onClick={() => setSelectedLook(item.look)}
                    locale={locale}
                    isSelected={selectedIds.has(item.look.id)}
                    onToggleSelect={toggleSelect}
                    isBundled={false}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Floating action bar */}
      {totalSelected >= 1 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          {/* Bundle / Merge button — show when 2+ items selected, or 1+ bundles selected */}
          {(selectedIds.size + selectedBundleIds.size >= 2 || (selectedBundleIds.size >= 1 && selectedIds.size >= 1)) && (
            <button
              onClick={handleCreateBundle}
              disabled={isBundling}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white text-sm font-medium rounded-full shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isBundling ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
              {selectedBundleIds.size > 0
                ? (ja ? `${totalSelected}件を合体` : `Merge ${totalSelected} items`)
                : (ja ? `${selectedIds.size}枚をバンドル化` : `Bundle ${selectedIds.size} looks`)}
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-full shadow-lg hover:bg-red-600 disabled:opacity-50 transition-all"
          >
            {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {ja ? `${totalSelected}件を削除` : `Delete ${totalSelected}`}
          </button>
        </div>
      )}

      {/* Add Look Modal */}
      <AddLookModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={addLook}
      />

      {/* Look Detail Modal */}
      {selectedLook && (
        <LookDetailModal
          key={selectedLook.id}
          look={selectedLook}
          onClose={() => { setSelectedLook(null); setSelectedLookBundleLooks(undefined); }}
          onSave={async (id, updates) => {
            await updateLook(id, updates);
            setSelectedLook(prev => prev ? { ...prev, ...updates } : null);
          }}
          locale={locale}
          bundleLooks={selectedLookBundleLooks}
          onNavigate={(nextLook) => {
            setSelectedLook(nextLook);
          }}
        />
      )}

      {/* Bundle Detail Modal */}
      {selectedBundle && (
        <BundleDetailModal
          bundle={selectedBundle}
          onClose={() => setSelectedBundle(null)}
          onClickLook={(look) => {
            const bundleLooks = selectedBundle.looks;
            setSelectedBundle(null);
            setSelectedLookBundleLooks(bundleLooks);
            setSelectedLook(look);
          }}
          onReorder={reorderBundleLooks}
          onAddToBundle={async (bundleId, lookId) => {
            await addToBundle(bundleId, lookId);
          }}
          onRemoveFromBundle={async (bundleId, lookId) => {
            const result = await removeFromBundle(bundleId, lookId);
            return result;
          }}
          unbundledLooks={looks.filter(l => !l.bundle_id)}
          locale={locale}
        />
      )}
    </div>
  );
}
