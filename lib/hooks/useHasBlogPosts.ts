import { useState, useEffect } from 'react';

/**
 * Hook to check if there are any published blog posts
 * Used to conditionally show/hide blog-related UI elements
 */
export function useHasBlogPosts() {
  const [hasPosts, setHasPosts] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPosts = async () => {
      try {
        const response = await fetch('/api/blog?isPublished=true&limit=1');
        const data = await response.json();
        setHasPosts(data.posts && data.posts.length > 0);
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
