'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'inverse';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--color-accent)] text-[var(--color-text-inverse)]
    hover:brightness-110
  `,
  secondary: `
    bg-[var(--color-bg-element)] text-[var(--color-title-active)]
    border border-[var(--color-line)]
    hover:bg-[var(--color-bg-input)]
  `,
  ghost: `
    bg-transparent text-[var(--color-title-active)]
    hover:bg-[var(--color-bg-element)]
  `,
  outline: `
    bg-transparent text-[var(--color-title-active)]
    border border-[var(--color-title-active)]
    hover:bg-[var(--color-title-active)] hover:text-[var(--color-text-inverse)]
  `,
  inverse: `
    bg-[var(--color-bg-inverse)] text-[var(--color-text-inverse)]
    hover:bg-[var(--color-title-active)]
  `,
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  xl: 'h-14 px-8 text-lg gap-3',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        transition={{ duration: 0.15 }}
        className={`
          inline-flex items-center justify-center
          font-medium tracking-wide
          rounded-[var(--radius-md)]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'md' ? 16 : 20} />
        ) : (
          leftIcon
        )}
        <span className={isLoading ? 'opacity-0' : ''}>{children}</span>
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
