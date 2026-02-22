'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Color {
  name: string;
  hex: string;
}

interface ColorSwatchesProps {
  colors: Color[];
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export function ColorSwatches({ colors, selectedColor, onColorChange }: ColorSwatchesProps) {
  const t = useTranslations('customer.product');

  return (
    <div>
      <p className="text-sm font-medium text-[var(--color-text-body)] mb-3">
        {t('color')}
      </p>
      <div className="flex items-center gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;
          const isLight = color.hex.toLowerCase() === '#ffffff' || color.hex.toLowerCase() === '#fff';

          return (
            <button
              key={color.name}
              onClick={() => onColorChange(color.name)}
              className={`relative w-8 h-8 rounded-full transition-transform ${
                isSelected ? 'scale-110' : 'hover:scale-105'
              } ${isLight ? 'border border-[var(--color-line)]' : ''}`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check
                    size={16}
                    className={isLight ? 'text-[var(--color-title-active)]' : 'text-white'}
                  />
                </motion.div>
              )}
              {isSelected && (
                <div
                  className={`absolute -inset-1 rounded-full border-2 ${
                    isLight ? 'border-[var(--color-title-active)]' : 'border-current'
                  }`}
                  style={{ borderColor: isLight ? undefined : color.hex }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorSwatches;
