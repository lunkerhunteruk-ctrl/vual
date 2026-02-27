'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, XCircle, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { type VualProduct } from '@/lib/csv/csv-transformer';

interface ImportResult {
  product: VualProduct;
  success: boolean;
  error?: string;
}

interface CsvImportStepProps {
  products: VualProduct[];
  brandMap: Record<string, string>; // brandName → brandId
  onComplete: () => void;
}

export function CsvImportStep({ products, brandMap, onComplete }: CsvImportStepProps) {
  const t = useTranslations('admin.products.csvImport');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const importProducts = useCallback(async (productsToImport: VualProduct[]) => {
    setIsImporting(true);
    const newResults: ImportResult[] = [];

    for (let i = 0; i < productsToImport.length; i++) {
      const product = productsToImport[i];
      setCurrentIdx(i + 1);

      try {
        const brandId = product.brandName ? brandMap[product.brandName] : undefined;

        const body = {
          name: product.name,
          nameEn: product.nameEn,
          description: product.description,
          category: product.category,
          price: product.price,
          currency: product.currency,
          brandId: brandId || undefined,
          images: product.images,
          variants: product.variants,
        };

        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        newResults.push({ product, success: true });
      } catch (err) {
        newResults.push({
          product,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      setResults([...newResults]);
    }

    setIsImporting(false);
    setIsDone(true);
  }, [brandMap]);

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const failedProducts = results.filter(r => !r.success).map(r => r.product);

  const handleStart = () => {
    setResults([]);
    setCurrentIdx(0);
    setIsDone(false);
    importProducts(products);
  };

  const handleRetry = () => {
    setResults(prev => prev.filter(r => r.success));
    setCurrentIdx(0);
    setIsDone(false);
    importProducts(failedProducts);
  };

  // Progress percentage
  const progress = products.length > 0 ? (results.length / products.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Not started yet */}
      {!isImporting && !isDone && (
        <div className="text-center py-8 space-y-4">
          <p className="text-sm text-[var(--color-text-body)]">
            {t('productsReady', { count: products.length })}
          </p>
          <Button variant="primary" onClick={handleStart}>
            {t('import')}
          </Button>
        </div>
      )}

      {/* Progress Bar */}
      {(isImporting || isDone) && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-body)]">
                {isImporting
                  ? t('importProgress', { current: currentIdx, total: products.length })
                  : t('importComplete')
                }
              </span>
              <span className="text-[var(--color-text-label)]">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--color-bg-element)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isDone && failedCount === 0 ? 'bg-green-500' :
                  isDone && failedCount > 0 ? 'bg-yellow-500' :
                  'bg-[var(--color-accent)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Results Summary */}
          {isDone && (
            <div className="flex items-center gap-4 p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
              {successCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-green-700">{t('success', { count: successCount })}</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <XCircle size={16} className="text-red-500" />
                  <span className="text-red-600">{t('failed', { count: failedCount })}</span>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          <div className="border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden">
            <div className="divide-y divide-[var(--color-line)] max-h-[350px] overflow-y-auto">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  {result.success ? (
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-500 shrink-0" />
                  )}
                  <span className="text-sm text-[var(--color-text-body)] truncate flex-1">
                    {result.product.name}
                  </span>
                  {result.error && (
                    <span className="text-xs text-red-500 truncate max-w-[200px]">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}

              {/* In-progress indicator */}
              {isImporting && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <Loader2 size={16} className="text-[var(--color-accent)] animate-spin shrink-0" />
                  <span className="text-sm text-[var(--color-text-label)]">
                    {products[currentIdx - 1]?.name || '...'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isDone && (
            <div className="flex items-center justify-end gap-3">
              {failedCount > 0 && (
                <Button variant="secondary" leftIcon={<RotateCcw size={16} />} onClick={handleRetry}>
                  {t('retry')}
                </Button>
              )}
              <Button variant="primary" onClick={onComplete}>
                {t('done')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
