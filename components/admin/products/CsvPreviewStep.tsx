'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { type TransformResult, type VualProduct } from '@/lib/csv/csv-transformer';

interface CsvPreviewStepProps {
  result: TransformResult;
}

export function CsvPreviewStep({ result }: CsvPreviewStepProps) {
  const t = useTranslations('admin.products.csvImport');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const { products, errors, warnings } = result;

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle size={16} className="text-green-500" />
          <span className="text-[var(--color-text-body)]">
            {t('productsReady', { count: products.length })}
          </span>
        </div>
        {errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle size={16} className="text-red-500" />
            <span className="text-red-600">{t('errors', { count: errors.length })}</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <AlertTriangle size={16} className="text-yellow-500" />
            <span className="text-yellow-600">{t('warnings', { count: warnings.length })}</span>
          </div>
        )}
      </div>

      {/* Error List */}
      {errors.length > 0 && (
        <div className="border border-red-200 rounded-[var(--radius-md)] overflow-hidden">
          <div className="px-4 py-2 bg-red-50 text-xs font-medium text-red-700 uppercase">
            {t('error')}
          </div>
          <div className="divide-y divide-red-100 max-h-[150px] overflow-y-auto">
            {errors.map((err, i) => (
              <div key={i} className="px-4 py-2 text-xs text-red-600">
                {err.row}行目: {err.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning List */}
      {warnings.length > 0 && (
        <div className="border border-yellow-200 rounded-[var(--radius-md)] overflow-hidden">
          <div className="px-4 py-2 bg-yellow-50 text-xs font-medium text-yellow-700 uppercase">
            {t('warning')}
          </div>
          <div className="divide-y divide-yellow-100 max-h-[150px] overflow-y-auto">
            {warnings.map((warn, i) => (
              <div key={i} className="px-4 py-2 text-xs text-yellow-600">
                {warn.row}行目: {warn.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[var(--color-bg-element)] text-xs font-medium text-[var(--color-text-label)] uppercase">
          <div className="col-span-1">#</div>
          <div className="col-span-4">{t('productName')}</div>
          <div className="col-span-2">{t('fields.price')}</div>
          <div className="col-span-2">{t('variantCount')}</div>
          <div className="col-span-2">{t('imageCount')}</div>
          <div className="col-span-1">{t('validationStatus')}</div>
        </div>

        {/* Body */}
        <div className="divide-y divide-[var(--color-line)] max-h-[400px] overflow-y-auto">
          {products.slice(0, 50).map((product, idx) => (
            <div key={idx}>
              <div
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-[var(--color-bg-element)] transition-colors cursor-pointer"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <div className="col-span-1 text-xs text-[var(--color-text-label)]">{idx + 1}</div>
                <div className="col-span-4 text-sm text-[var(--color-text-body)] truncate">
                  {product.name}
                  {product.brandName && (
                    <span className="text-xs text-[var(--color-text-label)] ml-1">({product.brandName})</span>
                  )}
                </div>
                <div className="col-span-2 text-sm text-[var(--color-text-body)]">
                  ¥{product.price.toLocaleString()}
                </div>
                <div className="col-span-2 text-sm text-[var(--color-text-body)]">
                  {product.variants.length}
                </div>
                <div className="col-span-2 text-sm text-[var(--color-text-body)]">
                  {product.images.length}
                </div>
                <div className="col-span-1 flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-500" />
                  {expandedIdx === idx ? (
                    <ChevronUp size={14} className="text-[var(--color-text-label)]" />
                  ) : (
                    <ChevronDown size={14} className="text-[var(--color-text-label)]" />
                  )}
                </div>
              </div>

              {/* Expanded Detail */}
              {expandedIdx === idx && (
                <div className="px-6 pb-4 bg-[var(--color-bg-element)]">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {/* Left: Variants */}
                    <div>
                      <p className="font-medium text-[var(--color-text-label)] mb-2 uppercase">バリアント</p>
                      <div className="space-y-1">
                        {product.variants.map((v, vi) => (
                          <div key={vi} className="flex items-center gap-2 text-[var(--color-text-body)]">
                            <span>{v.color || '-'} / {v.size || '-'}</span>
                            <span className="text-[var(--color-text-label)]">SKU: {v.sku || '(auto)'}</span>
                            <span className="text-[var(--color-text-label)]">在庫: {v.stock}</span>
                            {v.priceOverride !== null && (
                              <span className="text-[var(--color-text-label)]">¥{v.priceOverride.toLocaleString()}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Other details */}
                    <div className="space-y-1 text-[var(--color-text-body)]">
                      {product.category && <div>カテゴリ: {product.category}</div>}
                      {product.tags && product.tags.length > 0 && (
                        <div>タグ: {product.tags.join(', ')}</div>
                      )}
                      <div>ステータス: {product.status === 'published' ? '公開' : '下書き'}</div>
                      {product.images.length > 0 && (
                        <div className="flex items-center gap-1">
                          <ImageIcon size={12} />
                          {product.images.length}枚の画像
                        </div>
                      )}
                      {product.description && (
                        <div className="mt-2 text-[var(--color-text-label)] line-clamp-3">
                          {product.description.slice(0, 200)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {products.length > 50 && (
        <p className="text-xs text-[var(--color-text-label)] text-center">
          他 {products.length - 50} 件は省略されています
        </p>
      )}
    </div>
  );
}
