'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Download, Loader2, CheckSquare, Square } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import type { ProductVariant } from './ProductVariants';
import QRCode from 'qrcode';
import JSZip from 'jszip';

interface LabelGeneratorModalProps {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  baseSku?: string;
  basePrice?: number;
  currency?: string;
  storeName?: string;
  isOpen: boolean;
  onClose: () => void;
}

// --- Label drawing on Canvas ---
const LABEL_W = 580;
const LABEL_H = 280;
const QR_SIZE = 180;
const QR_MARGIN = 30;
const TEXT_X = QR_MARGIN + QR_SIZE + 28;

function formatPrice(price: number, currency: string): string {
  if (currency === 'JPY' || currency === 'KRW') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency }).format(price);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

interface LabelData {
  sku: string;
  productName: string;
  color?: string | null;
  size?: string | null;
  price: number;
  currency: string;
  storeName: string;
}

async function drawLabel(data: LabelData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext('2d')!;

  // White background with rounded border
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(0, 0, LABEL_W, LABEL_H, 8);
  ctx.fill();
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  ctx.stroke();

  // QR Code
  const qrDataUrl = await QRCode.toDataURL(data.sku, {
    width: QR_SIZE,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  const qrImg = await loadImage(qrDataUrl);
  const qrTop = (LABEL_H - QR_SIZE) / 2 | 0;
  ctx.drawImage(qrImg, QR_MARGIN, qrTop, QR_SIZE, QR_SIZE);

  // Build variant line
  const variantParts: string[] = [];
  if (data.color) variantParts.push(data.color);
  if (data.size) variantParts.push(data.size);
  const variantLine = variantParts.join(' / ');

  // Text rendering
  const nameDisplay = truncate(data.productName, 22);
  const priceDisplay = formatPrice(data.price, data.currency);

  // Product name
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '600 22px "Inter", "Noto Sans JP", sans-serif';
  ctx.fillText(nameDisplay, TEXT_X, QR_MARGIN + 28);

  // Variant
  let nextY = QR_MARGIN + 62;
  if (variantLine) {
    ctx.fillStyle = '#555555';
    ctx.font = '400 18px "Inter", "Noto Sans JP", sans-serif';
    ctx.fillText(variantLine, TEXT_X, nextY);
    nextY += 38;
  } else {
    nextY = QR_MARGIN + 66;
  }

  // Price
  ctx.fillStyle = '#1A1A1A';
  ctx.font = '700 24px "Inter", "Noto Sans JP", sans-serif';
  ctx.fillText(priceDisplay, TEXT_X, nextY);

  // SKU
  ctx.fillStyle = '#999999';
  ctx.font = '400 13px "Inter", monospace';
  ctx.fillText(`SKU: ${data.sku}`, TEXT_X, nextY + 32);

  // Store name
  ctx.fillStyle = '#BBBBBB';
  ctx.font = '400 11px "Inter", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(data.storeName, LABEL_W - 16, LABEL_H - 16);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/png');
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// --- Modal Component ---
export function LabelGeneratorModal({
  productId,
  productName,
  variants,
  baseSku,
  basePrice = 0,
  currency = 'JPY',
  storeName = '',
  isOpen,
  onClose,
}: LabelGeneratorModalProps) {
  const locale = useLocale();
  const isJa = locale === 'ja';

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  // Select all by default when opening
  useEffect(() => {
    if (isOpen && variants.length > 0) {
      setSelectedIds(new Set(variants.map((v) => v.id)));
    }
    if (isOpen) {
      setPreviewUrl(null);
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    }
  }, [isOpen, variants]);

  const hasVariants = variants.length > 0;
  const allSelected = hasVariants && selectedIds.size === variants.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(variants.map((v) => v.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Generate preview on client side
  const generatePreview = useCallback(async () => {
    try {
      let data: LabelData;
      if (hasVariants) {
        const firstId = Array.from(selectedIds)[0];
        const v = variants.find((x) => x.id === firstId);
        if (!v) return;
        data = {
          sku: v.sku,
          productName,
          color: v.color,
          size: v.size,
          price: v.price ?? basePrice,
          currency,
          storeName,
        };
      } else {
        data = {
          sku: baseSku || productId.slice(0, 8),
          productName,
          price: basePrice,
          currency,
          storeName,
        };
      }
      const blob = await drawLabel(data);
      const url = URL.createObjectURL(blob);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url;
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview error:', err);
    }
  }, [hasVariants, selectedIds, variants, productName, basePrice, currency, storeName, baseSku, productId]);

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen && !previewUrl) {
      generatePreview();
    }
  }, [isOpen, previewUrl, generatePreview]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      if (!hasVariants || selectedIds.size === 1) {
        // Single label
        let data: LabelData;
        if (hasVariants) {
          const v = variants.find((x) => selectedIds.has(x.id))!;
          data = {
            sku: v.sku,
            productName,
            color: v.color,
            size: v.size,
            price: v.price ?? basePrice,
            currency,
            storeName,
          };
        } else {
          data = {
            sku: baseSku || productId.slice(0, 8),
            productName,
            price: basePrice,
            currency,
            storeName,
          };
        }
        const blob = await drawLabel(data);
        downloadBlob(blob, `label-${data.sku}.png`);
      } else {
        // Multiple labels → ZIP
        const zip = new JSZip();
        const selected = variants.filter((v) => selectedIds.has(v.id));
        for (const v of selected) {
          const blob = await drawLabel({
            sku: v.sku,
            productName,
            color: v.color,
            size: v.size,
            price: v.price ?? basePrice,
            currency,
            storeName,
          });
          zip.file(`label-${v.sku}.png`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `labels-${productName}.zip`);
      }
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
