import { useState, useEffect, useCallback } from 'react';

export interface CollectionLookProduct {
  id: string;
  product_id: string;
  position: number;
  products: {
    id: string;
    name: string;
    base_price: number;
    price: number;
    currency: string;
    tax_included: boolean;
    images: { url: string; color?: string }[];
    status: string;
  };
}

export interface CollectionLook {
  id: string;
  store_id: string;
  image_url: string;
  source_model_image_id: string | null;
  source_gemini_result_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  collection_look_products: CollectionLookProduct[];
}

export function useCollection() {
  const [looks, setLooks] = useState<CollectionLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLooks = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      setLooks(data.looks || []);
    } catch (err) {
      console.error('Failed to fetch collection:', err);
      setLooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLooks();
  }, [fetchLooks]);

  const addLook = async (payload: {
    imageUrl: string;
    sourceModelImageId?: string;
    sourceGeminiResultId?: string;
    productIds: string[];
  }) => {
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to add look');
    await fetchLooks();
  };

  const deleteLook = async (id: string) => {
    const res = await fetch(`/api/collections?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete look');
    await fetchLooks();
  };

  const reorderLooks = async (lookIds: string[]) => {
    // Optimistic update
    setLooks(prev => {
      const map = new Map(prev.map(l => [l.id, l]));
      return lookIds.map((id, i) => ({ ...map.get(id)!, position: i }));
    });

    const res = await fetch('/api/collections/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookIds }),
    });
    if (!res.ok) {
      await fetchLooks(); // Rollback on error
    }
  };

  return { looks, isLoading, addLook, deleteLook, reorderLooks, refetch: fetchLooks };
}

// Customer-facing hook
export function useCustomerCollection() {
  const [looks, setLooks] = useState<CollectionLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/customer/collection');
        const data = await res.json();
        setLooks(data.looks || []);
      } catch {
        setLooks([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { looks, isLoading };
}
