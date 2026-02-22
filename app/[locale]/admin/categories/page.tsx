'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui';
import { CategoriesGrid, CategoryProductsTable } from '@/components/admin/categories';

export default function CategoriesPage() {
  const t = useTranslations('admin.categories');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="primary" leftIcon={<Plus size={16} />}>
          {t('addProduct')}
        </Button>
        <Button variant="secondary" leftIcon={<MoreHorizontal size={16} />}>
          {t('moreAction')}
        </Button>
      </div>

      {/* Categories Grid */}
      <CategoriesGrid
        selectedCategory={selectedCategory}
        onCategorySelect={(cat) => setSelectedCategory(cat.id)}
      />

      {/* Products Table */}
      <CategoryProductsTable category={selectedCategory} />
    </div>
  );
}
