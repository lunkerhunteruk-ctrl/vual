'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Share2, Heart } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  modelImageCount?: number;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
  onShare?: () => void;
}

export function ImageCarousel({
  images,
  modelImageCount = 0,
  isFavorite = false,
  onFavoriteToggle,
  onShare,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const thumbRef = useRef<HTMLDivElement>(null);
  // Cache natural aspect ratios: key=url, value=width/height
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const goTo = (index: number) => {
    setCurrentIndex(index);
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Scroll selected thumbnail into view
  useEffect(() => {
    if (thumbRef.current) {
      const thumb = thumbRef.current.children[currentIndex] as HTMLElement;
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex]);

  // Pre-load model images to detect their aspect ratios
  const productImageCount = images.length - modelImageCount;

  const handleImageLoad = useCallback((url: string, naturalWidth: number, naturalHeight: number) => {
    if (naturalHeight > 0) {
      setAspectRatios(prev => {
        if (prev[url]) return prev;
        return { ...prev, [url]: naturalWidth / naturalHeight };
      });
    }
  }, []);

  const currentUrl = images[currentIndex];
  const isModelImage = modelImageCount > 0 && currentIndex >= productImageCount;
  const currentAR = aspectRatios[currentUrl];

  // Match container to image's natural AR — no crop, no gap.
  // Default 3:4 until image loads.
  let mainAspect = '3 / 4';
  if (currentAR) {
    mainAspect = `${currentAR}`;
  }

  return (
    <div>
      {/* Main Image */}
      <div
        className="relative transition-[aspect-ratio] duration-300 bg-white"
        style={{ aspectRatio: mainAspect }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUrl}
          alt={`Product image ${currentIndex + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={(e) => {
            const img = e.currentTarget;
            handleImageLoad(currentUrl, img.naturalWidth, img.naturalHeight);
          }}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronLeft size={20} className="text-[var(--color-title-active)]" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronRight size={20} className="text-[var(--color-title-active)]" />
            </button>
          </>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
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

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div
          ref={thumbRef}
          className="flex gap-2 px-3 pt-1 pb-2 overflow-x-auto no-scrollbar"
        >
          {images.map((img, index) => {
            const isModel = modelImageCount > 0 && index >= productImageCount;
            return (
              <button
                key={index}
                onClick={() => goTo(index)}
                className={`relative flex-shrink-0 w-[17vw] aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-[var(--color-accent)] opacity-100'
                    : 'border-[var(--color-line)] opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {isModel && index === productImageCount && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-0.5">
                    MODEL
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ImageCarousel;
