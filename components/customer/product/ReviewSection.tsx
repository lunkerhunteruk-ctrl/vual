'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { useReviews, useProductRating } from '@/lib/hooks/useReviews';

interface ReviewSectionProps {
  productId: string;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={
            star <= rating
              ? 'text-amber-400 fill-amber-400'
              : star - 0.5 <= rating
              ? 'text-amber-400 fill-amber-200'
              : 'text-gray-200'
          }
        />
      ))}
    </div>
  );
}

export function ReviewSection({ productId }: ReviewSectionProps) {
  const locale = useLocale();
  const { avgRating, reviewCount, isLoading: ratingLoading } = useProductRating(productId);
  const { reviews, isLoading: reviewsLoading } = useReviews({
    productId,
    status: 'approved',
    limit: 10,
  });

  const isLoading = ratingLoading || reviewsLoading;

  if (isLoading) {
    return (
      <div className="px-4 py-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      </div>
    );
  }

  if (reviewCount === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className="px-4 py-6">
      {/* Header with average rating */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-[var(--color-title-active)]">
          {locale === 'ja' ? 'レビュー' : 'Reviews'}
        </h2>
        <div className="flex items-center gap-2">
          <StarRating rating={Math.round(avgRating)} size={16} />
          <span className="text-sm font-medium text-[var(--color-title-active)]">
            {avgRating.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--color-text-label)]">
            ({reviewCount})
          </span>
        </div>
      </div>

      {/* Rating breakdown */}
      <div className="mb-6 p-4 bg-[var(--color-bg-element)] rounded-[var(--radius-md)]">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-[var(--color-title-active)]">
              {avgRating.toFixed(1)}
            </p>
            <StarRating rating={Math.round(avgRating)} size={12} />
            <p className="text-xs text-[var(--color-text-label)] mt-1">
              {reviewCount} {locale === 'ja' ? '件のレビュー' : 'reviews'}
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-label)] w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-[var(--color-line)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="border-b border-[var(--color-line)] pb-4 last:border-0"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--color-bg-input)] flex items-center justify-center">
                  <span className="text-xs font-medium text-[var(--color-text-body)]">
                    {review.customer_name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="text-sm font-medium text-[var(--color-title-active)]">
                  {review.customer_name}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-label)]">
                {formatDate(review.created_at)}
              </span>
            </div>
            <StarRating rating={review.rating} />
            {review.title && (
              <p className="text-sm font-medium text-[var(--color-title-active)] mt-2">
                {review.title}
              </p>
            )}
            {review.content && (
              <p className="text-sm text-[var(--color-text-body)] mt-1 leading-relaxed">
                {review.content}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewSection;
