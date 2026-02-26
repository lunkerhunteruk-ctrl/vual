'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Camera, X, Download, Plus, Loader2, CheckCircle, ChevronDown, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  TouchSensor,
  MouseSensor,
  useSensors,
  useSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTryOnStore, type TryOnListItem } from '@/lib/store/tryon';
import { VTON_SLOTS } from '@/lib/utils/vton-category';
import { PortraitCapture, CreditStatusBar, CreditPurchaseSheet } from '@/components/customer/tryon';

// --- DnD sub-components ---

function DraggablePoolItem({ item, isAssigned, isSelected, onTap }: {
  item: TryOnListItem;
  isAssigned: boolean;
  isSelected: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pool-${item.productId}`,
    data: { item, source: 'pool' },
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onTap}
      className={`shrink-0 w-16 flex flex-col items-center cursor-grab active:cursor-grabbing ${
        isSelected ? 'ring-2 ring-[var(--color-accent)] rounded-lg' : ''
      }`}
    >
      <div className={`relative w-16 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
        isAssigned ? 'border-[var(--color-accent)] opacity-60' : 'border-[var(--color-line)]'
      }`}>
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        <div className="absolute top-0.5 left-0.5">
          <GripVertical size={12} className="text-white drop-shadow" />
        </div>
      </div>
      <p className="text-[9px] text-[var(--color-text-label)] mt-1 text-center truncate w-full">{item.name}</p>
    </div>
  );
}

function DroppableSlot({ slotId, children, isOver }: {
  slotId: string;
  children: React.ReactNode;
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: dndIsOver } = useDroppable({ id: `slot-${slotId}` });
  const highlighted = isOver || dndIsOver;

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${highlighted ? 'scale-[1.03]' : ''}`}
    >
      {children}
    </div>
  );
}

function DraggableSlotItem({ item, slotId }: { item: TryOnListItem; slotId: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `slot-${slotId}`,
    data: { item, source: 'slot', slotId },
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
    </div>
  );
}

function DragPreview({ item }: { item: TryOnListItem }) {
  return (
    <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-[var(--color-accent)] shadow-xl bg-white">
      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
    </div>
  );
}

// --- Style options for garment types ---
function getStyleOptions(subCategory?: string): { key: string; labelJa: string; labelEn: string; options: { value: string; labelJa: string; labelEn: string }[] } | null {
  if (subCategory === 'tops') {
    return {
      key: 'tucking',
      labelJa: '裾',
      labelEn: 'Hem',
      options: [
        { value: 'out', labelJa: 'アウト', labelEn: 'Out' },
        { value: 'in', labelJa: 'イン', labelEn: 'In' },
      ],
    };
  }
  if (subCategory === 'outer') {
    return {
      key: 'front',
      labelJa: 'フロント',
      labelEn: 'Front',
      options: [
        { value: 'closed', labelJa: 'クローズ', labelEn: 'Closed' },
        { value: 'open', labelJa: 'オープン', labelEn: 'Open' },
      ],
    };
  }
  return null;
}

function buildStylePrompt(styleOptions: Record<string, Record<string, string>>): string {
  const parts: string[] = [];
  for (const [, options] of Object.entries(styleOptions)) {
    if (options.tucking === 'in') parts.push('The top is neatly tucked into the pants/skirt');
    if (options.tucking === 'out') parts.push('The top is worn untucked, hanging naturally');
    if (options.front === 'open') parts.push('The jacket/coat front is open, showing the inner top');
    if (options.front === 'closed') parts.push('The jacket/coat is buttoned/zipped closed');
  }
  return parts.join('. ');
}

// --- Main Page ---
export default function TryOnPage() {
  const locale = useLocale();
  const isJa = locale === 'ja';
  const {
    portraits,
    results,
    removePortrait,
    credits,
    loadCredits,
    tryOnPool,
    tryOnSlots,
    removeFromPool,
    clearPool,
    assignToSlot,
    unassignSlot,
    swapSlots,
    modelGender,
    modelHeight,
    setModelGender,
    setModelHeight,
    addResult,
  } = useTryOnStore();

  const [showCapture, setShowCapture] = useState(false);
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedPortraitId, setSelectedPortraitId] = useState<string | null>(null);

  // Try-on execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<string | null>(null);

  // DnD state
  const [activeItem, setActiveItem] = useState<TryOnListItem | null>(null);
  // Tap-to-assign fallback
  const [selectedPoolItemId, setSelectedPoolItemId] = useState<string | null>(null);
  // Style options per slot
  const [styleOptions, setStyleOptions] = useState<Record<string, Record<string, string>>>({});

  const slotItems = Object.values(tryOnSlots).filter(Boolean) as TryOnListItem[];
  const slotCount = slotItems.length;
  const selectedPortrait = portraits.find((p) => p.id === selectedPortraitId);
  const canStartTryOn = slotCount > 0 && selectedPortrait && !isProcessing;

  // Assigned product IDs (for dimming in pool)
  const assignedIds = new Set(slotItems.map((i) => i.productId));

  // DnD sensors
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(touchSensor, mouseSensor);

  useEffect(() => {
    const lineUserId =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('lineUserId') ||
          localStorage.getItem('vual-line-user-id')
        : null;
    if (lineUserId) {
      loadCredits(lineUserId);
    }
  }, [loadCredits]);

  useEffect(() => {
    if (!selectedPortraitId && portraits.length > 0) {
      setSelectedPortraitId(portraits[0].id);
    }
  }, [portraits, selectedPortraitId]);

  const toBase64 = async (url: string): Promise<string> => {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  // DnD handlers
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.item) setActiveItem(data.item);
    setSelectedPoolItemId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const isFromPool = activeId.startsWith('pool-');
    const isFromSlot = activeId.startsWith('slot-');
    const isToSlot = overId.startsWith('slot-');
    const isToPool = overId === 'pool';

    if (isFromPool && isToSlot) {
      const item = active.data.current?.item;
      const targetSlotId = overId.replace('slot-', '');
      if (item) assignToSlot(targetSlotId, item);
    } else if (isFromSlot && isToSlot) {
      const fromSlotId = activeId.replace('slot-', '');
      const toSlotId = overId.replace('slot-', '');
      if (fromSlotId !== toSlotId) swapSlots(fromSlotId, toSlotId);
    } else if (isFromSlot && isToPool) {
      const slotId = activeId.replace('slot-', '');
      unassignSlot(slotId);
    }
  };

  // Tap-to-assign
  const handlePoolItemTap = (item: TryOnListItem) => {
    setSelectedPoolItemId(selectedPoolItemId === item.productId ? null : item.productId);
  };

  const handleSlotTap = (slotId: string) => {
    if (selectedPoolItemId) {
      const item = tryOnPool.find((p) => p.productId === selectedPoolItemId);
      if (item) {
        assignToSlot(slotId, item);
        setSelectedPoolItemId(null);
      }
    }
  };

  // Style option change
  const updateStyleOption = (slotId: string, key: string, value: string) => {
    setStyleOptions((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], [key]: value },
    }));
  };

  // Try-on execution
  const handleTryOn = async () => {
    if (!selectedPortrait || slotCount === 0) return;

    setIsProcessing(true);
    setTryOnError(null);
    setLatestResult(null);
    setProcessingStatus(isJa ? '画像を準備中...' : 'Preparing images...');

    try {
      const items = slotItems;
      const personImage = await toBase64(selectedPortrait.dataUrl);
      const lineUserId =
        typeof window !== 'undefined' ? localStorage.getItem('vual-line-user-id') || undefined : undefined;

      const slotOrder = ['upper_body', 'lower_body', 'footwear'] as const;
      const garmentSlots: string[][] = [[], [], []];
      for (const slotKey of slotOrder) {
        const item = tryOnSlots[slotKey];
        if (item) {
          const idx = slotOrder.indexOf(slotKey);
          garmentSlots[idx].push(await toBase64(item.image));
        }
      }

      const nonEmpty = garmentSlots.map((imgs) => ({ imgs })).filter((s) => s.imgs.length > 0);
      if (nonEmpty.length === 0) throw new Error('No garment images');

      setProcessingStatus(isJa ? 'AI生成中...' : 'AI generating...');

      // Build style prompt
      const stylePrompt = buildStylePrompt(styleOptions);

      const res = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImages: nonEmpty[0]?.imgs || [],
          secondGarmentImages: nonEmpty[1]?.imgs || [],
          thirdGarmentImages: nonEmpty[2]?.imgs || [],
          modelImage: personImage,
          modelSettings: {
            gender: modelGender,
            height: modelHeight,
            ethnicity: 'japanese',
            pose: 'standing',
          },
          background: 'studioWhite',
          aspectRatio: '3:4',
          lineUserId,
          customPrompt: stylePrompt || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errorCode === 'INSUFFICIENT_CREDITS') {
          setIsProcessing(false);
          setProcessingStatus('');
          setShowPurchase(true);
          return;
        }
        throw new Error(data.error || 'Generation failed');
      }

      if (data.success && data.images?.[0]) {
        const resultImage = data.images[0];
        const garmentNames = items.map((i) => i.name).join(' + ');
        addResult({
          id: `outfit-${Date.now()}`,
          portraitId: selectedPortrait.id,
          garmentName: garmentNames,
          resultImage,
          createdAt: new Date().toISOString(),
        });
        setLatestResult(resultImage);
      } else {
        throw new Error(data.error || (isJa ? '画像生成に失敗しました' : 'Image generation failed'));
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (isJa ? 'エラーが発生しました' : 'An error occurred');
      setTryOnError(message);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="px-4 py-6 pb-24">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mx-auto mb-4">
          <Sparkles size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--color-title-active)] mb-2">
          {isJa ? 'バーチャル試着' : 'Virtual Try-On'}
        </h1>
        <p className="text-sm text-[var(--color-text-body)]">
          {isJa ? 'アイテムをスロットに配置して試着' : 'Drag items into slots to try on'}
        </p>
      </motion.div>

      {/* Credit Status */}
      {credits && (
        <div className="mb-6">
          <CreditStatusBar
            freeTickets={credits.freeTickets}
            paidCredits={credits.paidCredits}
            subscriptionCredits={credits.subscriptionCredits}
            isSubscribed={credits.isSubscribed}
            onBuyCredits={() => setShowPurchase(true)}
          />
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Pool Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
              {isJa ? '試着リスト' : 'Try-On List'}
            </h2>
            {tryOnPool.length > 0 && (
              <button onClick={clearPool} className="text-xs text-[var(--color-text-label)] hover:text-[var(--color-text-body)]">
                {isJa ? 'クリア' : 'Clear'}
              </button>
            )}
          </div>
          {tryOnPool.length > 0 ? (
            <PoolDropZone>
              <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4">
                {tryOnPool.map((item) => (
                  <div key={item.productId} className="relative">
                    <DraggablePoolItem
                      item={item}
                      isAssigned={assignedIds.has(item.productId)}
                      isSelected={selectedPoolItemId === item.productId}
                      onTap={() => handlePoolItemTap(item)}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromPool(item.productId); }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center z-10"
                    >
                      <X size={8} className="text-white" />
                    </button>
                  </div>
                ))}
                <Link
                  href={`/${locale}/search`}
                  className="shrink-0 w-16 h-20 rounded-lg border-2 border-dashed border-[var(--color-line)] flex items-center justify-center hover:border-[var(--color-accent)] transition-colors"
                >
                  <Plus size={18} className="text-[var(--color-text-label)]" />
                </Link>
              </div>
            </PoolDropZone>
          ) : (
            <Link
              href={`/${locale}/search`}
              className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] hover:border-[var(--color-accent)] transition-colors"
            >
              <Plus size={16} className="text-[var(--color-text-label)]" />
              <span className="text-xs text-[var(--color-text-label)]">
                {isJa ? '商品を追加' : 'Add items'}
              </span>
            </Link>
          )}
          {selectedPoolItemId && (
            <p className="text-[10px] text-[var(--color-accent)] mt-1 text-center animate-pulse">
              {isJa ? 'スロットをタップして配置' : 'Tap a slot to place'}
            </p>
          )}
        </motion.div>

        {/* Coordinate Slots */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6">
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
            {isJa ? 'コーディネート' : 'Coordinate'}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {VTON_SLOTS.map((slot) => {
              const item = tryOnSlots[slot.id];
              const styleOption = item ? getStyleOptions(item.subCategory) : null;
              return (
                <div key={slot.id} className="flex flex-col items-center">
                  <DroppableSlot slotId={slot.id} isOver={!!selectedPoolItemId}>
                    {item ? (
                      <div
                        className="relative w-full aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden border-2 border-[var(--color-accent)] bg-[var(--color-bg-element)]"
                        onClick={() => handleSlotTap(slot.id)}
                      >
                        <DraggableSlotItem item={item} slotId={slot.id} />
                        <button
                          onClick={(e) => { e.stopPropagation(); unassignSlot(slot.id); }}
                          className="absolute top-1 right-1 p-1 bg-black/50 rounded-full z-10"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleSlotTap(slot.id)}
                        className={`w-full aspect-[3/4] rounded-[var(--radius-md)] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                          selectedPoolItemId
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 animate-pulse'
                            : 'border-[var(--color-line)]'
                        }`}
                      >
                        <Plus size={24} className="text-[var(--color-text-label)]" />
                      </div>
                    )}
                  </DroppableSlot>
                  <p className="text-[10px] text-[var(--color-text-label)] mt-1.5 text-center truncate w-full">
                    {item ? item.name : (isJa ? slot.labelJa : slot.labelEn)}
                  </p>
                  {/* Style option toggle */}
                  {item && styleOption && (
                    <div className="flex gap-0.5 mt-1">
                      {styleOption.options.map((opt) => {
                        const current = styleOptions[slot.id]?.[styleOption.key] || styleOption.options[0].value;
                        const isActive = current === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => updateStyleOption(slot.id, styleOption.key, opt.value)}
                            className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors ${
                              isActive
                                ? 'bg-[var(--color-accent)] text-white'
                                : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)]'
                            }`}
                          >
                            {isJa ? opt.labelJa : opt.labelEn}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Drag Overlay */}
        <DragOverlay>{activeItem ? <DragPreview item={activeItem} /> : null}</DragOverlay>
      </DndContext>

      {/* Portrait Selection */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          {isJa ? '写真を選択' : 'Select Photo'}
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setShowCapture(true)}
            className="shrink-0 w-20 h-28 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] flex flex-col items-center justify-center gap-1.5 hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
          >
            <Camera size={20} className="text-[var(--color-text-label)]" />
            <span className="text-[10px] text-[var(--color-text-label)]">{isJa ? '追加' : 'Add'}</span>
          </button>
          {portraits.map((portrait) => {
            const isSelected = portrait.id === selectedPortraitId;
            return (
              <button
                key={portrait.id}
                onClick={() => setSelectedPortraitId(portrait.id)}
                className={`shrink-0 w-20 h-28 rounded-[var(--radius-md)] overflow-hidden relative border-2 transition-colors ${
                  isSelected ? 'border-[var(--color-accent)]' : 'border-transparent'
                }`}
              >
                <img src={portrait.dataUrl} alt={portrait.name} className="w-full h-full object-cover" />
                {isSelected && (
                  <div className="absolute inset-0 bg-[var(--color-accent)]/10 flex items-end justify-center pb-1">
                    <CheckCircle size={16} className="text-[var(--color-accent)]" />
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePortrait(portrait.id);
                    if (selectedPortraitId === portrait.id) setSelectedPortraitId(null);
                  }}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full"
                >
                  <X size={10} className="text-white" />
                </button>
              </button>
            );
          })}
        </div>
        {portraits.length === 0 && (
          <p className="text-xs text-[var(--color-text-label)] mt-2">
            {isJa ? '全身写真を登録してください' : 'Please add a full-body photo'}
          </p>
        )}
      </motion.div>

      {/* Model Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-2">
          {isJa ? 'モデル設定' : 'Model Settings'}
        </h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[10px] text-[var(--color-text-label)] mb-1 block">
              {isJa ? '性別' : 'Gender'}
            </label>
            <div className="flex gap-1">
              {(['female', 'male'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setModelGender(g)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    modelGender === g
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
                  }`}
                >
                  {g === 'female' ? (isJa ? '女性' : 'Female') : (isJa ? '男性' : 'Male')}
                </button>
              ))}
            </div>
          </div>
          <div className="w-24">
            <label className="text-[10px] text-[var(--color-text-label)] mb-1 block">
              {isJa ? '身長' : 'Height'}
            </label>
            <div className="relative">
              <select
                value={modelHeight}
                onChange={(e) => setModelHeight(Number(e.target.value))}
                className="w-full py-2 px-3 pr-8 rounded-lg text-xs bg-[var(--color-bg-element)] border border-[var(--color-line)] text-[var(--color-text-body)] appearance-none"
              >
                {Array.from({ length: 8 }, (_, i) => 150 + i * 5).map((h) => (
                  <option key={h} value={h}>{h}cm</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-label)] pointer-events-none" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Try On Button */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
        {tryOnError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)]">
            <p className="text-sm text-red-700">{tryOnError}</p>
          </div>
        )}
        <button
          onClick={handleTryOn}
          disabled={!canStartTryOn}
          className={`w-full py-3.5 rounded-[var(--radius-md)] text-sm font-medium flex items-center justify-center gap-2 transition-all ${
            canStartTryOn
              ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
              : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)] cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {processingStatus}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {isJa ? '試着する' : 'Try On'}
              {slotCount > 0 && ` (${slotCount})`}
            </>
          )}
        </button>
        {!selectedPortrait && slotCount > 0 && (
          <p className="text-xs text-[var(--color-text-label)] text-center mt-2">
            {isJa ? '写真を選択してください' : 'Please select a photo'}
          </p>
        )}
        {slotCount === 0 && tryOnPool.length > 0 && (
          <p className="text-xs text-[var(--color-text-label)] text-center mt-2">
            {isJa ? 'リストからスロットにアイテムを配置してください' : 'Place items from list into slots'}
          </p>
        )}
        {tryOnPool.length === 0 && (
          <p className="text-xs text-[var(--color-text-label)] text-center mt-2">
            {isJa ? '商品ページからアイテムを追加してください' : 'Add items from product pages'}
          </p>
        )}
      </motion.div>

      {/* Latest Result */}
      {latestResult && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-white border border-[var(--color-accent)] rounded-[var(--radius-lg)]"
        >
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] mb-3">
            {isJa ? '試着結果' : 'Try-On Result'}
          </h2>
          <div className="aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)]">
            <img src={latestResult} alt="Try-on result" className="w-full h-full object-contain" />
          </div>
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = latestResult;
              a.download = `vual-tryon-${Date.now()}.png`;
              a.click();
            }}
            className="mt-3 w-full py-2 text-sm font-medium text-[var(--color-accent)] border border-[var(--color-accent)] rounded-[var(--radius-md)] flex items-center justify-center gap-2 hover:bg-[var(--color-accent)]/5 transition-colors"
          >
            <Download size={14} />
            {isJa ? '画像を保存' : 'Save Image'}
          </button>
        </motion.div>
      )}

      {/* Recent Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
            {isJa ? '最近の試着結果' : 'Recent Results'}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {results.map((result) => (
              <div key={result.id} className="shrink-0 w-20 flex flex-col items-end gap-1">
                <div className="w-full aspect-[3/4] rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)]">
                  <img src={result.resultImage} alt={result.garmentName} className="w-full h-full object-contain" />
                </div>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = result.resultImage;
                    a.download = `vual-tryon-${result.id}.png`;
                    a.click();
                  }}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-[var(--color-line)] shadow-sm"
                >
                  <Download size={11} className="text-[var(--color-text-label)]" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          {isJa ? '使い方' : 'How It Works'}
        </h2>
        <div className="flex gap-4">
          {[
            { step: '1', label: isJa ? '商品をリストに追加' : 'Add items to list' },
            { step: '2', label: isJa ? 'スロットに配置' : 'Place in slots' },
            { step: '3', label: isJa ? '試着結果を確認' : 'View results' },
          ].map((item) => (
            <div key={item.step} className="flex-1 text-center">
              <div className="w-8 h-8 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <p className="text-xs text-[var(--color-text-body)]">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Portrait Capture Modal */}
      <AnimatePresence>
        {showCapture && (
          <PortraitCapture onClose={() => setShowCapture(false)} onCaptured={() => setShowCapture(false)} />
        )}
      </AnimatePresence>

      {/* Credit Purchase Sheet */}
      <CreditPurchaseSheet isOpen={showPurchase} onClose={() => setShowPurchase(false)} />
    </div>
  );
}

// Pool droppable zone wrapper
function PoolDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: 'pool' });
  return <div ref={setNodeRef}>{children}</div>;
}
