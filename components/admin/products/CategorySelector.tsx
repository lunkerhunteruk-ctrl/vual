'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import {
  categoryStructure,
  getCategoryPath,
  parseCategoryPath,
  type GenderType,
  type ProductType,
} from '@/lib/data/categories';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const t = useTranslations();

  // Parse the current value to get initial state
  const parsed = useMemo(() => parseCategoryPath(value), [value]);

  const [selectedGender, setSelectedGender] = useState<GenderType | null>(parsed?.gender || null);
  const [selectedType, setSelectedType] = useState<ProductType | null>(parsed?.type || null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(parsed?.category || null);

  // Update local state when value changes externally
  useEffect(() => {
    const newParsed = parseCategoryPath(value);
    if (newParsed) {
      setSelectedGender(newParsed.gender);
      setSelectedType(newParsed.type);
      setSelectedCategory(newParsed.category);
    }
  }, [value]);

  // Get available categories based on selections
  const availableCategories = useMemo(() => {
    if (!selectedGender || !selectedType) return [];
    return categoryStructure.categories[selectedGender][selectedType];
  }, [selectedGender, selectedType]);

  // Handle gender change
  const handleGenderChange = (gender: GenderType) => {
    setSelectedGender(gender);
    setSelectedType(null);
    setSelectedCategory(null);
    onChange('');
  };

  // Handle type change
  const handleTypeChange = (type: ProductType) => {
    setSelectedType(type);
    setSelectedCategory(null);
    onChange('');
  };

  // Handle category change from dropdown
  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const categoryId = e.target.value;
    if (categoryId && selectedGender && selectedType) {
      setSelectedCategory(categoryId);
      onChange(getCategoryPath(selectedGender, selectedType, categoryId));
    }
  };

  // Get translation for category
  const getCategoryLabel = (labelKey: string): string => {
    try {
      return t(labelKey);
    } catch {
      return labelKey;
    }
  };

  return (
    <div className="space-y-3">
      {/* Gender & Type Selection - Compact row */}
      <div className="flex gap-2">
        {categoryStructure.genders.map((gender) => (
          <button
            key={gender.id}
            type="button"
            onClick={() => handleGenderChange(gender.id as GenderType)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              selectedGender === gender.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)] border border-[var(--color-line)]'
            }`}
          >
            {getCategoryLabel(gender.labelKey)}
          </button>
        ))}
      </div>

      {/* Type Selection - Only show if gender is selected */}
      {selectedGender && (
        <div className="flex gap-2">
          {categoryStructure.types.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id as ProductType)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedType === type.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)] border border-[var(--color-line)]'
              }`}
            >
              {getCategoryLabel(type.labelKey)}
            </button>
          ))}
        </div>
      )}

      {/* Category Dropdown - Only show if both gender and type are selected */}
      {selectedGender && selectedType && availableCategories.length > 0 && (
        <div className="relative">
          <select
            value={selectedCategory || ''}
            onChange={handleCategorySelect}
            className="w-full h-11 px-4 pr-10 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-lg text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)] appearance-none cursor-pointer"
          >
            <option value="">{t('categories.selectCategory')}</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {getCategoryLabel(category.labelKey)}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-label)] pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}

export default CategorySelector;
