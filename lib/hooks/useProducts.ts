import { useState, useEffect, useCallback } from 'react';

interface Product {
  id: string;
  store_id: string;
  name: string;
  name_en?: string;
  description?: string;
  category: string;
  tags?: string[];
  base_price: number;
  price: number; // Alias for base_price for compatibility
  discounted_price?: number;
  currency: string;
  tax_included: boolean;
  status: 'draft' | 'published' | 'archived';
  is_highlighted: boolean;
  size_specs?: any;
  created_at: string;
  updated_at: string;
  // Compatibility fields
  brand?: string;
  sku?: string;
  stockQuantity?: number;
  stockStatus?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  materials?: string;
  care?: string;
  images?: { url: string; color?: string; is_primary?: boolean }[];
  variants?: { id: string; color?: string; size?: string; stock: number; options?: { color?: string; size?: string } }[];
  product_images?: { id: string; url: string; is_primary: boolean; color?: string }[];
  product_variants?: { id: string; color?: string; size?: string; stock: number }[];
}

interface UseProductsOptions {
  shopId?: string;
  category?: string;
  brandId?: string;
  limit?: number;
  featured?: boolean;
  status?: string;
}

interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Transform Supabase product to compatible format
function transformProduct(p: any): Product {
  return {
    ...p,
    price: p.base_price,
    isPublished: p.status === 'published',
    isFeatured: p.is_highlighted,
    stockQuantity: p.product_variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0,
    stockStatus: 'in_stock',
    images: p.product_images?.map((img: any) => ({
      url: img.url,
      color: img.color,
      is_primary: img.is_primary,
    })) || [],
    variants: p.product_variants?.map((v: any) => ({
      id: v.id,
      color: v.color,
      size: v.size,
      stock: v.stock,
      options: { color: v.color, size: v.size },
    })) || [],
  };
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const pageLimit = options.limit || 20;

  const enabled = options.limit !== 0;

  const fetchProducts = useCallback(async () => {
    if (!enabled) {
      setProducts([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set('limit', pageLimit.toString());

      if (options.category) {
        params.set('category', options.category);
      }

      if (options.brandId) {
        params.set('brand_id', options.brandId);
      }

      if (options.status) {
        params.set('status', options.status);
      } else {
        params.set('status', 'published');
      }

      const response = await fetch(`/api/products?${params.toString()}`);
      const data = await response.json();

      if (data.products) {
        const transformed = data.products.map(transformProduct);
        setProducts(transformed);
        setHasMore(transformed.length >= pageLimit);
      } else {
        setProducts([]);
        setHasMore(false);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.brandId, options.status, pageLimit, enabled]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const loadMore = async () => {
    // Pagination not implemented yet
  };

  const refresh = async () => {
    await fetchProducts();
  };

  return { products, isLoading, error, hasMore, loadMore, refresh };
}

export function useProduct(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/products?id=${productId}`);
        const data = await response.json();

        if (data && data.id) {
          setProduct(transformProduct(data));
        } else {
          setProduct(null);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch product'));
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, isLoading, error };
}
