'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, HelpCircle } from 'lucide-react';
import { type PlatformType, type VualField, VUAL_FIELD_OPTIONS, PLATFORM_CONFIGS } from '@/lib/csv/platform-detect';

interface CsvMappingStepProps {
  headers: string[];
  platform: PlatformType;
  fieldMap: Record<string, VualField>;
  onFieldMapChange: (fieldMap: Record<string, VualField>) => void;
}

export function CsvMappingStep({
  headers,
  platform,
  fieldMap,
  onFieldMapChange,
}: CsvMappingStepProps) {
  const t = useTranslations('admin.products.csvImport');

  const platformConfig = PLATFORM_CONFIGS[platform];

  const platformLabel = useMemo(() => {
    switch (platform) {
      case 'shopify': return t('platformShopify');
      case 'base': return t('platformBase');
      case 'stores_jp': return t('platformStoresJp');
      default: return t('platformUnknown');
    }
  }, [platform, t]);

  const handleFieldChange = (header: string, value: string) => {
    const newMap = { ...fieldMap };
    if (value === '_skip' || value === '') {
      delete newMap[header];
    } else {
      newMap[header] = value as VualField;
    }
    onFieldMapChange(newMap);
  };

  // Count mapped fields
  const mappedCount = Object.values(fieldMap).filter(v => v !== '_skip').length;
  const requiredFields: VualField[] = ['name', 'price'];
  const missingRequired = requiredFields.filter(f => !Object.values(fieldMap).includes(f));

  return (
    <div className="space-y-6">
      {/* Platform Detection Badge */}
      <div className="flex items-center gap-3 p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
        {platform !== 'unknown' ? (
          <CheckCircle size={20} className="text-green-500 shrink-0" />
        ) : (
          <HelpCircle size={20} className="text-[var(--color-text-label)] shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-[var(--color-title-active)]">
            {t('detected')}: {platformLabel}
          </p>
          {platformConfig && (
            <p className="text-xs text-[var(--color-text-label)] mt-0.5">
              {platformConfig.variantGrouping === 'multi_row'
                ? 'マルチ行形式（同一Handleでグルーピング）'
                : 'フラット形式（1行1商品）'
              }
            </p>
          )}
        </div>
      </div>

      {/* Missing Required Fields Warning */}
      {missingRequired.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[var(--radius-md)] text-sm text-yellow-700">
          必須フィールド未割り当て: {missingRequired.map(f => {
            const opt = VUAL_FIELD_OPTIONS.find(o => o.value === f);
            return opt ? t(`fields.${f}`) : f;
          }).join(', ')}
        </div>
      )}

      {/* Mapping Summary */}
      <p className="text-xs text-[var(--color-text-label)]">
        {mappedCount} / {headers.length} カラムをマッピング済み
      </p>

      {/* Mapping Table */}
      <div className="border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-[var(--color-bg-element)] text-xs font-medium text-[var(--color-text-label)] uppercase">
          <div>{t('sourceColumn')}</div>
          <div>{t('targetField')}</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[var(--color-line)] max-h-[400px] overflow-y-auto">
          {headers.map(header => {
            const currentValue = fieldMap[header] || '_skip';
            const isMapped = currentValue !== '_skip';

            return (
              <div
                key={header}
                className={`grid grid-cols-2 gap-4 px-4 py-3 items-center transition-colors ${
                  isMapped ? 'bg-white' : 'bg-[var(--color-bg-page)] opacity-60'
                }`}
              >
                <div className="text-sm text-[var(--color-text-body)] font-mono truncate" title={header}>
                  {header}
                </div>
                <div>
                  <select
                    value={currentValue}
                    onChange={(e) => handleFieldChange(header, e.target.value)}
                    className={`
                      w-full h-9 px-3 text-sm rounded-[var(--radius-sm)]
                      border transition-colors appearance-none cursor-pointer
                      focus:outline-none focus:border-[var(--color-accent)]
                      ${isMapped
                        ? 'border-[var(--color-accent)] bg-white text-[var(--color-text-body)]'
                        : 'border-[var(--color-line)] bg-[var(--color-bg-input)] text-[var(--color-text-placeholder)]'
                      }
                    `}
                  >
                    {VUAL_FIELD_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {t(`fields.${opt.value}`, { defaultValue: opt.value === '_skip' ? t('unmapped') : opt.value })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
