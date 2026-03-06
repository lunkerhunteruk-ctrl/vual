'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Plus, Trash2, GripVertical, Layers, Loader2, X, Check, Download, Link2, Unlink, ChevronLeft, ChevronRight, ChevronDown, Copy, Video, RefreshCw } from 'lucide-react';
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
}: {
  bundle: { id: string; looks: CollectionLook[] };
  onClick: () => void;
  onDisband: (bundleId: string) => void;
  onDelete: (bundleId: string, lookIds: string[]) => void;
  locale: string;
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
      className="border-2 border-[var(--color-accent)] rounded-xl p-3 bg-[var(--color-accent)]/5 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-3">
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
  onRegenerate,
  locale,
  bundleLooks,
  onNavigate,
}: {
  look: CollectionLook;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; description?: string; show_credits?: boolean; video_prompt_veo?: string; video_prompt_kling?: string; telop_caption_ja?: string; telop_caption_en?: string; shot_duration_sec?: number }) => Promise<void>;
  onRegenerate?: (lookId: string, customPrompt: string) => Promise<{ success: boolean; newImageUrl?: string; copy?: any }>;
  locale: string;
  bundleLooks?: CollectionLook[];
  onNavigate?: (look: CollectionLook) => void;
}) {
  const ja = locale === 'ja';
  const store = useStoreContext((s) => s.store);
  const isDevStore = store?.slug === 'vualofficial';
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
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenImageUrl, setRegenImageUrl] = useState<string | null>(null);
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
            {onRegenerate && (
              <button
                onClick={() => setShowRegenPrompt(!showRegenPrompt)}
                disabled={isRegenerating}
                className="p-1.5 hover:bg-[var(--color-accent)]/5 rounded-lg transition-colors disabled:opacity-50"
                title={ja ? '再生成' : 'Regenerate'}
              >
                <RefreshCw size={18} className={`text-[var(--color-text-label)] ${isRegenerating ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              onClick={async () => {
                try {
                  const response = await fetch(look.image_url);
                  const blob = await response.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = `look-${look.id}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(blobUrl);
                } catch (err) {
                  console.error('Download failed:', err);
                }
              }}
              className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
              title={ja ? 'ダウンロード' : 'Download'}
            >
              <Download size={18} className="text-[var(--color-text-label)]" />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Image with bundle navigation arrows */}
          <div className="relative rounded-xl overflow-hidden bg-[var(--color-bg-element)] flex items-center justify-center">
            <img src={regenImageUrl || look.image_url} alt="" className="max-w-full max-h-[400px] object-contain" />
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

          {/* Regenerate section */}
          {onRegenerate && (
            <div>
              {!showRegenPrompt ? (
                <button
                  onClick={() => setShowRegenPrompt(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-colors"
                >
                  <RefreshCw size={14} />
                  {ja ? 'このルックを再生成' : 'Regenerate this look'}
                </button>
              ) : (
                <div className="border border-[var(--color-accent)]/30 rounded-xl p-3 bg-[var(--color-accent)]/[0.02] space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <RefreshCw size={14} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wide">
                      {ja ? '再生成' : 'Regenerate'}
                    </span>
                  </div>
                  <textarea
                    value={regenPrompt}
                    onChange={(e) => setRegenPrompt(e.target.value)}
                    placeholder={ja
                      ? '追加指示（例: レザージャケットはシンプルなデザイン、装飾なし）'
                      : 'Additional instructions (e.g., simple leather jacket, no decorations)'}
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-[var(--color-line)] rounded-lg text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] resize-none focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setIsRegenerating(true);
                        try {
                          const result = await onRegenerate(look.id, regenPrompt);
                          if (result.success && result.newImageUrl) {
                            setRegenImageUrl(result.newImageUrl);
                            // Update local state with new copy data
                            if (result.copy) {
                              if (result.copy.title) setTitle(result.copy.title);
                              if (result.copy.description) setDescription(result.copy.description);
                              if (result.copy.video_prompt_veo) setVideoPromptVeo(result.copy.video_prompt_veo);
                              if (result.copy.video_prompt_kling) setVideoPromptKling(result.copy.video_prompt_kling);
                              if (result.copy.telop_caption_ja) setTelopCaptionJa(result.copy.telop_caption_ja);
                              if (result.copy.telop_caption_en) setTelopCaptionEn(result.copy.telop_caption_en);
                              if (result.copy.shot_duration_sec) setShotDuration(result.copy.shot_duration_sec);
                            }
                            setShowRegenPrompt(false);
                            setRegenPrompt('');
                          } else {
                            alert(result.error || 'Regeneration failed');
                          }
                        } catch (err) {
                          console.error('Regeneration failed:', err);
                          alert('Regeneration request failed');
                        } finally {
                          setIsRegenerating(false);
                        }
                      }}
                      disabled={isRegenerating}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {isRegenerating ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          {ja ? '再生成中...' : 'Regenerating...'}
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          {ja ? '再生成する（1cr）' : 'Regenerate (1cr)'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowRegenPrompt(false);
                        setRegenPrompt('');
                      }}
                      className="px-3 py-2 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
                    >
                      {ja ? 'キャンセル' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
  onRegenerate,
  locale,
}: {
  bundle: { id: string; looks: CollectionLook[] };
  onClose: () => void;
  onClickLook: (look: CollectionLook) => void;
  onReorder: (bundleId: string, lookIds: string[]) => void;
  onRegenerate?: (lookId: string, customPrompt: string) => Promise<{ success: boolean; newImageUrl?: string; copy?: any }>;
  locale: string;
}) {
  const ja = locale === 'ja';
  const [orderedLooks, setOrderedLooks] = useState(bundle.looks);
  const store = useStoreContext((s) => s.store);
  const isDevStore = store?.slug === 'vualofficial';

  const handleDownloadRemotionJson = () => {
    let cumulativeTime = 0;
    const shots = orderedLooks.map((look, idx) => {
      const duration = look.shot_duration_sec || 6;
      const shot = {
        shot: idx + 1,
        title_ja: look.title || '',
        caption_ja: look.telop_caption_ja || '',
        caption_en: look.telop_caption_en || '',
        image_url: look.image_url,
        shot_duration_sec: duration,
        video_prompt_veo: look.video_prompt_veo || '',
        video_prompt_kling: look.video_prompt_kling || '',
        timing: {
          startSec: cumulativeTime,
          durationSec: duration,
          telop: {
            startSec: cumulativeTime + 0.5,
            durationSec: Math.min(3, duration - 1.5),
            fadeInSec: 0.3,
            fadeOutSec: 0.5,
          },
        },
        products: look.collection_look_products?.map(lp => ({
          name: lp.products?.name || '',
          brand: lp.products?.brand || '',
          price: lp.products?.base_price || 0,
          currency: lp.products?.currency || 'JPY',
        })) || [],
      };
      cumulativeTime += duration;
      return shot;
    });

    const payload = {
      bundle_id: bundle.id,
      total_shots: shots.length,
      total_duration_sec: cumulativeTime,
      shots,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remotion-bundle-${bundle.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
              {ja ? `バンドル (${bundle.looks.length}枚)` : `Bundle (${bundle.looks.length} looks)`}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {isDevStore && (
              <button
                onClick={handleDownloadRemotionJson}
                className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors"
                title={ja ? 'Remotion JSON をダウンロード' : 'Download Remotion JSON'}
              >
                <Download size={18} className="text-[var(--color-text-label)]" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
              <X size={20} className="text-[var(--color-text-label)]" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs text-[var(--color-text-label)] mb-3">
            {ja ? 'ドラッグで順番を変更。クリックで詳細表示。' : 'Drag to reorder. Click for details.'}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedLooks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedLooks.map((look, idx) => (
                  <SortableBundleLookItem key={look.id} look={look} index={idx} onClick={() => onClickLook(look)} onRegenerate={onRegenerate} locale={locale} />
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
  onRegenerate,
  locale,
}: {
  look: CollectionLook;
  index: number;
  onClick: () => void;
  onRegenerate?: (lookId: string, customPrompt: string) => Promise<{ success: boolean; newImageUrl?: string; copy?: any }>;
  locale: string;
}) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState(look.image_url);
  const [localTitle, setLocalTitle] = useState(look.title);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: look.id,
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
        <img src={localImageUrl} alt="" className="max-w-full max-h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className="text-sm font-medium text-[var(--color-title-active)] truncate">
          {localTitle || (locale === 'ja' ? 'タイトル未設定' : 'No title')}
        </p>
      </div>
      {onRegenerate && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setIsRegenerating(true);
            try {
              const result = await onRegenerate(look.id, '');
              if (result.success && result.newImageUrl) {
                setLocalImageUrl(result.newImageUrl);
                if (result.copy?.title) setLocalTitle(result.copy.title);
              } else {
                alert(result.error || 'Regeneration failed');
              }
            } catch (err) {
              console.error('Regenerate failed:', err);
              alert('Regeneration request failed');
            } finally {
              setIsRegenerating(false);
            }
          }}
          disabled={isRegenerating}
          className="p-1.5 text-[var(--color-text-label)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
          title={locale === 'ja' ? '再生成' : 'Regenerate'}
        >
          <RefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}

export default function CollectionPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const {
    looks, items, isLoading,
    addLook, updateLook, deleteLook, deleteBundle, reorderLooks,
    createBundle, disbandBundle, reorderBundleLooks,
    regenerateLook,
  } = useCollection();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLook, setSelectedLook] = useState<CollectionLook | null>(null);
  const [selectedLookBundleLooks, setSelectedLookBundleLooks] = useState<CollectionLook[] | undefined>(undefined);
  const [selectedBundle, setSelectedBundle] = useState<{ id: string; looks: CollectionLook[] } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBundling, setIsBundling] = useState(false);

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

  const handleCreateBundle = async () => {
    if (selectedIds.size < 2) return;
    setIsBundling(true);
    try {
      await createBundle(Array.from(selectedIds));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bundle creation failed:', err);
    } finally {
      setIsBundling(false);
    }
  };

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

      {/* Floating bundle action bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleCreateBundle}
            disabled={isBundling}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-accent)] text-white text-sm font-medium rounded-full shadow-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {isBundling ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {ja
              ? `${selectedIds.size}枚をバンドル化`
              : `Bundle ${selectedIds.size} looks`}
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
          onRegenerate={async (lookId, customPrompt) => {
            const result = await regenerateLook(lookId, customPrompt);
            // Update selectedLook with new data so modal reflects changes
            if (result.success && result.newImageUrl) {
              setSelectedLook(prev => prev ? {
                ...prev,
                image_url: result.newImageUrl!,
                ...(result.copy?.title && { title: result.copy.title }),
                ...(result.copy?.description && { description: result.copy.description }),
                ...(result.copy?.video_prompt_veo && { video_prompt_veo: result.copy.video_prompt_veo }),
                ...(result.copy?.video_prompt_kling && { video_prompt_kling: result.copy.video_prompt_kling }),
                ...(result.copy?.telop_caption_ja && { telop_caption_ja: result.copy.telop_caption_ja }),
                ...(result.copy?.telop_caption_en && { telop_caption_en: result.copy.telop_caption_en }),
                ...(result.copy?.shot_duration_sec && { shot_duration_sec: result.copy.shot_duration_sec }),
              } : null);
            }
            return result;
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
          onRegenerate={regenerateLook}
          locale={locale}
        />
      )}
    </div>
  );
}
