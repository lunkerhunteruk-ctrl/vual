import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Product } from '@/lib/types';

interface UseProductsOptions {
  shopId?: string;
  category?: string;
  limit?: number;
  featured?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchProducts = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.category) {
        q = query(q, where('categories', 'array-contains', options.category));
      }

      if (options.featured) {
        q = query(q, where('isFeatured', '==', true));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newProducts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        publishedAt: doc.data().publishedAt?.toDate(),
      })) as Product[];

      if (isLoadMore) {
        setProducts((prev) => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.category, options.featured, pageLimit, lastDoc]);

  useEffect(() => {
    fetchProducts();
  }, [options.shopId, options.category, options.featured]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchProducts(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchProducts();
  };

  return { products, isLoading, error, hasMore, loadMore, refresh };
}

export function useProduct(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.PRODUCTS, productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            publishedAt: data.publishedAt?.toDate(),
          } as Product);
        } else {
          setProduct(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, isLoading, error };
}
