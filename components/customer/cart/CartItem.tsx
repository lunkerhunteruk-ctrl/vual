'use client';

import { motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';

interface CartItemProps {
  id: string;
  name: string;
  brand: string;
  price: string;
  quantity: number;
  size: string;
  color: string;
  image?: string;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

export function CartItem({
  id,
  name,
  brand,
  price,
  quantity,
  size,
  color,
  image,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex gap-4 py-4 border-b border-[var(--color-line)]"
    >
      {/* Image */}
      <div className="w-24 h-32 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] overflow-hidden flex-shrink-0">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-[var(--color-text-label)] uppercase tracking-wide">
              {brand}
            </p>
            <h3 className="text-sm font-medium text-[var(--color-title-active)] line-clamp-2">
              {name}
            </h3>
          </div>
          <button
            onClick={onRemove}
            className="p-1 -mr-1 text-[var(--color-text-label)] hover:text-[var(--color-error)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[var(--color-text-label)] mb-3">
          {size} / {color}
        </p>

        <div className="flex items-center justify-between">
          {/* Quantity */}
          <div className="flex items-center border border-[var(--color-line)] rounded-[var(--radius-md)]">
            <button
              onClick={() => quantity > 1 && onQuantityChange(quantity - 1)}
              className="w-8 h-8 flex items-center justify-center text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
              disabled={quantity <= 1}
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm font-medium text-[var(--color-title-active)]">
              {quantity}
            </span>
            <button
              onClick={() => onQuantityChange(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Price */}
          <p className="text-sm font-medium text-[var(--color-title-active)]">
            {price}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default CartItem;
