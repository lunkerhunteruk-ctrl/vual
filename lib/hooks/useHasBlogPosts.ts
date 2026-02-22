import { useState, useEffect } from 'react';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

/**
 * Hook to check if there are any published blog posts
 * Used to conditionally show/hide blog-related UI elements
 */
export function useHasBlogPosts() {
  const [hasPosts, setHasPosts] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPosts = async () => {
      if (!db) {
        setHasPosts(false);
        setIsLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, COLLECTIONS.BLOG_POSTS),
          where('isPublished', '==', true),
          limit(1)
        );

        const snapshot = await getDocs(q);
        setHasPosts(snapshot.docs.length > 0);
      } catch (err) {
        console.error('Failed to check blog posts:', err);
        setHasPosts(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPosts();
  }, []);

  return { hasPosts, isLoading };
}
