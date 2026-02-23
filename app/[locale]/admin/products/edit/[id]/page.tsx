'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { Save, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function EditProductPage() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('apparel');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('draft');

  // Load product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products?id=${productId}`);
        const data = await response.json();
        if (data && data.id) {
          setProduct(data);
          setName(data.name || '');
          setDescription(data.description || '');
          setCategory(data.category || 'apparel');
          setPrice(data.base_price?.toString() || '');
          setStatus(data.status || 'draft');
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

  const handleSave = async (newStatus?: string) => {
    const targetStatus = newStatus || status;
    const isPublish = targetStatus === 'published';

    if (isPublish) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }

    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          name,
          description,
          category,
          price: parseInt(price) || 0,
          status: targetStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      alert(locale === 'ja' ? '保存しました' : 'Saved successfully');
      router.push(`/${locale}/admin/products`);
    } catch (error) {
      console.error('Save error:', error);
      alert(locale === 'ja' ? '保存に失敗しました' : 'Failed to save');
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/admin/products`} className="flex items-center gap-2 text-sm text-[var(--color-text-body)] hover:text-[var(--color-title-active)]">
          <ArrowLeft size={16} />
          {locale === 'ja' ? '商品一覧に戻る' : 'Back to products'}
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Save size={16} />}
            onClick={() => handleSave()}
            isLoading={isSaving}
            disabled={isPublishing}
          >
            {t('saveToDraft')}
          </Button>
          <Button
            variant="primary"
            leftIcon={<Upload size={16} />}
            onClick={() => handleSave('published')}
            isLoading={isPublishing}
            disabled={isSaving}
          >
            {t('publishProduct')}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6">
        <h2 className="text-lg font-semibold text-[var(--color-title-active)] mb-6">
          {locale === 'ja' ? '商品を編集' : 'Edit Product'}
        </h2>

        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
              {t('productName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
              {t('productDescription')}
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                {t('category') || 'カテゴリー'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)]"
              >
                <option value="apparel">Apparel</option>
                <option value="dress">Dress</option>
                <option value="outer">Outer</option>
                <option value="knitwear">Knitwear</option>
                <option value="pants">Pants</option>
                <option value="bag">Bag</option>
                <option value="shoes">Shoes</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
                {t('productPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-label)]">¥</span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full h-10 pl-8 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-body)] mb-1.5">
              {t('status') || 'ステータス'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 px-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-accent)]"
            >
              <option value="draft">{locale === 'ja' ? '下書き' : 'Draft'}</option>
              <option value="published">{locale === 'ja' ? '公開' : 'Published'}</option>
              <option value="archived">{locale === 'ja' ? 'アーカイブ' : 'Archived'}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
