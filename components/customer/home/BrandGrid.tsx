'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface Brand {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  logo_url: string | null;
  thumbnail: string | null;
}

export function BrandGrid() {
  const locale = useLocale();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(data => {
        if (data.brands) {
          setBrands(data.brands.filter((b: Brand) => b.name));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3 px-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-[var(--color-bg-element)] rounded-[var(--radius-md)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (brands.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {brands.map(brand => (
        <Link
          key={brand.id}
          href={`/${locale}/brand/${brand.slug}`}
          className="group aspect-square flex flex-col items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-white hover:border-[var(--color-accent)] hover:shadow-sm transition-all overflow-hidden"
        >
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.name}
              className="w-full h-full object-contain p-4"
            />
          ) : (
            <span className="text-xs font-semibold tracking-[0.12em] text-[var(--color-title-active)] uppercase text-center px-2 leading-tight group-hover:text-[var(--color-accent)] transition-colors">
              {brand.name_en || brand.name}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
