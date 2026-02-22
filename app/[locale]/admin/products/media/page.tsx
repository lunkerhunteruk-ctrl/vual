'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, Trash2, Eye, Grid3X3, List, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';
import { useMedia } from '@/lib/hooks';

export default function ProductMediaPage() {
  const t = useTranslations('admin.products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TODO: Get shopId from auth context
  const shopId = 'demo-shop';
  const { media, isLoading, error, uploadMedia, deleteMedia } = useMedia({ shopId });

  const toggleSelect = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredMedia = media.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadMedia(files[i]);
      }
    } catch (err) {
      console.error('Failed to upload media:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDeleteMedia'))) {
      try {
        await deleteMedia(id);
        setSelectedItems(prev => prev.filter(i => i !== id));
      } catch (err) {
        console.error('Failed to delete media:', err);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        {error.message}
      </div>
    );
  }

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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            variant="primary"
            leftIcon={isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? t('uploading') : t('uploadMedia')}
          </Button>
        </div>
      </div>

      {/* Media Grid/List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ImageIcon size={48} className="text-[var(--color-text-label)] mb-4" />
            <p className="text-sm text-[var(--color-text-label)]">{t('noMedia')}</p>
            <p className="text-xs text-[var(--color-text-placeholder)] mt-1">{t('uploadToGetStarted')}</p>
          </div>
        ) : viewMode === 'grid' ? (
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
                  {item.type === 'image' ? (
                    <Image
                      src={item.url}
                      alt={item.name}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] flex items-center justify-center">
                      <ImageIcon size={24} className="text-[var(--color-text-label)]" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-text-label)]">{formatSize(item.size)}</p>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                    className="p-2 bg-white rounded-full"
                  >
                    <Eye size={14} className="text-[var(--color-title-active)]" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-2 bg-white rounded-full"
                  >
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
                    <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center overflow-hidden">
                      {item.type === 'image' ? (
                        <Image
                          src={item.url}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={16} className="text-[var(--color-text-label)]" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-title-active)]">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatSize(item.size)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {item.productName || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => window.open(item.url, '_blank')}
                        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                      >
                        <Eye size={14} className="text-[var(--color-text-label)]" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                      >
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
