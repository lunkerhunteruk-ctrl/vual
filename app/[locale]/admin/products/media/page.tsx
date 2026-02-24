'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Image as ImageIcon, Film, Trash2, Eye, Grid3X3, List,
  Search, Loader2, X, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';

type UsageTag = 'all' | 'lp' | 'blog' | 'video' | 'other';

interface MediaItem {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  usage_tag?: string;
  mime_type?: string;
  size?: number;
  created_at: string;
}

interface UploadItem {
  id: string;
  file: File;
  preview: string;
  progress: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const USAGE_TAGS: { id: UsageTag; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'lp', label: 'LP' },
  { id: 'blog', label: 'ブログ' },
  { id: 'video', label: '動画' },
  { id: 'other', label: 'その他' },
];

export default function ProductMediaPage() {
  const t = useTranslations('admin.products');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<UsageTag>('all');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Upload queue
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [uploadTag, setUploadTag] = useState<UsageTag>('other');
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (activeTag !== 'all') params.set('usage_tag', activeTag);
      const res = await fetch(`/api/media?${params}`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch {
      console.error('Failed to fetch media');
    } finally {
      setIsLoading(false);
    }
  }, [activeTag]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const filteredMedia = media.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Drag handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const items: UploadItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        progress: 'pending' as const,
      }));

    if (items.length > 0) {
      setUploadQueue(prev => [...prev, ...items]);
      setShowUploadPanel(true);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  }, [addFilesToQueue]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload all pending
  const startUpload = async () => {
    const pending = uploadQueue.filter(i => i.progress === 'pending');
    if (pending.length === 0) return;

    for (const item of pending) {
      // Mark as uploading
      setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'uploading' } : i));

      try {
        // 1. Upload file
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('folder', 'media');

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.url) {
          throw new Error(uploadData.error || 'Upload failed');
        }

        // 2. Create DB record
        const type = item.file.type.startsWith('video/') ? 'video' : 'image';
        const tag = uploadTag === 'all' ? 'other' : uploadTag;

        const mediaRes = await fetch('/api/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.file.name,
            type,
            mime_type: item.file.type,
            size: item.file.size,
            url: uploadData.url,
            usage_tag: tag,
          }),
        });

        if (!mediaRes.ok) throw new Error('Failed to save record');

        const newMedia = await mediaRes.json();
        setMedia(prev => [newMedia, ...prev]);

        setUploadQueue(prev => prev.map(i => i.id === item.id ? { ...i, progress: 'done' } : i));
      } catch (err: any) {
        setUploadQueue(prev => prev.map(i =>
          i.id === item.id ? { ...i, progress: 'error', error: err.message } : i
        ));
      }
    }
  };

  const removeFromQueue = (id: string) => {
    setUploadQueue(prev => {
      const item = prev.find(i => i.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const clearCompleted = () => {
    setUploadQueue(prev => {
      prev.filter(i => i.progress === 'done').forEach(i => { if (i.preview) URL.revokeObjectURL(i.preview); });
      const remaining = prev.filter(i => i.progress !== 'done');
      if (remaining.length === 0) setShowUploadPanel(false);
      return remaining;
    });
  };

  // Delete
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/media?id=${deleteTarget.id}`, { method: 'DELETE' });
      setMedia(prev => prev.filter(i => i.id !== deleteTarget.id));
      setSelectedItems(prev => prev.filter(i => i !== deleteTarget.id));
    } catch {
      console.error('Delete failed');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
  };

  const pendingCount = uploadQueue.filter(i => i.progress === 'pending').length;
  const uploadingCount = uploadQueue.filter(i => i.progress === 'uploading').length;
  const doneCount = uploadQueue.filter(i => i.progress === 'done').length;
  const isUploading = uploadingCount > 0;

  return (
    <div
      className="space-y-6 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Full-page drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[var(--color-accent)]/10 border-4 border-dashed border-[var(--color-accent)] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white rounded-[var(--radius-lg)] px-12 py-8 shadow-lg text-center">
              <Upload size={48} className="mx-auto text-[var(--color-accent)] mb-3" />
              <p className="text-lg font-semibold text-[var(--color-title-active)]">ここにドロップしてアップロード</p>
              <p className="text-sm text-[var(--color-text-label)] mt-1">画像・動画ファイルに対応</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchMedia')}
              className="w-full h-10 pl-9 pr-4 text-sm bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-md)] text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-[var(--color-line)] rounded-[var(--radius-md)] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-bg-element)]' : ''}`}
            >
              <Grid3X3 size={16} className="text-[var(--color-text-body)]" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${viewMode === 'list' ? 'bg-[var(--color-bg-element)]' : ''}`}
            >
              <List size={16} className="text-[var(--color-text-body)]" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <Button
            variant="primary"
            leftIcon={<Upload size={16} />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('uploadMedia')}
          </Button>
        </div>
      </div>

      {/* Usage Tag Filters */}
      <div className="flex items-center gap-2">
        {USAGE_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => setActiveTag(tag.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              activeTag === tag.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Upload Panel */}
      <AnimatePresence>
        {showUploadPanel && uploadQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden"
          >
            {/* Upload header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)] bg-[var(--color-bg-element)]">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--color-title-active)]">
                  アップロード ({uploadQueue.length}件)
                </span>
                {doneCount > 0 && (
                  <span className="text-xs text-emerald-600">{doneCount}件完了</span>
                )}
                {isUploading && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-label)]">
                    <Loader2 size={12} className="animate-spin" />
                    アップロード中...
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Tag selector for upload */}
                <select
                  value={uploadTag}
                  onChange={(e) => setUploadTag(e.target.value as UsageTag)}
                  className="h-8 px-2 text-xs bg-white border border-[var(--color-line)] rounded-[var(--radius-sm)] text-[var(--color-text-body)]"
                >
                  <option value="lp">LP</option>
                  <option value="blog">ブログ</option>
                  <option value="video">動画</option>
                  <option value="other">その他</option>
                </select>
                {pendingCount > 0 && (
                  <button
                    onClick={startUpload}
                    disabled={isUploading}
                    className="h-8 px-4 text-xs font-medium text-white bg-[var(--color-accent)] rounded-[var(--radius-sm)] hover:opacity-90 disabled:opacity-50"
                  >
                    {isUploading ? 'アップロード中...' : `${pendingCount}件をアップロード`}
                  </button>
                )}
                {doneCount > 0 && (
                  <button onClick={clearCompleted} className="text-xs text-[var(--color-text-label)] hover:text-[var(--color-text-body)]">
                    完了を消す
                  </button>
                )}
                <button
                  onClick={() => { setShowUploadPanel(false); setUploadQueue([]); }}
                  className="p-1 hover:bg-[var(--color-bg-input)] rounded-[var(--radius-sm)]"
                >
                  <X size={14} className="text-[var(--color-text-label)]" />
                </button>
              </div>
            </div>

            {/* Upload items grid */}
            <div className="p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {uploadQueue.map(item => (
                  <div key={item.id} className="relative group">
                    <div className="aspect-square bg-[var(--color-bg-element)] rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-line)]">
                      {item.preview ? (
                        <img src={item.preview} alt={item.file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={16} className="text-[var(--color-text-label)]" />
                        </div>
                      )}
                      {/* Status overlay */}
                      {item.progress === 'uploading' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 size={16} className="animate-spin text-white" />
                        </div>
                      )}
                      {item.progress === 'done' && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle size={16} className="text-emerald-600" />
                        </div>
                      )}
                      {item.progress === 'error' && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <AlertCircle size={16} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    {item.progress === 'pending' && (
                      <button
                        onClick={() => removeFromQueue(item.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div
            className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] cursor-pointer hover:border-[var(--color-accent)]/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} className="text-[var(--color-text-label)] mb-4" />
            <p className="text-sm text-[var(--color-text-label)]">ドラッグ＆ドロップまたはクリックでアップロード</p>
            <p className="text-xs text-[var(--color-text-placeholder)] mt-1">画像・動画ファイルに対応</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className={`relative group rounded-[var(--radius-md)] border overflow-hidden cursor-pointer transition-colors ${
                  selectedItems.includes(item.id)
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : 'border-[var(--color-line)] hover:border-[var(--color-text-label)]'
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                <div className="aspect-square bg-[var(--color-bg-element)]">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] flex items-center justify-center">
                      <Film size={24} className="text-[var(--color-text-label)]" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-[var(--color-title-active)] truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-[var(--color-text-label)]">{formatSize(item.size || 0)}</p>
                    {item.usage_tag && item.usage_tag !== 'other' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-[var(--color-bg-element)] rounded text-[var(--color-text-label)]">
                        {USAGE_TAGS.find(t => t.id === item.usage_tag)?.label || item.usage_tag}
                      </span>
                    )}
                  </div>
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
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
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
                <th className="w-12 py-3 px-4" />
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">{t('image')}</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">{t('fileName')}</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">タグ</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">{t('size')}</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-[var(--color-text-label)] uppercase">{t('uploaded')}</th>
                <th className="w-24 py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id} className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-bg-element)] transition-colors">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-[var(--color-line)]"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] overflow-hidden">
                      {item.type === 'image' ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Film size={16} className="text-[var(--color-text-label)]" /></div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-title-active)]">{item.name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 bg-[var(--color-bg-element)] rounded-full text-[var(--color-text-label)]">
                      {USAGE_TAGS.find(t => t.id === item.usage_tag)?.label || 'その他'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">{formatSize(item.size || 0)}</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-body)]">{formatDate(item.created_at)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => window.open(item.url, '_blank')} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-input)] transition-colors">
                        <Eye size={14} className="text-[var(--color-text-label)]" />
                      </button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-[var(--radius-sm)] hover:bg-red-50 transition-colors">
                        <Trash2 size={14} className="text-[var(--color-text-label)] hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
              <h3 className="text-base font-semibold text-[var(--color-title-active)]">メディアを削除</h3>
              <p className="mt-2 text-sm text-[var(--color-text-body)]">
                「{deleteTarget.name}」を削除しますか？
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
    </div>
  );
}
