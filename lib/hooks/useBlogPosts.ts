import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { BlogPost } from '@/lib/types';

interface UseBlogPostsOptions {
  shopId?: string;
  category?: string;
  isPublished?: boolean;
  limit?: number;
}

interface UseBlogPostsReturn {
  posts: BlogPost[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  createPost: (data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePost: (id: string, data: Partial<BlogPost>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  publishPost: (id: string) => Promise<void>;
  unpublishPost: (id: string) => Promise<void>;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}): UseBlogPostsReturn {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const pageLimit = options.limit || 20;

  const fetchPosts = useCallback(async (isLoadMore = false) => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      let q = query(
        collection(db, COLLECTIONS.BLOG_POSTS),
        orderBy('createdAt', 'desc'),
        limit(pageLimit)
      );

      if (options.shopId) {
        q = query(q, where('shopId', '==', options.shopId));
      }

      if (options.category) {
        q = query(q, where('category', '==', options.category));
      }

      if (options.isPublished !== undefined) {
        q = query(q, where('isPublished', '==', options.isPublished));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const newPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        publishedAt: doc.data().publishedAt?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as BlogPost[];

      if (isLoadMore) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageLimit);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blog posts'));
    } finally {
      setIsLoading(false);
    }
  }, [options.shopId, options.category, options.isPublished, pageLimit, lastDoc]);

  useEffect(() => {
    fetchPosts();
  }, [options.shopId, options.category, options.isPublished]);

  const loadMore = async () => {
    if (!isLoading && hasMore) {
      await fetchPosts(true);
    }
  };

  const refresh = async () => {
    setLastDoc(null);
    setHasMore(true);
    await fetchPosts();
  };

  const createPost = async (data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!db) throw new Error('Database not initialized');

    const now = new Date();
    const docRef = await addDoc(collection(db, COLLECTIONS.BLOG_POSTS), {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    await refresh();
    return docRef.id;
  };

  const updatePost = async (id: string, data: Partial<BlogPost>): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    const docRef = doc(db, COLLECTIONS.BLOG_POSTS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });

    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, ...data, updatedAt: new Date() } : post
      )
    );
  };

  const deletePost = async (id: string): Promise<void> => {
    if (!db) throw new Error('Database not initialized');

    await deleteDoc(doc(db, COLLECTIONS.BLOG_POSTS, id));
    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  const publishPost = async (id: string): Promise<void> => {
    await updatePost(id, {
      isPublished: true,
      publishedAt: new Date(),
    });
  };

  const unpublishPost = async (id: string): Promise<void> => {
    await updatePost(id, {
      isPublished: false,
    });
  };

  return { posts, isLoading, error, hasMore, loadMore, refresh, createPost, updatePost, deletePost, publishPost, unpublishPost };
}

export function useBlogPost(postId: string | null) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId || !db) {
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, COLLECTIONS.BLOG_POSTS, postId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setPost({
            id: docSnap.id,
            ...data,
            publishedAt: data.publishedAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as BlogPost);
        } else {
          setPost(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch blog post'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  return { post, isLoading, error };
}

// Get blog categories
export function useBlogCategories() {
  const categories = [
    'Fashion',
    'Style Guide',
    'Technology',
    'Sustainability',
    'Collection',
    'Lookbook',
    'Promo',
    'Policy',
  ];

  return { categories };
}
