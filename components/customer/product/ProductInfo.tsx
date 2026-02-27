'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Truck, CreditCard, RotateCcw, Ruler } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui';

interface SizeRow {
  size: string;
  values: Record<string, string>;
}

interface SizeSpec {
  columns: string[];
  rows: SizeRow[];
}

interface ProductInfoProps {
  brand: string;
  name: string;
  price: string;
  taxInclusivePrice?: string;
  category?: string;
  tags?: string[];
  description?: string;
  materials?: string;
  care?: string;
  sizeSpecs?: SizeSpec;
  shippingPolicy?: string;
  freeShippingThreshold?: number | null;
  codPolicy?: string;
  returnPolicy?: string;
}

export function ProductInfo({
  brand,
  name,
  price,
  taxInclusivePrice,
  category,
  tags,
  description,
  materials,
  care,
  sizeSpecs,
  shippingPolicy,
  freeShippingThreshold,
  codPolicy,
  returnPolicy,
}: ProductInfoProps) {
  const t = useTranslations('customer.product');
  const locale = useLocale();

  const shippingText = freeShippingThreshold
    ? `¥${freeShippingThreshold.toLocaleString()}以上のご購入で送料無料。${shippingPolicy || ''}`
    : shippingPolicy || '';

  const hasSizeSpecs = sizeSpecs?.columns?.length && sizeSpecs?.rows?.length;
  const hasAnyAccordion = materials || care || shippingText || codPolicy || returnPolicy || hasSizeSpecs;

  return (
    <div className="px-4">
      {/* Category */}
      {category && (
        <p className="text-xs text-[var(--color-text-label)] mb-1">
          {category}
        </p>
      )}

      {/* Brand & Name */}
      {brand && (
        <p className="text-sm tracking-[0.15em] text-[var(--color-text-label)] uppercase mb-1">
          {brand}
        </p>
      )}
      <h1 className="text-xl font-medium text-[var(--color-title-active)] mb-2">
        {name}
      </h1>
      <div className="mb-4">
        <span className="text-xl font-medium text-[var(--color-accent)]">
          {price}
        </span>
        {taxInclusivePrice && (
          <span className="text-sm text-[var(--color-text-label)] ml-1.5">
            （{taxInclusivePrice} 税込）
          </span>
        )}
      </div>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-block px-3 py-1 text-xs font-medium bg-[var(--color-bg-element)] text-[var(--color-text-body)] border border-[var(--color-line)] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-[var(--color-text-body)] leading-relaxed mb-6 whitespace-pre-line">
          {description}
        </p>
      )}

      {/* Accordion Sections */}
      {hasAnyAccordion && (
        <div className="border-t border-[var(--color-line)]">
          <Accordion type="single" collapsible>
            {hasSizeSpecs && (
              <AccordionItem value="sizeSpecs">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-sm">
                    <Ruler size={16} className="text-[var(--color-text-label)]" />
                    {locale === 'ja' ? 'サイズ表' : 'Size Chart'}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-line)]">
                          <th className="text-left py-2 pr-3 font-medium text-[var(--color-title-active)] whitespace-nowrap">
                            {locale === 'ja' ? 'サイズ' : 'Size'}
                          </th>
                          {sizeSpecs!.columns.map((col) => (
                            <th
                              key={col}
                              className="text-center py-2 px-2 font-medium text-[var(--color-title-active)] whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sizeSpecs!.rows.map((row, idx) => (
                          <tr
                            key={row.size}
                            className={idx < sizeSpecs!.rows.length - 1 ? 'border-b border-[var(--color-line)]/50' : ''}
                          >
                            <td className="py-2 pr-3 font-medium text-[var(--color-text-body)] whitespace-nowrap">
                              {row.size}
                            </td>
                            {sizeSpecs!.columns.map((col) => (
                              <td
                                key={col}
                                className="text-center py-2 px-2 text-[var(--color-text-body)] whitespace-nowrap"
                              >
                                {row.values[col] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-[var(--color-text-label)] mt-2">
                      {locale === 'ja' ? '※ 単位: cm（実寸）' : '* Unit: cm (actual measurements)'}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {materials && (
              <AccordionItem value="materials">
                <AccordionTrigger className="text-sm tracking-[0.1em] uppercase">
                  {t('materials')}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {materials}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {care && (
              <AccordionItem value="care">
                <AccordionTrigger className="text-sm tracking-[0.1em] uppercase">
                  {t('care')}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {care}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {shippingText && (
              <AccordionItem value="shipping">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-sm">
                    <Truck size={16} className="text-[var(--color-text-label)]" />
                    {t('freeShipping')}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {shippingText}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {codPolicy && (
              <AccordionItem value="cod">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-sm">
                    <CreditCard size={16} className="text-[var(--color-text-label)]" />
                    {t('codPolicy')}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {codPolicy}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}

            {returnPolicy && (
              <AccordionItem value="return">
                <AccordionTrigger>
                  <span className="flex items-center gap-2 text-sm">
                    <RotateCcw size={16} className="text-[var(--color-text-label)]" />
                    {t('returnPolicy')}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-[var(--color-text-body)] leading-relaxed whitespace-pre-line">
                    {returnPolicy}
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default ProductInfo;
