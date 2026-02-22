import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Customer } from '@/lib/types';

interface UseCustomersOptions {
  shopId?: string;
  isVip?: boolean;
  limit?: number;
  searchQuery?: string;
}

interface UseCustomersReturn {
  customers: Customer[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchCustomers = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.CUSTOMERS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.isVip !== undefined) {
        q = query(q, where('isVip', '==', options.isVip));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newCustomers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastPurchaseAt: doc.data().lastPurchaseAt?.toDate(),
      })) as Customer[];

      if (isLoadMore) {
        setCustomers((prev) => [...prev, ...newCustomers]);
      } else {
        setCustomers(newCustomers);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch customers'));
    } finally {
      setIsLoading(false);
    }
  }, [options.isVip, pageLimit, lastDoc]);

  useEffect(() => {
    fetchCustomers();
  }, [options.isVip]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchCustomers(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchCustomers();
  };

  return { customers, isLoading, error, hasMore, loadMore, refresh };
}

export function useCustomer(customerId: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!customerId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.CUSTOMERS, customerId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCustomer({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            lastPurchaseAt: data.lastPurchaseAt?.toDate(),
          } as Customer);
        } else {
          setCustomer(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch customer'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  return { customer, isLoading, error };
}
