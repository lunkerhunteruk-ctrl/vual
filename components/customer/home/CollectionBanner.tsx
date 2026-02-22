'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface CollectionBannerProps {
  title: string;
  subtitle?: string;
  image?: string;
  href: string;
}

export function CollectionBanner({ title, subtitle, image, href }: CollectionBannerProps) {
  const locale = useLocale();
  const t = useTranslations('customer.home');

  return (
    <Link href={`/${locale}${href}`}>
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.3 }}
        className="relative h-64 md:h-80 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] overflow-hidden mx-4"
      >
        {/* Background */}
        {image ? (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-line)]" />
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
          {subtitle && (
            <p className="text-sm tracking-wider mb-2 opacity-80">
              {subtitle}
            </p>
          )}
          <h3 className="text-2xl md:text-3xl font-light tracking-[0.15em] mb-4">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span>{t('exploreMore')}</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default CollectionBanner;
