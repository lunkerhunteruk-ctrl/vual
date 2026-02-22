import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Brand } from '@/lib/types';

interface UseBrandsOptions {
  shopId?: string;
  isActive?: boolean;
  limit?: number;
}

interface UseBrandsReturn {
  brands: Brand[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  createBrand: (data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'productCount'>) => Promise<string>;
  updateBrand: (id: string, data: Partial<Brand>) => Promise<void>;
  deleteBrand: (id: string) => Promise<void>;
}

export function useBrands(options: UseBrandsOptions = {}): UseBrandsReturn {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 50;

  const fetchBrands = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.BRANDS),
        orderBy('name', 'asc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.isActive !== undefined) {
        q = query(q, where('isActive', '==', options.isActive));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newBrands = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Brand[];

      if (isLoadMore) {
        setBrands((prev) => [...prev, ...newBrands]);
      } else {
        setBrands(newBrands);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch brands'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.isActive, pageLimit, lastDoc]);

  useEffect(() => {
    fetchBrands();
  }, [options.shopId, options.isActive]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchBrands(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchBrands();
  };

  const createBrand = async (data: Omit<Brand, 'id' | 'createdAt' | 'updatedAt' | 'productCount'>): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTIONS.BRANDS), {
      ...data,
      productCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await refresh();
    return docRef.id;
  };

  const updateBrand = async (id: string, data: Partial<Brand>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.BRANDS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setBrands((prev) =>
      prev.map((brand) =>
        brand.id === id ? { ...brand, ...data, updatedAt: new Date() } : brand
      )
    );
  };

  const deleteBrand = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await deleteDoc(doc(db, COLLECTIONS.BRANDS, id));
    setBrands((prev) => prev.filter((brand) => brand.id !== id));
  };

  return { brands, isLoading, error, hasMore, loadMore, refresh, createBrand, updateBrand, deleteBrand };
}

export function useBrand(brandId: string | null) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!brandId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchBrand = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.BRANDS, brandId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setBrand({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Brand);
        } else {
          setBrand(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch brand'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrand();
  }, [brandId]);

  return { brand, isLoading, error };
}
