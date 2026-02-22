'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

interface SizeSelectorProps {
  sizes: string[];
  selectedSize: string;
  onSizeChange: (size: string) => void;
  unavailableSizes?: string[];
}

export function SizeSelector({
  sizes,
  selectedSize,
  onSizeChange,
  unavailableSizes = [],
}: SizeSelectorProps) {
  const t = useTranslations('customer.product');

  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-body)] mb-3">
        {t('size')}
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isSelected = selectedSize === size;
          const isUnavailable = unavailableSizes.includes(size);

          return (
            <button
              key={size}
              onClick={() => !isUnavailable && onSizeChange(size)}
              disabled={isUnavailable}
              className={`
                relative min-w-[44px] h-11 px-4 rounded-[var(--radius-md)] text-sm font-medium
                transition-all duration-200
                ${isSelected
                  ? 'bg-[var(--color-title-active)] text-white'
                  : isUnavailable
                  ? 'bg-[var(--color-bg-element)] text-[var(--color-text-placeholder)] cursor-not-allowed'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
                }
              `}
            >
              {size}
              {isUnavailable && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-[var(--color-text-placeholder)] rotate-45" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SizeSelector;
