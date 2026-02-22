'use client';

import { useTranslations } from 'next-intl';
import { Save, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { ProductForm, ModelCasting } from '@/components/admin/products';

export default function AddProductPage() {
  const t = useTranslations('admin.products');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" leftIcon={<Save size={16} />}>
          {t('saveToDraft')}
        </Button>
        <Button variant="primary" leftIcon={<Upload size={16} />}>
          {t('publishProduct')}
        </Button>
      </div>

      {/* Product Form */}
      <ProductForm />

      {/* Divider */}
      <div className="border-t border-[var(--color-line)]" />

      {/* Model Casting - VUAL Core Feature */}
      <ModelCasting />

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="secondary" size="lg" leftIcon={<Save size={18} />}>
          {t('saveToDraft')}
        </Button>
        <Button variant="primary" size="lg" leftIcon={<Upload size={18} />}>
          {t('publishProduct')}
        </Button>
      </div>
    </div>
  );
}
