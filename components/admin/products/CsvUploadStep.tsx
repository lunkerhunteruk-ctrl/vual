'use client';

import { useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { parseCSVFile, type ParseResult } from '@/lib/csv/csv-parser';

interface CsvUploadStepProps {
  onParsed: (result: ParseResult) => void;
}

export function CsvUploadStep({ onParsed }: CsvUploadStepProps) {
  const t = useTranslations('admin.products.csvImport');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('CSVファイルを選択してください');
      return;
    }

    setIsParsing(true);
    setError(null);

    try {
      const result = await parseCSVFile(file);
      setParseResult(result);
      onParsed(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました');
    } finally {
      setIsParsing(false);
    }
  }, [onParsed]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-[var(--radius-lg)] p-12
          flex flex-col items-center justify-center gap-4
          cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-line)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)]'
          }
          ${parseResult ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={onFileChange}
          className="hidden"
        />

        {isParsing ? (
          <>
            <div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[var(--color-text-label)]">{t('detecting')}</p>
          </>
        ) : parseResult ? (
          <>
            <CheckCircle size={40} className="text-green-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-title-active)]">
                {t('fileSelected')}
              </p>
              <p className="text-xs text-[var(--color-text-label)] mt-1">
                {t('rows', { count: parseResult.rowCount })} · {t('encoding', { encoding: parseResult.encoding })}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setParseResult(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              別のファイルを選択
            </Button>
          </>
        ) : (
          <>
            <Upload size={40} className="text-[var(--color-text-placeholder)]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-text-body)]">
                {t('dropHere')}
              </p>
              <p className="text-xs text-[var(--color-text-placeholder)] mt-1">
                .csv (UTF-8 / Shift_JIS)
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Platform Support Info */}
      <div className="grid grid-cols-3 gap-3">
        {['Shopify', 'BASE', 'STORES.jp'].map(platform => (
          <div
            key={platform}
            className="flex items-center gap-2 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]"
          >
            <FileText size={16} className="text-[var(--color-text-label)]" />
            <span className="text-xs text-[var(--color-text-body)]">{platform}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
