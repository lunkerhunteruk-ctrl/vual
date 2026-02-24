import { useState, useEffect, useCallback } from 'react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  author_name?: string;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

interface UseBlogPostsOptions {
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
  createPost: (data: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updatePost: (id: string, data: Partial<BlogPost>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  publishPost: (id: string) => Promise<void>;
  unpublishPost: (id: string) => Promise<void>;
}

export function useBlogPosts(options: UseBlogPostsOptions = {}): UseBlogPostsReturn {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.category) {
        params.set('category', options.category);
      }

      if (options.isPublished !== undefined) {
        params.set('isPublished', options.isPublished.toString());
      }

      const response = await fetch(`/api/blog?${params.toString()}`);
      const data = await response.json();

      if (data.posts) {
        setPosts(data.posts);
        setHasMore(data.posts.length >= pageLimit);
      } else {
        setPosts([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch blog posts'));
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.isPublished, pageLimit]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchPosts();
  };

  const createPost = async (data: Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    const response = await fetch('/api/blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create blog post');
    }

    const result = await response.json();
    await refresh();
    return result.id;
  };

  const updatePost = async (id: string, data: Partial<BlogPost>): Promise<void> => {
    const response = await fetch('/api/blog', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });

    if (!response.ok) {
      throw new Error('Failed to update blog post');
    }

    setPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, ...data } : post
      )
    );
  };

  const deletePost = async (id: string): Promise<void> => {
    const response = await fetch(`/api/blog?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete blog post');
    }

    setPosts((prev) => prev.filter((post) => post.id !== id));
  };

  const publishPost = async (id: string): Promise<void> => {
    await updatePost(id, {
      is_published: true,
      published_at: new Date().toISOString(),
    });
  };

  const unpublishPost = async (id: string): Promise<void> => {
    await updatePost(id, {
      is_published: false,
    });
  };

  return { posts, isLoading, error, hasMore, loadMore, refresh, createPost, updatePost, deletePost, publishPost, unpublishPost };
}

export function useBlogPost(postId: string | null) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) {
      setIsLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/blog?id=${postId}`);
        const data = await response.json();

        if (data && data.id) {
          setPost(data);
        } else {
          setPost(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch blog post'));
        setPost(null);
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
