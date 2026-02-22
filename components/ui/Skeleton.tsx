'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const roundedStyles = {
  none: 'rounded-none',
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  full: 'rounded-full',
};

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  return (
    <motion.div
      className={`
        bg-gradient-to-r from-[var(--color-bg-element)] via-[var(--color-bg-input)] to-[var(--color-bg-element)]
        bg-[length:200%_100%]
        ${roundedStyles[rounded]}
        ${className}
      `}
      style={{ width, height }}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0'],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '60%' : '100%'}
          rounded="sm"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 space-y-4 ${className}`}>
      <Skeleton height={200} rounded="md" />
      <Skeleton height={20} width="70%" rounded="sm" />
      <Skeleton height={16} width="40%" rounded="sm" />
    </div>
  );
}

export function SkeletonAvatar({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      rounded="full"
      className={className}
    />
  );
}

export default Skeleton;
