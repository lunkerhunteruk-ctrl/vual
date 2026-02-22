'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  icon?: LucideIcon;
  onDetailsClick?: () => void;
  detailsLabel?: string;
}

export function StatCard({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  onDetailsClick,
  detailsLabel = 'Details',
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-[var(--color-text-label)]">{title}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-bg-element)] flex items-center justify-center">
            <Icon size={18} className="text-[var(--color-text-body)]" />
          </div>
        )}
      </div>

      <p className="text-2xl font-semibold text-[var(--color-title-active)] mb-2">
        {value}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {change && (
            <span
              className={`flex items-center gap-1 text-sm font-medium ${
                change.isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
              }`}
            >
              {change.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {change.value}
            </span>
          )}
          {subtitle && (
            <span className="text-sm text-[var(--color-text-placeholder)]">{subtitle}</span>
          )}
        </div>

        {onDetailsClick && (
          <button
            onClick={onDetailsClick}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            {detailsLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default StatCard;
