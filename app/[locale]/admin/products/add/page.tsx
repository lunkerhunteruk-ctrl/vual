'use client';

import { useState, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductForm, ModelCasting } from '@/components/admin/products';
import type { ProductFormRef } from '@/components/admin/products/ProductForm';

export default function AddProductPage() {
  const t = useTranslations('admin.products');
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef<ProductFormRef>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const saveProduct = async (status: 'draft' | 'published') => {
    if (!formRef.current) {
      alert('フォームの初期化エラー');
      return;
    }

    const validation = formRef.current.validate();
    if (!validation.valid) {
      alert(validation.errors.join('\n'));
      return;
    }

    const data = formRef.current.getData();

    const isPublish = status === 'published';
    if (isPublish) {
      setIsPublishing(true);
    } else {
      setIsSaving(true);
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }

      if (isPublish) {
        alert(locale === 'ja' ? '商品を公開しました' : 'Product published successfully');
        router.push(`/${locale}/admin/products`);
      } else {
        alert(locale === 'ja' ? '下書きを保存しました' : 'Draft saved successfully');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert(locale === 'ja' ? '保存に失敗しました' : 'Failed to save');
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = () => saveProduct('draft');
  const handlePublish = () => saveProduct('published');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
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

      {/* Product Form */}
      <ProductForm ref={formRef} />

      {/* Divider */}
      <div className="border-t border-[var(--color-line)]" />

      {/* Model Casting - VUAL Core Feature */}
      <ModelCasting />

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
