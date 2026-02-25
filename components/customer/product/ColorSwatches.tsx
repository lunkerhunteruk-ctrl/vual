'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Color {
  name: string;
  hex: string;
  image?: string;
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
        {t('color')}: <span className="text-[var(--color-title-active)]">{selectedColor}</span>
      </p>
      <div className="flex items-center gap-3">
        {colors.map((color) => {
          const isSelected = selectedColor === color.name;

          return (
            <button
              key={color.name}
              onClick={() => onColorChange(color.name)}
              className={`relative flex flex-col items-center gap-1.5 transition-transform ${
                isSelected ? 'scale-105' : 'hover:scale-105'
              }`}
              title={color.name}
            >
              {/* Swatch - image or color circle */}
              <div
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                  isSelected
                    ? 'border-[var(--color-accent)]'
                    : 'border-[var(--color-line)]'
                }`}
              >
                {color.image ? (
                  <img
                    src={color.image}
                    alt={color.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ backgroundColor: color.hex }}
                  />
                )}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                  >
                    <Check size={16} className="text-white" />
                  </motion.div>
                )}
              </div>
              {/* Color name */}
              <span className={`text-xs ${
                isSelected
                  ? 'text-[var(--color-title-active)] font-medium'
                  : 'text-[var(--color-text-label)]'
              }`}>
                {color.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ColorSwatches;
