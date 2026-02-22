'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Edit2, Trash2, ExternalLink } from 'lucide-react';
import Image from 'next/image';

interface Brand {
  id: string;
  name: string;
  logo?: string;
  productCount: number;
  website?: string;
  status: 'active' | 'inactive';
}

const mockBrands: Brand[] = [
  { id: '1', name: 'MOHAN', productCount: 45, website: 'https://mohan.com', status: 'active' },
  { id: '2', name: 'LAMEREI', productCount: 32, website: 'https://lamerei.com', status: 'active' },
  { id: '3', name: 'KORIN', productCount: 28, status: 'active' },
  { id: '4', name: 'MERAKI', productCount: 19, website: 'https://meraki.com', status: 'active' },
  { id: '5', name: 'BASIC', productCount: 56, status: 'active' },
  { id: '6', name: 'OLD BRAND', productCount: 0, status: 'inactive' },
];

const statusColors = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
};

export function BrandTable() {
  const t = useTranslations('admin.brand');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return mockBrands;
    const query = searchQuery.toLowerCase();
    return mockBrands.filter(b => b.name.toLowerCase().includes(query));
  }, [searchQuery]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
    >
      {/* Search */}
      <div className="p-4 border-b border-[var(--color-line)]">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchBrands')}
            className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('brand')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('products')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('website')}
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                {t('status')}
              </th>
              <th className="w-24 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {filteredBrands.map((brand) => (
              <tr
                key={brand.id}
                className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-full flex items-center justify-center">
                      {brand.logo ? (
                        <Image
                          src={brand.logo}
                          alt={brand.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-[var(--color-text-body)]">
                          {brand.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-[var(--color-title-active)]">
                      {brand.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                  {brand.productCount} products
                </td>
                <td className="py-3 px-4">
                  {brand.website ? (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline"
                    >
                      {brand.website.replace(/^https?:\/\//, '')}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-sm text-[var(--color-text-label)]">-</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[brand.status]}`}>
                    {brand.status.charAt(0).toUpperCase() + brand.status.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                      <Edit2 size={14} className="text-[var(--color-text-label)]" />
                    </button>
                    <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                      <Trash2 size={14} className="text-[var(--color-text-label)]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

export default BrandTable;
