import { useState, useEffect, useCallback } from 'react';

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  line_user_id?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface UseCustomersOptions {
  search?: string;
  limit?: number;
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
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.search) {
        params.set('search', options.search);
      }

      const response = await fetch(`/api/customers?${params.toString()}`);
      const data = await response.json();

      if (data.customers) {
        setCustomers(data.customers);
        setHasMore(data.customers.length >= pageLimit);
      } else {
        setCustomers([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch customers'));
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.search, pageLimit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchCustomers();
  };

  return { customers, isLoading, error, hasMore, loadMore, refresh };
}

export function useCustomer(customerId: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!customerId) {
      setIsLoading(false);
      return;
    }

    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/customers?id=${customerId}`);
        const data = await response.json();

        if (data && data.id) {
          setCustomer(data);
        } else {
          setCustomer(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch customer'));
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId]);

  return { customer, isLoading, error };
}
