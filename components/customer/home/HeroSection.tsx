'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';

export function HeroSection() {
  const locale = useLocale();
  const t = useTranslations('customer.home');

  return (
    <section className="relative h-[70vh] min-h-[500px] bg-[var(--color-bg-element)] overflow-hidden">
      {/* Background Image Placeholder */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-element)] via-[var(--color-bg-input)] to-[var(--color-bg-element)]" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
      >
        <h1 className="text-3xl md:text-5xl font-light tracking-[0.2em] text-white mb-6 drop-shadow-lg">
          NEW SEASON
        </h1>
        <p className="text-sm md:text-base text-white/80 mb-8 max-w-md drop-shadow">
          Discover our latest collection of premium fashion essentials
        </p>
        <Link href={`/${locale}/category/new`}>
          <Button variant="inverse" size="lg">
            {t('exploreCollection')}
          </Button>
        </Link>
      </motion.div>
    </section>
  );
}

export default HeroSection;
