'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Share2, Heart } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onShare?: () => void;
}

export function ImageCarousel({
  images,
  isFavorite = false,
  onFavoriteToggle,
  onShare,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative">
      {/* Main Image */}
      <div className="aspect-[3/4] bg-[var(--color-bg-element)] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full"
          >
            {images[currentIndex] ? (
              <img
                src={images[currentIndex]}
                alt={`Product image ${currentIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)]" />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronLeft size={20} className="text-[var(--color-title-active)]" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <ChevronRight size={20} className="text-[var(--color-title-active)]" />
            </button>
          </>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={onShare}
            className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <Share2 size={18} className="text-[var(--color-text-body)]" />
          </button>
          <button
            onClick={onFavoriteToggle}
            className="w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
          >
            <Heart
              size={18}
              className={
                isFavorite
                  ? 'fill-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'text-[var(--color-text-body)]'
              }
            />
          </button>
        </div>
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goTo(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-[var(--color-title-active)]'
                  : 'bg-[var(--color-line)]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageCarousel;
