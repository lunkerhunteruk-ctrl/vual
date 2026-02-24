import { useState, useEffect, useCallback } from 'react';

type MediaType = 'image' | 'video';
type UsageTag = 'product' | 'lp' | 'blog' | 'video' | 'other';

interface MediaItem {
  id: string;
  product_id?: string;
  url: string;
  name: string;
  type: MediaType;
  usage_tag?: UsageTag;
  mime_type?: string;
  size?: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
}

interface UseMediaOptions {
  productId?: string;
  type?: MediaType;
  usageTag?: UsageTag;
  limit?: number;
}

interface UseMediaReturn {
  media: MediaItem[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  uploadMedia: (file: File, metadata?: { productId?: string; usageTag?: UsageTag }) => Promise<MediaItem>;
  updateMedia: (id: string, data: Partial<MediaItem>) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;
}

export function useMedia(options: UseMediaOptions = {}): UseMediaReturn {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 30;

  const fetchMedia = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.productId) {
        params.set('productId', options.productId);
      }

      if (options.type) {
        params.set('type', options.type);
      }

      if (options.usageTag) {
        params.set('usage_tag', options.usageTag);
      }

      const response = await fetch(`/api/media?${params.toString()}`);
      const data = await response.json();

      if (data.media) {
        setMedia(data.media);
        setHasMore(data.media.length >= pageLimit);
      } else {
        setMedia([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch media'));
      setMedia([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.productId, options.type, options.usageTag, pageLimit]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchMedia();
  };

  const uploadMedia = async (file: File, metadata?: { productId?: string; usageTag?: UsageTag }): Promise<MediaItem> => {
    const type: MediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // 1. Upload file to Supabase Storage via /api/upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'media');

    const uploadRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload file');
    }

    const uploadData = await uploadRes.json();
    if (!uploadData.url || uploadData.mock) {
      throw new Error('Upload returned no URL');
    }

    // 2. Create database record via /api/media
    const response = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: file.name,
        type,
        mime_type: file.type,
        size: file.size,
        url: uploadData.url,
        product_id: metadata?.productId || null,
        usage_tag: metadata?.usageTag || 'other',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create media record');
    }

    const result = await response.json();
    setMedia((prev) => [result, ...prev]);
    return result;
  };

  const updateMedia = async (id: string, data: Partial<MediaItem>): Promise<void> => {
    const response = await fetch('/api/media', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      throw new Error('Failed to update media');
    }

    setMedia((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...data } : item
      )
    );
  };

  const deleteMedia = async (id: string): Promise<void> => {
    const response = await fetch(`/api/media?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete media');
    }

    setMedia((prev) => prev.filter((item) => item.id !== id));
  };

  return { media, isLoading, error, hasMore, loadMore, refresh, uploadMedia, updateMedia, deleteMedia };
}

export function useMediaItem(mediaId: string | null) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/media?id=${mediaId}`);
        const data = await response.json();

        if (data && data.id) {
          setItem(data);
        } else {
          setItem(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch media item'));
        setItem(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [mediaId]);

  return { item, isLoading, error };
}
