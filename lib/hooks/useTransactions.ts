import { useState, useEffect, useCallback } from 'react';

type TransactionStatus = 'pending' | 'completed' | 'failed';
type TransactionType = 'payment' | 'refund' | 'payout';

interface Transaction {
  id: string;
  order_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  stripe_payment_intent_id?: string;
  metadata?: any;
  created_at: string;
}

interface UseTransactionsOptions {
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
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.orderId) {
        params.set('orderId', options.orderId);
      }

      if (options.status) {
        params.set('status', options.status);
      }

      const response = await fetch(`/api/transactions?${params.toString()}`);
      const data = await response.json();

      if (data.transactions) {
        setTransactions(data.transactions);
        setHasMore(data.transactions.length >= pageLimit);
      } else {
        setTransactions([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch transactions'));
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.orderId, options.status, pageLimit]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchTransactions();
  };

  return { transactions, isLoading, error, hasMore, loadMore, refresh };
}

export function useTransaction(transactionId: string | null) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setIsLoading(false);
      return;
    }

    const fetchTransaction = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/transactions?id=${transactionId}`);
        const data = await response.json();

        if (data && data.id) {
          setTransaction(data);
        } else {
          setTransaction(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch transaction'));
        setTransaction(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  return { transaction, isLoading, error };
}
