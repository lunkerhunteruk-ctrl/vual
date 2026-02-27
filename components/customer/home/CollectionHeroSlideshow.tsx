'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerCollection } from '@/lib/hooks/useCollection';

interface CollectionHeroSlideshowProps {
  fallback: ReactNode;
}

export function CollectionHeroSlideshow({ fallback }: CollectionHeroSlideshowProps) {
  const { looks, isLoading } = useCustomerCollection();
  const locale = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = useCallback(() => {
    if (looks.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % looks.length);
  }, [looks.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (looks.length <= 1) return;
    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [goNext, looks.length]);

  // Loading: show nothing (will be brief)
  if (isLoading) return null;

  // No collection: show fallback (existing HeroSection)
  if (looks.length === 0) return <>{fallback}</>;

  const currentUrl = looks[currentIndex]?.image_url;

  return (
    <section className="relative w-full aspect-[16/9] bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={looks[currentIndex]?.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0"
        >
          {/* Blurred background fill — same image stretched + blurred */}
          <img
            src={currentUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-[40px] brightness-75"
          />

          {/* Main image — fully contained, no crop */}
          <div className="absolute inset-0 z-[1] flex items-center justify-center">
            <img
              src={currentUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-[2]" />
        </motion.div>
      </AnimatePresence>

      {/* Clickable overlay to collection */}
      <Link href={`/${locale}/collection`} className="absolute inset-0 z-[3]" />

      {/* Dot indicators */}
      {looks.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {looks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CollectionHeroSlideshow;
