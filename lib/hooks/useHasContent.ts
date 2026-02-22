import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

/**
 * Generic hook to check if a collection has any documents matching criteria
 */
function useHasDocuments(
  collectionName: string,
  whereField?: string,
  whereValue?: unknown
) {
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!db) {
        setHasDocuments(false);
        setIsLoading(false);
        return;
      }

      try {
        let q = query(collection(db, collectionName), limit(1));

        if (whereField && whereValue !== undefined) {
          q = query(q, where(whereField, '==', whereValue));
        }

        const snapshot = await getDocs(q);
        setHasDocuments(snapshot.docs.length > 0);
      } catch (err) {
        console.error(`Failed to check ${collectionName}:`, err);
        setHasDocuments(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [collectionName, whereField, whereValue]);

  return { hasDocuments, isLoading };
}

/**
 * Check if there are any published products
 */
export function useHasProducts() {
  const { hasDocuments, isLoading } = useHasDocuments(
    COLLECTIONS.PRODUCTS,
    'isPublished',
    true
  );
  return { hasProducts: hasDocuments, isLoading };
}

/**
 * Check if there are any active collections
 */
export function useHasCollections() {
  const { hasDocuments, isLoading } = useHasDocuments(
    COLLECTIONS.COLLECTIONS,
    'isActive',
    true
  );
  return { hasCollections: hasDocuments, isLoading };
}

/**
 * Check if there are any live or scheduled streams
 */
export function useHasLiveStreams() {
  const [hasStreams, setHasStreams] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!db) {
        setHasStreams(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check for live or scheduled streams
        const q = query(
          collection(db, COLLECTIONS.STREAMS),
          where('status', 'in', ['live', 'scheduled']),
          limit(1)
        );

        const snapshot = await getDocs(q);
        setHasStreams(snapshot.docs.length > 0);
      } catch (err) {
        console.error('Failed to check streams:', err);
        setHasStreams(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, []);

  return { hasStreams, isLoading };
}

/**
 * Check if there are any active brands
 */
export function useHasBrands() {
  const { hasDocuments, isLoading } = useHasDocuments(
    COLLECTIONS.BRANDS,
    'isActive',
    true
  );
  return { hasBrands: hasDocuments, isLoading };
}

/**
 * Check if a product has approved reviews
 */
export function useHasReviews(productId: string | null) {
  const [hasReviews, setHasReviews] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!productId || !db) {
      setHasReviews(false);
      setIsLoading(false);
      return;
    }

    const check = async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.REVIEWS),
          where('productId', '==', productId),
          where('status', '==', 'approved'),
          limit(1)
        );

        const snapshot = await getDocs(q);
        setHasReviews(snapshot.docs.length > 0);
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
