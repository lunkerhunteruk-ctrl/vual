'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: LucideIcon | React.ReactNode;
  rightIcon?: LucideIcon;
  onRightIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      onRightIconClick,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium tracking-[var(--letter-spacing-wide)] uppercase text-[var(--color-text-label)] mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]">
              {typeof LeftIcon === 'function' ? <LeftIcon size={18} /> : LeftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-11
              px-4 ${LeftIcon ? 'pl-10' : ''} ${RightIcon ? 'pr-10' : ''}
              bg-[var(--color-bg-input)]
              border border-transparent
              rounded-[var(--radius-md)]
              text-sm text-[var(--color-text-body)]
              placeholder:text-[var(--color-text-placeholder)]
              transition-all duration-200
              focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]' : ''}
              ${className}
            `}
            {...props}
          />
          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)] hover:text-[var(--color-text-body)] transition-colors"
            >
              <RightIcon size={18} />
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-[var(--color-error)]">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--color-text-placeholder)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
