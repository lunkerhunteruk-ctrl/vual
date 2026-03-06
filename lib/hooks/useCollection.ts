import { useState, useEffect, useCallback, useMemo } from 'react';

export interface CollectionLookProduct {
  id: string;
  product_id: string;
  position: number;
  products: {
    id: string;
    name: string;
    base_price: number;
    currency: string;
    tax_included: boolean;
    category?: string;
    brand?: string;
    images: { url: string; color?: string }[];
    status: string;
  };
}

export interface CollectionLook {
  id: string;
  store_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  show_credits: boolean;
  video_prompt_veo: string | null;
  video_prompt_kling: string | null;
  telop_caption_ja: string | null;
  telop_caption_en: string | null;
  shot_duration_sec: number;
  video_clip_url: string | null;
  editorial_group_id: string | null;
  bundle_id: string | null;
  bundle_position: number;
  source_model_image_id: string | null;
  source_gemini_result_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  collection_look_products: CollectionLookProduct[];
}

export interface CollectionBundle {
  id: string;
  looks: CollectionLook[];
  position: number; // position of first look in bundle
}

export type CollectionItem =
  | { type: 'single'; look: CollectionLook }
  | { type: 'bundle'; bundle: CollectionBundle };

/**
 * Group looks into CollectionItems (singles + bundles)
 */
function groupLooksIntoItems(looks: CollectionLook[]): CollectionItem[] {
  const bundleMap = new Map<string, CollectionLook[]>();
  const singles: CollectionLook[] = [];

  for (const look of looks) {
    if (look.bundle_id) {
      const existing = bundleMap.get(look.bundle_id) || [];
      existing.push(look);
      bundleMap.set(look.bundle_id, existing);
    } else {
      singles.push(look);
    }
  }

  const items: CollectionItem[] = [];

  // Add singles
  for (const look of singles) {
    items.push({ type: 'single', look });
  }

  // Add bundles
  for (const [bundleId, bundleLooks] of bundleMap) {
    bundleLooks.sort((a, b) => a.bundle_position - b.bundle_position);
    items.push({
      type: 'bundle',
      bundle: {
        id: bundleId,
        looks: bundleLooks,
        position: Math.min(...bundleLooks.map(l => l.position)),
      },
    });
  }

  // Sort by position
  items.sort((a, b) => {
    const posA = a.type === 'single' ? a.look.position : a.bundle.position;
    const posB = b.type === 'single' ? b.look.position : b.bundle.position;
    return posA - posB;
  });

  return items;
}

export function useCollection() {
  const [looks, setLooks] = useState<CollectionLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const items = useMemo(() => groupLooksIntoItems(looks), [looks]);

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
    title?: string;
    description?: string;
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
      await fetchLooks();
    }
  };

  const updateLook = async (id: string, updates: { title?: string; description?: string; show_credits?: boolean; video_prompt_veo?: string; video_prompt_kling?: string; telop_caption_ja?: string; telop_caption_en?: string; shot_duration_sec?: number }) => {
    const res = await fetch('/api/collections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error('Failed to update look');
    setLooks(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Bundle management
  const createBundle = async (lookIds: string[]) => {
    const res = await fetch('/api/collections/bundles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookIds }),
    });
    if (!res.ok) throw new Error('Failed to create bundle');
    await fetchLooks();
  };

  const deleteBundle = async (bundleId: string, lookIds: string[]) => {
    // Delete all looks in the bundle
    await Promise.all(lookIds.map(id =>
      fetch(`/api/collections?id=${id}`, { method: 'DELETE' })
    ));
    await fetchLooks();
  };

  const disbandBundle = async (bundleId: string) => {
    const res = await fetch(`/api/collections/bundles?id=${bundleId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to disband bundle');
    await fetchLooks();
  };

  const reorderBundleLooks = async (bundleId: string, lookIds: string[]) => {
    // Optimistic update
    setLooks(prev => prev.map(l => {
      if (l.bundle_id !== bundleId) return l;
      const newPos = lookIds.indexOf(l.id);
      return newPos >= 0 ? { ...l, bundle_position: newPos } : l;
    }));

    const res = await fetch('/api/collections/bundles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId, lookIds }),
    });
    if (!res.ok) {
      await fetchLooks();
    }
  };

  const regenerateLook = async (lookId: string, customPrompt: string): Promise<{ success: boolean; newImageUrl?: string; copy?: any }> => {
    const res = await fetch('/api/collections/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lookId, customPrompt }),
    });
    const data = await res.json();
    if (data.success) {
      // Refresh looks to pick up the new image and copy data
      await fetchLooks();
    }
    return data;
  };

  return {
    looks,
    items,
    isLoading,
    addLook,
    updateLook,
    deleteLook,
    deleteBundle,
    reorderLooks,
    createBundle,
    disbandBundle,
    reorderBundleLooks,
    regenerateLook,
    refetch: fetchLooks,
  };
}

// Customer-facing hook
export function useCustomerCollection() {
  const [looks, setLooks] = useState<CollectionLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const items = useMemo(() => groupLooksIntoItems(looks), [looks]);

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

  return { looks, items, isLoading };
}
