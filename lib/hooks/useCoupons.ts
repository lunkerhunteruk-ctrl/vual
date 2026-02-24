import { useState, useEffect, useCallback } from 'react';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_purchase?: number;
  max_uses?: number;
  used_count: number;
  starts_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

type CouponStatus = 'active' | 'expired' | 'scheduled';

interface UseCouponsOptions {
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
  createCoupon: (data: Omit<Coupon, 'id' | 'created_at' | 'used_count'>) => Promise<string>;
  updateCoupon: (id: string, data: Partial<Coupon>) => Promise<void>;
  deleteCoupon: (id: string) => Promise<void>;
}

const getStatus = (coupon: Coupon): CouponStatus => {
  const now = new Date();
  if (coupon.starts_at && new Date(coupon.starts_at) > now) return 'scheduled';
  if ((coupon.expires_at && new Date(coupon.expires_at) < now) || !coupon.is_active) return 'expired';
  return 'active';
};

export function useCoupons(options: UseCouponsOptions = {}): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchCoupons = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      const response = await fetch(`/api/coupons?${params.toString()}`);
      const data = await response.json();

      if (data.coupons) {
        let filteredCoupons = data.coupons;

        // Filter by status on client side
        if (options.status) {
          filteredCoupons = filteredCoupons.filter((c: Coupon) => getStatus(c) === options.status);
        }

        setCoupons(filteredCoupons);
        setHasMore(data.coupons.length >= pageLimit);
      } else {
        setCoupons([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch coupons'));
      setCoupons([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.status, pageLimit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchCoupons();
  };

  const createCoupon = async (data: Omit<Coupon, 'id' | 'created_at' | 'used_count'>): Promise<string> => {
    const response = await fetch('/api/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create coupon');
    }

    const result = await response.json();
    await refresh();
    return result.id;
  };

  const updateCoupon = async (id: string, data: Partial<Coupon>): Promise<void> => {
    const response = await fetch('/api/coupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      throw new Error('Failed to update coupon');
    }

    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.id === id ? { ...coupon, ...data } : coupon
      )
    );
  };

  const deleteCoupon = async (id: string): Promise<void> => {
    const response = await fetch(`/api/coupons?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete coupon');
    }

    setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
  };

  return { coupons, isLoading, error, hasMore, loadMore, refresh, createCoupon, updateCoupon, deleteCoupon };
}

export function useCoupon(couponId: string | null) {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!couponId) {
      setIsLoading(false);
      return;
    }

    const fetchCoupon = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/coupons?id=${couponId}`);
        const data = await response.json();

        if (data && data.id) {
          setCoupon(data);
        } else {
          setCoupon(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch coupon'));
        setCoupon(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCoupon();
  }, [couponId]);

  return { coupon, isLoading, error };
}
