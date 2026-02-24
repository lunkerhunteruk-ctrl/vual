'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Star, Plus } from 'lucide-react';
import type { ProductImage } from './ProductVariants';

interface ProductImageUploadProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  colorOptions: string[];
  imageColorMap: Record<string, string>;
  onImageColorMapChange: (map: Record<string, string>) => void;
  onAddColor?: (color: string) => void;
}

export function ProductImageUpload({
  images,
  onImagesChange,
  colorOptions,
  imageColorMap,
  onImageColorMapChange,
  onAddColor,
}: ProductImageUploadProps) {
  const t = useTranslations('admin.products');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [newColorInput, setNewColorInput] = useState('');
  const [showColorInput, setShowColorInput] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);

  const handleAddColor = (imageId: string) => {
    if (newColorInput.trim() && onAddColor) {
      onAddColor(newColorInput.trim());
      setImageColor(imageId, newColorInput.trim());
      setNewColorInput('');
      setShowColorInput(null);
    }
  };

  // Track if drop was handled to prevent duplicates
  const dropHandledRef = useRef(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Prevent duplicate handling
    if (dropHandledRef.current) {
      return;
    }
    dropHandledRef.current = true;

    // Reset after a short delay
    setTimeout(() => {
      dropHandledRef.current = false;
    }, 100);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      const newImages: ProductImage[] = files.map(file => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: URL.createObjectURL(file),
        file,
      }));
      onImagesChange([...images, ...newImages]);
    }
  }, [images, onImagesChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    const newImages: ProductImage[] = files.map(file => ({
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file,
    }));
    onImagesChange([...images, ...newImages]);
  };

  const removeImage = (imageId: string) => {
    onImagesChange(images.filter(img => img.id !== imageId));
    const newMap = { ...imageColorMap };
    delete newMap[imageId];
    onImageColorMapChange(newMap);
  };

  const setImageColor = (imageId: string, color: string) => {
    onImageColorMapChange({
      ...imageColorMap,
      [imageId]: color,
    });
  };

  const setAsPrimary = (imageId: string) => {
    const imageIndex = images.findIndex(img => img.id === imageId);
    if (imageIndex > 0) {
      const newImages = [...images];
      const [image] = newImages.splice(imageIndex, 1);
      newImages.unshift(image);
      onImagesChange(newImages);
    }
  };

  // Filter out images with invalid URLs
  // Keep: images with http/https URLs, or blob URLs with a file (newly uploaded)
  const validImages = images.filter(img => {
    if (!img.url) return false;
    if (img.url.startsWith('http')) return true;
    if (img.url.startsWith('blob:') && img.file) return true;
    return false;
  });

  // Get the primary image (first one) for preview
  const primaryImage = validImages.length > 0 ? validImages[0] : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4"
      >
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          商品画像をアップロード
        </h3>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Large Preview Area - Also accepts drops */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !primaryImage && fileInputRef.current?.click()}
          className={`aspect-square rounded-[var(--radius-md)] border-2 border-dashed mb-4 relative overflow-hidden transition-all ${
            isDragging
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : primaryImage
              ? 'border-[var(--color-line)]'
              : 'border-[var(--color-line)] bg-[var(--color-bg-element)] cursor-pointer hover:border-[var(--color-accent)]'
          }`}
        >
          {primaryImage && primaryImage.url ? (
            // Show primary image as preview
            <div
              className="w-full h-full cursor-pointer"
              onClick={(e) => { e.stopPropagation(); setPreviewImage(primaryImage); }}
            >
              <img
                src={primaryImage.url}
                alt=""
                className="w-full h-full object-contain"
              />
              {/* Primary badge */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--color-accent)] text-white text-xs font-medium rounded">
                メイン
              </div>
              {/* Drop overlay when dragging */}
              {isDragging && (
                <div className="absolute inset-0 bg-[var(--color-accent)]/20 flex items-center justify-center">
                  <div className="bg-white/90 px-4 py-2 rounded-lg">
                    <Upload size={24} className="text-[var(--color-accent)] mx-auto mb-1" />
                    <p className="text-sm text-[var(--color-accent)]">ここにドロップ</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty state - drop zone
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Upload size={32} className={`mb-2 ${isDragging ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-label)]'}`} />
              <p className={`text-sm ${isDragging ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-body)]'}`}>
                {isDragging ? 'ここにドロップ' : 'ここに画像をドラッグ＆ドロップ'}
              </p>
              <p className="text-xs text-[var(--color-text-label)] mt-1">
                または <span className="text-[var(--color-accent)]">クリック</span> して選択
              </p>
            </div>
          )}
        </div>

        {/* Thumbnails Row */}
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs text-[var(--color-text-label)]">
            {validImages.length}枚の画像
          </span>
          <span className="text-xs text-[var(--color-text-label)]">
            各画像にカラーを割り当て
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Thumbnail slots - always show 4 */}
          {[0, 1, 2, 3].map((slotIndex) => {
            const image = validImages[slotIndex];

            if (image) {
              // Filled slot
              return (
                <div key={image.id} className="relative group">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => setPreviewImage(image)}
                    className="aspect-square rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-element)] border border-[var(--color-line)] relative cursor-pointer"
                  >
                    <img
                      src={image.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />

                    {/* Primary badge */}
                    {slotIndex === 0 && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-[var(--color-accent)] text-white text-[9px] font-medium rounded">
                        メイン
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
                        className="p-1.5 bg-red-500 rounded-full"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Color selector */}
                  <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                    {showColorInput === image.id ? (
                      <div className="flex gap-0.5">
                        <input
                          type="text"
                          value={newColorInput}
                          onChange={(e) => setNewColorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddColor(image.id);
                            } else if (e.key === 'Escape') {
                              setShowColorInput(null);
                              setNewColorInput('');
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setShowColorInput(null);
                              setNewColorInput('');
                            }, 150);
                          }}
                          placeholder="カラー名"
                          autoFocus
                          className="flex-1 h-6 px-1.5 text-[10px] border border-[var(--color-line)] rounded bg-white text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                        />
                        <button
                          onClick={() => handleAddColor(image.id)}
                          onMouseDown={(e) => e.preventDefault()}
                          className="h-6 w-6 bg-[var(--color-accent)] text-white rounded text-xs flex items-center justify-center"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={imageColorMap[image.id] || ''}
                        onChange={(e) => {
                          if (e.target.value === '__add_new__') {
                            setShowColorInput(image.id);
                          } else {
                            setImageColor(image.id, e.target.value);
                          }
                        }}
                        className="w-full h-6 px-1.5 text-[10px] border rounded bg-white text-[var(--color-text-body)] border-[var(--color-line)] cursor-pointer focus:outline-none focus:border-[var(--color-accent)]"
                      >
                        <option value="">カラー</option>
                        {colorOptions.map(color => (
                          <option key={color} value={color}>{color}</option>
                        ))}
                        {onAddColor && (
                          <option value="__add_new__">+ 追加</option>
                        )}
                      </select>
                    )}
                  </div>

                  {/* Set as primary button for non-primary images */}
                  {slotIndex !== 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAsPrimary(image.id); }}
                      className="absolute -top-1 -right-1 p-1 bg-white border border-[var(--color-line)] rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      title="メインに設定"
                    >
                      <Star size={10} className="text-[var(--color-text-label)]" />
                    </button>
                  )}
                </div>
              );
            } else {
              // Empty slot - can accept drop
              return (
                <div
                  key={`empty-${slotIndex}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-square rounded-[var(--radius-sm)] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                      : 'border-[var(--color-line)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)]'
                  }`}
                >
                  <Upload size={16} className="text-[var(--color-text-label)] mb-1" />
                  <span className="text-[10px] text-[var(--color-text-label)]">追加</span>
                </div>
              );
            }
          })}
        </div>

        {/* Show more images if there are more than 4 */}
        {validImages.length > 4 && (
          <div className="mt-3 pt-3 border-t border-[var(--color-line)]">
            <p className="text-xs text-[var(--color-text-label)] mb-2">
              その他の画像 ({validImages.length - 4}枚)
            </p>
            <div className="grid grid-cols-6 gap-1">
              {validImages.slice(4).map((image) => (
                <div key={image.id} className="relative group">
                  <div
                    onClick={() => setPreviewImage(image)}
                    className="aspect-square rounded overflow-hidden bg-[var(--color-bg-element)] border border-[var(--color-line)] cursor-pointer"
                  >
                    <img
                      src={image.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(image.id); }}
                        className="p-1 bg-red-500 rounded-full"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && previewImage.url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-lg overflow-hidden max-w-lg w-full"
            >
              {/* Square Preview */}
              <div className="aspect-square bg-[var(--color-bg-element)]">
                <img
                  src={previewImage.url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Info bar */}
              <div className="p-3 border-t border-[var(--color-line)] flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-body)]">
                  {imageColorMap[previewImage.id] ? `カラー: ${imageColorMap[previewImage.id]}` : 'カラー未設定'}
                </span>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="px-3 py-1.5 text-sm bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] rounded transition-colors"
                >
                  閉じる
                </button>
              </div>

              {/* Close button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ProductImageUpload;
