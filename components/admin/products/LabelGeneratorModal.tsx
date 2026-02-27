'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { Download, Loader2, CheckSquare, Square } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { ProductVariant } from './ProductVariants';

interface LabelGeneratorModalProps {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  baseSku?: string;
  basePrice?: number;
  currency?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function LabelGeneratorModal({
  productId,
  productName,
  variants,
  baseSku,
  isOpen,
  onClose,
}: LabelGeneratorModalProps) {
  const locale = useLocale();
  const isJa = locale === 'ja';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Select all by default when opening
  useEffect(() => {
    if (isOpen && variants.length > 0) {
      setSelectedIds(new Set(variants.map((v) => v.id)));
      setPreviewUrl(null);
    }
  }, [isOpen, variants]);

  const hasVariants = variants.length > 0;
  const allSelected = hasVariants && selectedIds.size === variants.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(variants.map((v) => v.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Generate preview of first selected variant
  const generatePreview = async () => {
    const targetIds = hasVariants ? [Array.from(selectedIds)[0]] : undefined;
    try {
      const res = await fetch('/api/products/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantIds: targetIds }),
      });
      if (res.ok) {
        const blob = await res.blob();
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch {
      // Preview is optional, ignore errors
    }
  };

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen && !previewUrl) {
      generatePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const variantIds = hasVariants ? Array.from(selectedIds) : undefined;
      const res = await fetch('/api/products/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantIds }),
      });

      if (!res.ok) throw new Error('Generation failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('zip')) {
        a.download = `labels-${productName}.zip`;
      } else {
        const sku = hasVariants
          ? variants.find((v) => selectedIds.has(v.id))?.sku || 'label'
          : baseSku || 'label';
        a.download = `label-${sku}.png`;
      }

      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Label download error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCount = hasVariants ? selectedIds.size : 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isJa ? 'ラベル生成' : 'Generate Labels'} size="lg">
      <div className="space-y-4">
        {/* Preview */}
        {previewUrl && (
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Label preview"
              className="border border-[var(--color-line)] rounded-[var(--radius-md)] shadow-sm"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </div>
        )}

        {/* Variant selection */}
        {hasVariants ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[var(--color-title-active)]">
                {isJa ? 'バリエーション選択' : 'Select Variants'}
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                {allSelected
                  ? (isJa ? '全解除' : 'Deselect All')
                  : (isJa ? '全選択' : 'Select All')}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-[var(--color-line)] rounded-[var(--radius-md)] divide-y divide-[var(--color-line)]">
              {variants.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--color-bg-element)] cursor-pointer transition-colors"
                >
                  <button onClick={() => toggleOne(v.id)} className="shrink-0">
                    {selectedIds.has(v.id) ? (
                      <CheckSquare size={16} className="text-[var(--color-accent)]" />
                    ) : (
                      <Square size={16} className="text-[var(--color-text-placeholder)]" />
                    )}
                  </button>
                  <span className="text-sm text-[var(--color-text-body)] flex-1">
                    {[v.color, v.size].filter(Boolean).join(' / ')}
                  </span>
                  <span className="text-xs text-[var(--color-text-label)] font-mono">
                    {v.sku}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-text-body)]">
            {isJa
              ? `「${productName}」のラベルを1枚生成します。`
              : `Generate 1 label for "${productName}".`}
          </p>
        )}

        {/* Download button */}
        <Button
          variant="primary"
          leftIcon={isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          onClick={handleDownload}
          disabled={isGenerating || (hasVariants && selectedIds.size === 0)}
          className="w-full"
        >
          {isGenerating
            ? (isJa ? '生成中...' : 'Generating...')
            : downloadCount > 1
              ? (isJa ? `${downloadCount}件のラベルをダウンロード (ZIP)` : `Download ${downloadCount} Labels (ZIP)`)
              : (isJa ? 'ラベルをダウンロード' : 'Download Label')}
        </Button>
      </div>
    </Modal>
  );
}
