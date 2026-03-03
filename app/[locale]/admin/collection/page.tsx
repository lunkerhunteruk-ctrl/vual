'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Plus, Trash2, GripVertical, Layers, Loader2, X, Check } from 'lucide-react';
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
import { useCollection, CollectionLook } from '@/lib/hooks/useCollection';
import { AddLookModal } from '@/components/admin/collection/AddLookModal';

function SortableLookCard({
  look,
  onDelete,
  onClick,
  locale,
}: {
  look: CollectionLook;
  onDelete: (id: string) => void;
  onClick: () => void;
  locale: string;
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
      className="flex items-center gap-4 bg-white border border-[var(--color-line)] rounded-xl p-3 hover:shadow-sm transition-shadow"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-[var(--color-text-label)] hover:text-[var(--color-title-active)]"
      >
        <GripVertical size={20} />
      </button>

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
    </div>
  );
}

function LookDetailModal({
  look,
  onClose,
  onSave,
  locale,
}: {
  look: CollectionLook;
  onClose: () => void;
  onSave: (id: string, updates: { title?: string; description?: string }) => Promise<void>;
  locale: string;
}) {
  const ja = locale === 'ja';
  const [title, setTitle] = useState(look.title || '');
  const [description, setDescription] = useState(look.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const products = look.collection_look_products || [];

  const hasChanges = title !== (look.title || '') || description !== (look.description || '');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(look.id, { title: title || '', description: description || '' });
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
          <h2 className="text-base font-bold text-[var(--color-title-active)]">
            {ja ? 'ルック詳細' : 'Look Details'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--color-bg-element)] rounded-lg transition-colors">
            <X size={20} className="text-[var(--color-text-label)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Image */}
          <div className="rounded-xl overflow-hidden bg-[var(--color-bg-element)] flex items-center justify-center">
            <img src={look.image_url} alt="" className="max-w-full max-h-[400px] object-contain" />
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

          {/* Products */}
          {products.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-1.5 block">
                {ja ? '使用アイテム' : 'Products'}
              </label>
              <div className="flex flex-wrap gap-2">
                {products.map((lp) => (
                  <div
                    key={lp.id}
                    className="flex items-center gap-2 px-3 py-2 border border-[var(--color-line)] rounded-lg"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0 flex items-center justify-center">
                      {lp.products?.images?.[0]?.url && (
                        <img src={lp.products.images[0].url} alt="" className="max-w-full max-h-full object-contain" />
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-body)]">{lp.products?.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

export default function CollectionPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const { looks, isLoading, addLook, updateLook, deleteLook, reorderLooks } = useCollection();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLook, setSelectedLook] = useState<CollectionLook | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = looks.findIndex((l) => l.id === active.id);
    const newIndex = looks.findIndex((l) => l.id === over.id);
    const newOrder = arrayMove(looks, oldIndex, newIndex);
    reorderLooks(newOrder.map((l) => l.id));
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
          <SortableContext items={looks.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {looks.map((look) => (
                <SortableLookCard
                  key={look.id}
                  look={look}
                  onDelete={deleteLook}
                  onClick={() => setSelectedLook(look)}
                  locale={locale}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
          look={selectedLook}
          onClose={() => setSelectedLook(null)}
          onSave={async (id, updates) => {
            await updateLook(id, updates);
            setSelectedLook(prev => prev ? { ...prev, ...updates } : null);
          }}
          locale={locale}
        />
      )}
    </div>
  );
}
