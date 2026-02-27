'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit2, Trash2, ExternalLink, Loader2, Upload, Plus, X } from 'lucide-react';
import { BrandProductsModal } from './BrandProductsModal';
import { toast } from '@/lib/store/toast';

interface Brand {
  id: string;
  name: string;
  name_en: string | null;
  slug: string;
  logo_url: string | null;
  website: string | null;
  description: string | null;
  is_active: boolean;
  productCount: number;
  thumbnailUrl: string | null;
}

export function BrandTable() {
  const t = useTranslations('admin.brand');
  const [searchQuery, setSearchQuery] = useState('');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandNameEn, setNewBrandNameEn] = useState('');
  const [newBrandWebsite, setNewBrandWebsite] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Edit modal
  const [editTarget, setEditTarget] = useState<Brand | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // Products modal
  const [productsBrand, setProductsBrand] = useState<Brand | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/brands');
      const data = await res.json();
      if (data.brands) {
        setBrands(data.brands);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return brands;
    const query = searchQuery.toLowerCase();
    return brands.filter(b => b.name.toLowerCase().includes(query) || b.name_en?.toLowerCase().includes(query));
  }, [brands, searchQuery]);

  // Delete with custom modal
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/brands?id=${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBrands(prev => prev.filter(b => b.id !== deleteTarget.id));
        toast.success('ブランドを削除しました');
      }
    } catch (err) {
      console.error('Failed to delete brand:', err);
      toast.error('削除に失敗しました');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  // Edit brand
  const openEdit = (brand: Brand) => {
    setEditTarget(brand);
    setEditName(brand.name);
    setEditNameEn(brand.name_en || '');
    setEditWebsite(brand.website || '');
  };

  const saveEdit = async () => {
    if (!editTarget || !editName.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, name: editName.trim(), nameEn: editNameEn.trim() || null, website: editWebsite.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setBrands(prev => prev.map(b =>
          b.id === editTarget.id ? { ...b, name: editName.trim(), name_en: editNameEn.trim() || null, website: editWebsite.trim() || null } : b
        ));
        setEditTarget(null);
        toast.success('ブランドを更新しました');
      }
    } catch (err) {
      console.error('Failed to update brand:', err);
      toast.error('更新に失敗しました');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/brands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setBrands(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Logo upload
  const handleLogoClick = (brandId: string) => {
    setUploadingId(brandId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'brand-logos');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (uploadData.url) {
        const res = await fetch('/api/brands', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: uploadingId, logoUrl: uploadData.url }),
        });
        const data = await res.json();
        if (data.success) {
          setBrands(prev => prev.map(b =>
            b.id === uploadingId ? { ...b, logo_url: uploadData.url, thumbnailUrl: uploadData.url } : b
          ));
        }
      }
    } catch (err) {
      console.error('Failed to upload logo:', err);
    } finally {
      setUploadingId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName.trim(), nameEn: newBrandNameEn.trim() || undefined, website: newBrandWebsite.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success && data.brand) {
        setBrands(prev => [{ ...data.brand, productCount: 0, thumbnailUrl: null }, ...prev]);
        setNewBrandName('');
        setNewBrandNameEn('');
        setNewBrandWebsite('');
        setIsAdding(false);
        toast.success('ブランドを作成しました');
      } else {
        setCreateError(data.error || '作成に失敗しました');
        toast.error(data.error || '作成に失敗しました');
      }
    } catch {
      setCreateError('作成に失敗しました');
      toast.error('作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)]"
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Search + Add */}
        <div className="p-4 border-b border-[var(--color-line)]">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
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
            <button
              onClick={() => { setIsAdding(true); setTimeout(() => nameInputRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity flex-shrink-0"
            >
              <Plus size={16} />
              新規ブランド
            </button>
          </div>

          {/* Inline create form */}
          {isAdding && (
            <div className="mt-3 p-4 bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)]">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBrand(); if (e.key === 'Escape') setIsAdding(false); }}
                    placeholder="ブランド名（日本語） *"
                    className="w-full h-9 px-3 text-sm bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <input
                    type="text"
                    value={newBrandNameEn}
                    onChange={(e) => setNewBrandNameEn(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBrand(); if (e.key === 'Escape') setIsAdding(false); }}
                    placeholder="Brand Name (English) *"
                    className="w-full h-9 px-3 text-sm bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  <input
                    type="text"
                    value={newBrandWebsite}
                    onChange={(e) => setNewBrandWebsite(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateBrand(); if (e.key === 'Escape') setIsAdding(false); }}
                    placeholder="WEBサイト（任意）"
                    className="w-full h-9 px-3 text-sm bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                  {createError && (
                    <p className="text-xs text-red-600">{createError}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={handleCreateBrand}
                    disabled={isCreating || !newBrandName.trim()}
                    className="h-9 px-4 text-sm font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isCreating ? <Loader2 size={14} className="animate-spin" /> : '追加'}
                  </button>
                  <button
                    onClick={() => { setIsAdding(false); setNewBrandName(''); setNewBrandNameEn(''); setNewBrandWebsite(''); setCreateError(null); }}
                    className="h-9 w-9 flex items-center justify-center text-[var(--color-text-label)] hover:text-[var(--color-text-body)] rounded-[var(--radius-md)] hover:bg-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-sm text-[var(--color-text-label)]">{t('noBrands')}</p>
            </div>
          ) : (
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
                        <button
                          onClick={() => handleLogoClick(brand.id)}
                          className="w-10 h-10 bg-[var(--color-bg-element)] rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[var(--color-accent)]/30 transition-all group relative flex-shrink-0"
                          title="クリックでロゴを変更"
                        >
                          {brand.thumbnailUrl ? (
                            <>
                              <img
                                src={brand.thumbnailUrl}
                                alt={brand.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity">
                                <Upload size={12} className="text-white" />
                              </div>
                            </>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-[var(--color-text-body)] group-hover:hidden">
                                {brand.name.charAt(0).toUpperCase()}
                              </span>
                              <Upload size={12} className="text-[var(--color-text-label)] hidden group-hover:block" />
                            </>
                          )}
                        </button>
                        <div className="text-left">
                          <button
                            onClick={() => setProductsBrand(brand)}
                            className="text-sm font-medium text-[var(--color-title-active)] hover:text-[var(--color-accent)] hover:underline transition-colors text-left"
                          >
                            {brand.name}
                          </button>
                          {brand.name_en && (
                            <p className="text-xs text-[var(--color-text-label)]">{brand.name_en}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">
                      {brand.productCount}点
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
                      <button
                        onClick={() => toggleStatus(brand.id, brand.is_active)}
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full cursor-pointer transition-colors ${
                          brand.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {brand.is_active ? '有効' : '無効'}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(brand)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors"
                        >
                          <Edit2 size={14} className="text-[var(--color-text-label)]" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(brand)}
                          className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} className="text-[var(--color-text-label)] hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isDeleting && setDeleteTarget(null)}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[var(--radius-lg)] w-full max-w-sm p-6 shadow-lg"
            >
              <h3 className="text-base font-semibold text-[var(--color-title-active)]">
                ブランドを削除
              </h3>
              <p className="mt-2 text-sm text-[var(--color-text-body)]">
                「{deleteTarget.name}」を削除しますか？この操作は取り消せません。
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="h-9 px-4 text-sm font-medium text-[var(--color-text-body)] bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="h-9 px-4 text-sm font-medium text-white bg-red-500 rounded-[var(--radius-md)] hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : '削除する'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSavingEdit && setEditTarget(null)}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[var(--radius-lg)] w-full max-w-md p-6 shadow-lg"
            >
              <h3 className="text-base font-semibold text-[var(--color-title-active)]">
                ブランドを編集
              </h3>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">ブランド名（日本語）</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditTarget(null); }}
                    className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">Brand Name (English)</label>
                  <input
                    type="text"
                    value={editNameEn}
                    onChange={(e) => setEditNameEn(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditTarget(null); }}
                    placeholder="e.g. Tod's, Gucci"
                    className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-label)] mb-1">WEBサイト</label>
                  <input
                    type="text"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditTarget(null); }}
                    placeholder="https://"
                    className="w-full h-10 px-3 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEditTarget(null)}
                  disabled={isSavingEdit}
                  className="h-9 px-4 text-sm font-medium text-[var(--color-text-body)] bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-input)] transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSavingEdit || !editName.trim()}
                  className="h-9 px-4 text-sm font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-md)] hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 size={14} className="animate-spin" /> : '保存'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brand Products Modal */}
      <BrandProductsModal
        brand={productsBrand}
        onClose={() => setProductsBrand(null)}
      />
    </>
  );
}

export default BrandTable;
