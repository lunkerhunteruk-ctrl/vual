import { useState, useEffect } from 'react';

/**
 * Check if there are any published products
 */
export function useHasProducts() {
  const [hasProducts, setHasProducts] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch('/api/products?status=published&limit=1');
        const data = await response.json();
        setHasProducts(data.products && data.products.length > 0);
      } catch (err) {
        console.error('Failed to check products:', err);
        setHasProducts(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, []);

  return { hasProducts, isLoading };
}

/**
 * Check if there are any active collections
 */
export function useHasCollections() {
  // Collections not implemented in Supabase yet, return false
  return { hasCollections: false, isLoading: false };
}

/**
 * Check if there are any live or scheduled streams
 */
export function useHasLiveStreams() {
  // Streams not implemented in Supabase yet, return false
  return { hasStreams: false, isLoading: false };
}

/**
 * Check if there are any active brands
 */
export function useHasBrands() {
  // Brands not implemented in Supabase yet, return false
  return { hasBrands: false, isLoading: false };
}

/**
 * Check if a product has approved reviews
 */
export function useHasReviews(productId: string | null) {
  const [hasReviews, setHasReviews] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setHasReviews(false);
      setIsLoading(false);
      return;
    }

    const check = async () => {
      try {
        const response = await fetch(`/api/reviews?productId=${productId}&status=approved&limit=1`);
        const data = await response.json();
        setHasReviews(data.reviews && data.reviews.length > 0);
      } catch (err) {
        console.error('Failed to check reviews:', err);
        setHasReviews(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [productId]);

  return { hasReviews, isLoading };
}
