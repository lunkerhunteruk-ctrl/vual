import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, onSnapshot, doc, getDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { LiveStream } from '@/lib/types';

type StreamStatus = 'scheduled' | 'live' | 'ended' | 'test';

// Streams with status 'live' but updatedAt older than this are considered stale
const STALE_STREAM_HOURS = 12;

interface UseStreamsOptions {
  shopId?: string;
  status?: StreamStatus;
  limit?: number;
  /** Use real-time listener instead of one-time fetch (default: false) */
  realtime?: boolean;
}

interface UseStreamsReturn {
  streams: LiveStream[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

function docToStream(docSnap: DocumentSnapshot): LiveStream {
  const data = docSnap.data()!;
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
    scheduledAt: data.scheduledAt?.toDate(),
    startedAt: data.startedAt?.toDate(),
    endedAt: data.endedAt?.toDate(),
  } as LiveStream;
}

function filterStaleStreams(streams: LiveStream[], status?: StreamStatus): LiveStream[] {
  if (status !== 'live') return streams;
  const cutoff = new Date(Date.now() - STALE_STREAM_HOURS * 60 * 60 * 1000);
  return streams.filter(s => {
    const lastActive = s.updatedAt || s.startedAt || s.createdAt;
    return lastActive && lastActive > cutoff;
  });
}

export function useStreams(options: UseStreamsOptions = {}): UseStreamsReturn {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  // Build Firestore query
  const buildQuery = useCallback(() => {
    if (!db) return null;
    const constraints: any[] = [
      orderBy('createdAt', 'desc'),
      limit(pageLimit),
    ];
    if (options.shopId) constraints.push(where('shopId', '==', options.shopId));
    if (options.status) constraints.push(where('status', '==', options.status));
    return query(collection(db, COLLECTIONS.STREAMS), ...constraints);
  }, [options.shopId, options.status, pageLimit]);

  // Real-time listener mode
  useEffect(() => {
    if (!options.realtime || !db) return;

    const q = buildQuery();
    if (!q) return;

    setIsLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results = snapshot.docs.map(docToStream);
      setStreams(filterStaleStreams(results, options.status));
      setIsLoading(false);
      setError(null);
    }, (err) => {
      setError(err instanceof Error ? err : new Error('Failed to fetch streams'));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [options.realtime, options.shopId, options.status, buildQuery]);

  // One-time fetch mode
  const fetchStreams = useCallback(async (isLoadMore = false) => {
    if (!db || options.realtime) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = buildQuery();
      if (!q) return;

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newStreams = filterStaleStreams(snapshot.docs.map(docToStream), options.status);

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
  }, [options.shopId, options.status, options.realtime, pageLimit, lastDoc, buildQuery]);

  useEffect(() => {
    if (!options.realtime) {
      fetchStreams();
    }
  }, [options.shopId, options.status, options.realtime]);

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
