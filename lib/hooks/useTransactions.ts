import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Transaction } from '@/lib/types';

type TransactionStatus = 'pending' | 'completed' | 'failed';

interface UseTransactionsOptions {
  shopId?: string;
  orderId?: string;
  status?: TransactionStatus;
  limit?: number;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useTransactions(options: UseTransactionsOptions = {}): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchTransactions = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.orderId) {
        q = query(q, where('orderId', '==', options.orderId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newTransactions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as Transaction[];

      if (isLoadMore) {
        setTransactions((prev) => [...prev, ...newTransactions]);
      } else {
        setTransactions(newTransactions);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.orderId, options.status, pageLimit, lastDoc]);

  useEffect(() => {
    fetchTransactions();
  }, [options.shopId, options.orderId, options.status]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchTransactions(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchTransactions();
  };

  return { transactions, isLoading, error, hasMore, loadMore, refresh };
}

export function useTransaction(transactionId: string | null) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!transactionId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchTransaction = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.TRANSACTIONS, transactionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTransaction({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
          } as Transaction);
        } else {
          setTransaction(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch transaction'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  return { transaction, isLoading, error };
}
