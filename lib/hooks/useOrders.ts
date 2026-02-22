import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Order, OrderStatus } from '@/lib/types';

interface UseOrdersOptions {
  shopId?: string;
  customerId?: string;
  status?: OrderStatus;
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
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchOrders = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.ORDERS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.customerId) {
        q = query(q, where('customerId', '==', options.customerId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newOrders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        paidAt: doc.data().paidAt?.toDate(),
        shippedAt: doc.data().shippedAt?.toDate(),
        deliveredAt: doc.data().deliveredAt?.toDate(),
        cancelledAt: doc.data().cancelledAt?.toDate(),
      })) as Order[];

      if (isLoadMore) {
        setOrders((prev) => [...prev, ...newOrders]);
      } else {
        setOrders(newOrders);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.customerId, options.status, pageLimit, lastDoc]);

  useEffect(() => {
    fetchOrders();
  }, [options.shopId, options.customerId, options.status]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchOrders(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (!db) return;

    try {
      const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
      const updateData: Record<string, Date | OrderStatus> = {
        status,
        updatedAt: new Date(),
      };

      // Add timestamp for specific status changes
      switch (status) {
        case 'shipped':
          updateData.shippedAt = new Date();
          break;
        case 'delivered':
          updateData.deliveredAt = new Date();
          break;
        case 'cancelled':
          updateData.cancelledAt = new Date();
          break;
      }

      await updateDoc(orderRef, updateData);

      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status, ...updateData } : order
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

  useEffect(() => {
    if (!orderId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.ORDERS, orderId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrder({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            paidAt: data.paidAt?.toDate(),
            shippedAt: data.shippedAt?.toDate(),
            deliveredAt: data.deliveredAt?.toDate(),
            cancelledAt: data.cancelledAt?.toDate(),
          } as Order);
        } else {
          setOrder(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch order'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  return { order, isLoading, error };
}
