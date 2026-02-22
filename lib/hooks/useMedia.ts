import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, COLLECTIONS } from '@/lib/firebase';
import type { MediaItem } from '@/lib/types';

type MediaType = 'image' | 'video';

interface UseMediaOptions {
  shopId?: string;
  productId?: string;
  type?: MediaType;
  limit?: number;
}

interface UseMediaReturn {
  media: MediaItem[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  uploadMedia: (file: File, metadata?: { productId?: string; productName?: string }) => Promise<MediaItem>;
  updateMedia: (id: string, data: Partial<MediaItem>) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;
}

export function useMedia(options: UseMediaOptions = {}): UseMediaReturn {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 30;

  const fetchMedia = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.MEDIA),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.productId) {
        q = query(q, where('productId', '==', options.productId));
      }

      if (options.type) {
        q = query(q, where('type', '==', options.type));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newMedia = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as MediaItem[];

      if (isLoadMore) {
        setMedia((prev) => [...prev, ...newMedia]);
      } else {
        setMedia(newMedia);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch media'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.productId, options.type, pageLimit, lastDoc]);

  useEffect(() => {
    fetchMedia();
  }, [options.shopId, options.productId, options.type]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchMedia(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchMedia();
  };

  const uploadMedia = async (file: File, metadata?: { productId?: string; productName?: string }): Promise<MediaItem> => {
    if (!db || !storage) throw new Error('Firebase not initialized');
    if (!options.shopId) throw new Error('Shop ID is required for upload');

    // Determine media type
    const type: MediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const storagePath = `shops/${options.shopId}/media/${filename}`;

    // Upload to storage
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Get image dimensions if it's an image
    let width: number | undefined;
    let height: number | undefined;
    if (type === 'image') {
      const dimensions = await getImageDimensions(file);
      width = dimensions.width;
      height = dimensions.height;
    }

    // Create database record
    const now = new Date();
    const mediaData = {
      shopId: options.shopId,
      url,
      name: file.name,
      type,
      mimeType: file.type,
      size: file.size,
      width,
      height,
      productId: metadata?.productId,
      productName: metadata?.productName,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.MEDIA), mediaData);

    const newItem: MediaItem = {
      id: docRef.id,
      ...mediaData,
    };

    setMedia((prev) => [newItem, ...prev]);

    return newItem;
  };

  const updateMedia = async (id: string, data: Partial<MediaItem>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.MEDIA, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setMedia((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...data, updatedAt: new Date() } : item
      )
    );
  };

  const deleteMedia = async (id: string): Promise<void> => {
    if (!db || !storage) throw new Error('Firebase not initialized');

    // Find the media item to get its URL
    const item = media.find(m => m.id === id);
    if (item) {
      try {
        // Delete from storage
        const storageRef = ref(storage, item.url);
        await deleteObject(storageRef);
      } catch (err) {
        // Storage deletion might fail if URL is different format, continue anyway
        console.warn('Failed to delete from storage:', err);
      }
    }

    // Delete from database
    await deleteDoc(doc(db, COLLECTIONS.MEDIA, id));
    setMedia((prev) => prev.filter((item) => item.id !== id));
  };

  return { media, isLoading, error, hasMore, loadMore, refresh, uploadMedia, updateMedia, deleteMedia };
}

export function useMediaItem(mediaId: string | null) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!mediaId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchItem = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.MEDIA, mediaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setItem({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as MediaItem);
        } else {
          setItem(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch media item'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
  }, [mediaId]);

  return { item, isLoading, error };
}

// Helper function to get image dimensions
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
