import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, deleteDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Review } from '@/lib/types';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

interface UseReviewsOptions {
  shopId?: string;
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
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchReviews = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.REVIEWS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.productId) {
        q = query(q, where('productId', '==', options.productId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Review[];

      if (isLoadMore) {
        setReviews((prev) => [...prev, ...newReviews]);
      } else {
        setReviews(newReviews);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch reviews'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.productId, options.status, pageLimit, lastDoc]);

  useEffect(() => {
    fetchReviews();
  }, [options.shopId, options.productId, options.status]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchReviews(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchReviews();
  };

  const updateStatus = async (id: string, status: ReviewStatus): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.REVIEWS, id);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date(),
    });

    setReviews((prev) =>
      prev.map((review) =>
        review.id === id ? { ...review, status, updatedAt: new Date() } : review
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
    if (!db) throw new Error('Database not initialized');

    await deleteDoc(doc(db, COLLECTIONS.REVIEWS, id));
    setReviews((prev) => prev.filter((review) => review.id !== id));
  };

  return { reviews, isLoading, error, hasMore, loadMore, refresh, approveReview, rejectReview, deleteReview };
}

export function useReview(reviewId: string | null) {
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!reviewId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchReview = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.REVIEWS, reviewId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setReview({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Review);
        } else {
          setReview(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch review'));
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
    if (!productId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchRatings = async () => {
      try {
        setIsLoading(true);
        const q = query(
          collection(db, COLLECTIONS.REVIEWS),
          where('productId', '==', productId),
          where('status', '==', 'approved')
        );
        const snapshot = await getDocs(q);

        if (snapshot.docs.length > 0) {
          const total = snapshot.docs.reduce((sum, doc) => sum + (doc.data().rating || 0), 0);
          setAvgRating(total / snapshot.docs.length);
          setReviewCount(snapshot.docs.length);
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
