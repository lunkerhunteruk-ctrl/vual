import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { LiveStream } from '@/lib/types';

type StreamStatus = 'scheduled' | 'live' | 'ended';

interface UseStreamsOptions {
  shopId?: string;
  status?: StreamStatus;
  limit?: number;
}

interface UseStreamsReturn {
  streams: LiveStream[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStreams(options: UseStreamsOptions = {}): UseStreamsReturn {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchStreams = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.STREAMS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newStreams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        scheduledAt: doc.data().scheduledAt?.toDate(),
        startedAt: doc.data().startedAt?.toDate(),
        endedAt: doc.data().endedAt?.toDate(),
      })) as LiveStream[];

      if (isLoadMore) {
        setStreams((prev) => [...prev, ...newStreams]);
      } else {
        setStreams(newStreams);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch streams'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.status, pageLimit, lastDoc]);

  useEffect(() => {
    fetchStreams();
  }, [options.shopId, options.status]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchStreams(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchStreams();
  };

  return { streams, isLoading, error, hasMore, loadMore, refresh };
}

export function useStream(streamId: string | null) {
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!streamId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchStream = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.STREAMS, streamId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setStream({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            scheduledAt: data.scheduledAt?.toDate(),
            startedAt: data.startedAt?.toDate(),
            endedAt: data.endedAt?.toDate(),
          } as LiveStream);
        } else {
          setStream(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch stream'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStream();
  }, [streamId]);

  return { stream, isLoading, error };
}
