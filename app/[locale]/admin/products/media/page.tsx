'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Trash2, Eye, Grid3X3, List, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';

interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: string;
  uploadedAt: string;
  productId?: string;
  productName?: string;
}

const mockMedia: MediaItem[] = [
  { id: '1', url: '/placeholder-product.jpg', name: 'product-001.jpg', size: '1.2 MB', uploadedAt: '2025-01-15', productName: 'Oversized Blazer' },
  { id: '2', url: '/placeholder-product.jpg', name: 'product-002.jpg', size: '980 KB', uploadedAt: '2025-01-14', productName: 'Silk Dress' },
  { id: '3', url: '/placeholder-product.jpg', name: 'product-003.jpg', size: '1.5 MB', uploadedAt: '2025-01-13' },
  { id: '4', url: '/placeholder-product.jpg', name: 'product-004.jpg', size: '2.1 MB', uploadedAt: '2025-01-12', productName: 'Wool Cardigan' },
  { id: '5', url: '/placeholder-product.jpg', name: 'product-005.jpg', size: '890 KB', uploadedAt: '2025-01-11' },
  { id: '6', url: '/placeholder-product.jpg', name: 'product-006.jpg', size: '1.8 MB', uploadedAt: '2025-01-10', productName: 'Leather Bag' },
];

export default function ProductMediaPage() {
  const t = useTranslations('admin.products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredMedia = mockMedia.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchMedia')}
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button className="p-2 rounded-[var(--radius-md)] border border-[var(--color-line)] hover:bg-[var(--color-bg-element)] transition-colors">
            <Filter size={16} className="text-[var(--color-text-label)]" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-[var(--color-line)] rounded-[var(--radius-md)] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === 'grid' ? 'bg-[var(--color-bg-element)]' : ''
              }`}
            >
              <Grid3X3 size={16} className="text-[var(--color-text-body)]" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
                viewMode === 'list' ? 'bg-[var(--color-bg-element)]' : ''
              }`}
            >
              <List size={16} className="text-[var(--color-text-body)]" />
            </button>
          </div>
          <Button variant="primary" leftIcon={<Upload size={16} />}>
            {t('uploadMedia')}
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`relative group rounded-[var(--radius-md)] border overflow-hidden cursor-pointer transition-colors ${
                  selectedItems.includes(item.id)
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)] ring-opacity-20'
                    : 'border-[var(--color-line)] hover:border-[var(--color-text-label)]'
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                <div className="aspect-square bg-[var(--color-bg-element)]">
                  <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] flex items-center justify-center">
                    <ImageIcon size={24} className="text-[var(--color-text-label)]" />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-label)]">{item.size}</p>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-white rounded-full">
                    <Eye size={14} className="text-[var(--color-title-active)]" />
                  </button>
                  <button className="p-2 bg-white rounded-full">
                    <Trash2 size={14} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-line)]">
                <th className="w-12 py-3 px-4">
                  <input type="checkbox" className="w-4 h-4 rounded border-[var(--color-line)]" />
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('image')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('fileName')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('size')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('linkedProduct')}
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">
                  {t('uploaded')}
                </th>
                <th className="w-24 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-[var(--color-line)]"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center">
                      <ImageIcon size={16} className="text-[var(--color-text-label)]" />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-title-active)]">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {item.size}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {item.productName || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {item.uploadedAt}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Eye size={14} className="text-[var(--color-text-label)]" />
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
        )}
      </motion.div>
    </div>
  );
}
