import { useState, useEffect, useCallback } from 'react';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  customer_id?: string;
  customer_email: string;
  customer_name: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shipping_address: any;
  billing_address?: any;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

interface UseOrdersOptions {
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
}

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
}

export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.status) {
        params.set('status', options.status);
      }

      if (options.customerId) {
        params.set('customerId', options.customerId);
      }

      const response = await fetch(`/api/orders?${params.toString()}`);
      const data = await response.json();

      if (data.orders) {
        setOrders(data.orders);
        setHasMore(data.orders.length >= pageLimit);
      } else {
        setOrders([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.status, options.customerId, pageLimit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update order status');
    }
  };

  return { orders, isLoading, error, hasMore, loadMore, refresh, updateOrderStatus };
}

export function useOrder(orderId: string | null) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/orders?id=${orderId}`);
        const data = await response.json();

        if (data && data.id) {
          setOrder(data);
        } else {
          setOrder(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch order'));
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { order, isLoading, error, refresh };
}
