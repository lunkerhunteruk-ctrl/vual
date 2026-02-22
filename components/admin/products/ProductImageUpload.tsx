'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Upload, X, GripVertical, Image as ImageIcon, Star } from 'lucide-react';
import type { ProductImage, VariantOption } from './ProductVariants';

interface ProductImageUploadProps {
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  colorOptions: string[];
  imageColorMap: Record<string, string>;
  onImageColorMapChange: (map: Record<string, string>) => void;
}

export function ProductImageUpload({
  images,
  onImagesChange,
  colorOptions,
  imageColorMap,
  onImageColorMapChange,
}: ProductImageUploadProps) {
  const t = useTranslations('admin.products');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    handleFiles(files);
  }, [images]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    // Reset input so same file can be selected again
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
    // Also remove from color map
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5"
    >
      <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
        {t('uploadProductImage')}
      </h3>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-[var(--radius-md)] p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-line)] hover:border-[var(--color-accent)]'
        }`}
      >
        <Upload size={32} className="mx-auto mb-3 text-[var(--color-text-label)]" />
        <p className="text-sm text-[var(--color-text-body)] mb-1">
          {t('dragDropImages') || 'Drag & Drop your images here'}
        </p>
        <p className="text-xs text-[var(--color-text-label)]">
          {t('orClickToUpload') || 'or'} <span className="text-[var(--color-accent)]">{t('browse')}</span> {t('toUpload') || 'to upload'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-text-label)]">
              {images.length} {images.length === 1 ? t('imageUploaded') || 'image' : t('imagesUploaded') || 'images'}
            </span>
            {colorOptions.length > 0 && (
              <span className="text-xs text-[var(--color-text-label)]">
                {t('assignColorToImage') || 'Assign color to each image'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((image, index) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative group"
              >
                <div className="aspect-square rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-bg-element)] border border-[var(--color-line)]">
                  <img
                    src={image.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Primary badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-[var(--color-accent)] text-white text-[10px] font-medium rounded-full">
                    {t('primary') || 'Primary'}
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-2">
                  {index !== 0 && (
                    <button
                      onClick={() => setAsPrimary(image.id)}
                      className="flex items-center gap-1 px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs text-white transition-colors"
                    >
                      <Star size={12} />
                      {t('setAsPrimary') || 'Set as primary'}
                    </button>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500/80 hover:bg-red-500 rounded text-xs text-white transition-colors"
                  >
                    <X size={12} />
                    {t('remove') || 'Remove'}
                  </button>
                </div>

                {/* Color selector */}
                {colorOptions.length > 0 && (
                  <div className="mt-2">
                    <select
                      value={imageColorMap[image.id] || ''}
                      onChange={(e) => setImageColor(image.id, e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-[var(--radius-sm)] text-[var(--color-text-body)] focus:outline-none focus:border-[var(--color-accent)]"
                    >
                      <option value="">{t('selectColor') || 'Select color'}</option>
                      {colorOptions.map(color => (
                        <option key={color} value={color}>{color}</option>
                      ))}
                    </select>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Add more button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-line)] flex flex-col items-center justify-center hover:border-[var(--color-accent)] transition-colors"
            >
              <Upload size={20} className="text-[var(--color-text-label)] mb-1" />
              <span className="text-xs text-[var(--color-text-label)]">{t('addMore') || 'Add more'}</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default ProductImageUpload;
