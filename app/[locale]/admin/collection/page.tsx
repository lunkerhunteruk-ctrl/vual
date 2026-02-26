'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Plus, Trash2, GripVertical, Layers, Loader2 } from 'lucide-react';
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
  locale,
}: {
  look: CollectionLook;
  onDelete: (id: string) => void;
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

      {/* Look image */}
      <div className="w-20 h-28 rounded-lg overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0">
        <img src={look.image_url} alt="" className="w-full h-full object-cover" />
      </div>

      {/* Linked products */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--color-text-label)] mb-2">
          {ja ? '紐付け商品' : 'Linked products'}: {products.length}
        </p>
        <div className="flex gap-2">
          {products.map((lp) => (
            <div
              key={lp.id}
              className="w-10 h-14 rounded overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0"
              title={lp.products?.name}
            >
              {lp.products?.images?.[0]?.url && (
                <img src={lp.products.images[0].url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          ))}
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

export default function CollectionPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const { looks, isLoading, addLook, deleteLook, reorderLooks } = useCollection();
  const [modalOpen, setModalOpen] = useState(false);

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
                <SortableLookCard key={look.id} look={look} onDelete={deleteLook} locale={locale} />
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
    </div>
  );
}
