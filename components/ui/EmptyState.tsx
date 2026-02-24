'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center mb-4">
          <Icon size={24} className="text-[var(--color-text-label)]" />
        </div>
      )}
      <p className="text-sm font-medium text-[var(--color-text-body)]">{title}</p>
      {description && (
        <p className="text-xs text-[var(--color-text-label)] mt-1 text-center max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 h-9 px-4 text-sm font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
