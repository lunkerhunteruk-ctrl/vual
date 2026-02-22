'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui';

export default function NotFound() {
  const locale = useLocale();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        {/* 404 Number */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mb-8"
        >
          <span className="text-8xl font-light tracking-wider text-[var(--color-bg-element)]">
            404
          </span>
        </motion.div>

        {/* Message */}
        <h1 className="text-xl font-medium tracking-[0.1em] text-[var(--color-title-active)] uppercase mb-3">
          Page Not Found
        </h1>
        <p className="text-sm text-[var(--color-text-body)] mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link href={`/${locale}`}>
            <Button variant="primary" size="lg" fullWidth leftIcon={<Home size={18} />}>
              Back to Home
            </Button>
          </Link>
          <Link href={`/${locale}/search`}>
            <Button variant="secondary" size="lg" fullWidth leftIcon={<Search size={18} />}>
              Search Products
            </Button>
          </Link>
        </div>

        {/* Popular Categories */}
        <div className="mt-10 pt-8 border-t border-[var(--color-line)]">
          <p className="text-xs font-medium tracking-wide text-[var(--color-text-label)] uppercase mb-4">
            Popular Categories
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {['New', 'Dress', 'Outer', 'Bag', 'Shoes'].map(category => (
              <Link
                key={category}
                href={`/${locale}/category/${category.toLowerCase()}`}
                className="px-4 py-2 text-xs text-[var(--color-text-body)] bg-[var(--color-bg-element)] rounded-full hover:bg-[var(--color-bg-input)] transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
