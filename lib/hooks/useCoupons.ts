import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Coupon } from '@/lib/types';

type CouponStatus = 'active' | 'expired' | 'scheduled';

interface UseCouponsOptions {
  shopId?: string;
  status?: CouponStatus;
  limit?: number;
}

interface UseCouponsReturn {
  coupons: Coupon[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  createCoupon: (data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => Promise<string>;
  updateCoupon: (id: string, data: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
}

export function useCoupons(options: UseCouponsOptions = {}): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const getStatus = (coupon: Coupon): CouponStatus => {
    const now = new Date();
    if (coupon.startsAt > now) return 'scheduled';
    if (coupon.expiresAt < now || !coupon.isActive) return 'expired';
    return 'active';
  };

  const fetchCoupons = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.COUPONS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      let newCoupons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startsAt: doc.data().startsAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Coupon[];

      // Filter by status on client side
      if (options.status) {
        newCoupons = newCoupons.filter(c => getStatus(c) === options.status);
      }

      if (isLoadMore) {
        setCoupons((prev) => [...prev, ...newCoupons]);
      } else {
        setCoupons(newCoupons);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch coupons'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.status, pageLimit, lastDoc]);

  useEffect(() => {
    fetchCoupons();
  }, [options.shopId, options.status]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchCoupons(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchCoupons();
  };

  const createCoupon = async (data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTIONS.COUPONS), {
      ...data,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await refresh();
    return docRef.id;
  };

  const updateCoupon = async (id: string, data: Partial<Coupon>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.COUPONS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.id === id ? { ...coupon, ...data, updatedAt: new Date() } : coupon
      )
    );
  };

  const deleteCoupon = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await deleteDoc(doc(db, COLLECTIONS.COUPONS, id));
    setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
  };

  return { coupons, isLoading, error, hasMore, loadMore, refresh, createCoupon, updateCoupon, deleteCoupon };
}

export function useCoupon(couponId: string | null) {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!couponId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchCoupon = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.COUPONS, couponId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCoupon({
            id: docSnap.id,
            ...data,
            startsAt: data.startsAt?.toDate(),
            expiresAt: data.expiresAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Coupon);
        } else {
          setCoupon(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch coupon'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupon();
  }, [couponId]);

  return { coupon, isLoading, error };
}
