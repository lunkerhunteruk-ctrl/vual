'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Save, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { ProductForm } from '@/components/admin/products';
import type { ProductFormRef } from '@/components/admin/products/ProductForm';

export default function EditProductPage() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const formRef = useRef<ProductFormRef>(null);

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products?id=${productId}`);
        const data = await response.json();
        if (data && data.id) {
          setProduct(data);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const saveProduct = async (status: 'draft' | 'published') => {
    if (!formRef.current) return;

    const validation = formRef.current.validate();
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    setError(null);
    const isPublish = status === 'published';
    if (isPublish) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }

    try {
      const data = await formRef.current.getDataWithUpload();

      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId, ...data, status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      router.push(`/${locale}/admin/products`);
    } catch (error) {
      console.error('Save error:', error);
      setError(locale === 'ja' ? '保存に失敗しました' : 'Failed to save');
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => saveProduct('draft');
  const handlePublish = () => saveProduct('published');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-text-label)]">
          {locale === 'ja' ? '商品が見つかりません' : 'Product not found'}
        </p>
        <Link href={`/${locale}/admin/products`} className="mt-4 inline-block">
          <Button variant="secondary">
            {locale === 'ja' ? '一覧に戻る' : 'Back to list'}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/admin/products`} className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)]">
          <ArrowLeft size={16} />
          {locale === 'ja' ? '商品一覧に戻る' : 'Back to products'}
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Save size={16} />}
            onClick={handleSaveDraft}
            isLoading={isSaving}
            disabled={isPublishing}
          >
            {t('saveToDraft')}
          </Button>
          <Button
            variant="primary"
            leftIcon={<Upload size={16} />}
            onClick={handlePublish}
            isLoading={isPublishing}
            disabled={isSaving}
          >
            {t('publishProduct')}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[var(--radius-md)] px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Page Title */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4">
        <h2 className="text-lg font-semibold text-[var(--color-title-active)]">
          {locale === 'ja' ? '商品を編集' : 'Edit Product'}: {product.name}
        </h2>
        <p className="text-sm text-[var(--color-text-label)] mt-1">
          ID: {productId}
        </p>
      </div>

      {/* Product Form - Same as Add page */}
      <ProductForm ref={formRef} productId={productId} initialData={product} />

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          variant="secondary"
          size="lg"
          leftIcon={<Save size={18} />}
          onClick={handleSaveDraft}
          isLoading={isSaving}
          disabled={isPublishing}
        >
          {t('saveToDraft')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          leftIcon={<Upload size={18} />}
          onClick={handlePublish}
          isLoading={isPublishing}
          disabled={isSaving}
        >
          {t('publishProduct')}
        </Button>
      </div>
    </div>
  );
}
