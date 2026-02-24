import { useState, useEffect, useCallback } from 'react';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface Review {
  id: string;
  product_id: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  rating: number;
  title?: string;
  content?: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

interface UseReviewsOptions {
  productId?: string;
  status?: ReviewStatus;
  limit?: number;
}

interface UseReviewsReturn {
  reviews: Review[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  rejectReview: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
}

export function useReviews(options: UseReviewsOptions = {}): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchReviews = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.productId) {
        params.set('productId', options.productId);
      }

      if (options.status) {
        params.set('status', options.status);
      }

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const data = await response.json();

      if (data.reviews) {
        setReviews(data.reviews);
        setHasMore(data.reviews.length >= pageLimit);
      } else {
        setReviews([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.productId, options.status, pageLimit]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchReviews();
  };

  const updateStatus = async (id: string, status: ReviewStatus): Promise<void> => {
    const response = await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update review status');
    }

    setReviews((prev) =>
      prev.map((review) =>
        review.id === id ? { ...review, status } : review
      )
    );
  };

  const approveReview = async (id: string): Promise<void> => {
    await updateStatus(id, 'approved');
  };

  const rejectReview = async (id: string): Promise<void> => {
    await updateStatus(id, 'rejected');
  };

  const deleteReview = async (id: string): Promise<void> => {
    const response = await fetch(`/api/reviews?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete review');
    }

    setReviews((prev) => prev.filter((review) => review.id !== id));
  };

  return { reviews, isLoading, error, hasMore, loadMore, refresh, approveReview, rejectReview, deleteReview };
}

export function useReview(reviewId: string | null) {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!reviewId) {
      setIsLoading(false);
      return;
    }

    const fetchReview = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reviews?id=${reviewId}`);
        const data = await response.json();

        if (data && data.id) {
          setReview(data);
        } else {
          setReview(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch review'));
        setReview(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReview();
  }, [reviewId]);

  return { review, isLoading, error };
}

// Calculate average rating for a product
export function useProductRating(productId: string | null) {
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    const fetchRatings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reviews?productId=${productId}&status=approved&limit=1000`);
        const data = await response.json();

        if (data.reviews && data.reviews.length > 0) {
          const total = data.reviews.reduce((sum: number, r: Review) => sum + (r.rating || 0), 0);
          setAvgRating(total / data.reviews.length);
          setReviewCount(data.reviews.length);
        } else {
          setAvgRating(0);
          setReviewCount(0);
        }
      } catch (err) {
        console.error('Failed to fetch ratings', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [productId]);

  return { avgRating, reviewCount, isLoading };
}
