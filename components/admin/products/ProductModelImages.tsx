'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Unlink } from 'lucide-react';

interface ModelImage {
  id: string;
  image_url: string;
  position: number;
  link_id: string;
  created_at: string;
}

interface ProductModelImagesProps {
  productId: string;
}

export function ProductModelImages({ productId }: ProductModelImagesProps) {
  const [images, setImages] = useState<ModelImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<ModelImage | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/products/model-images?productId=${productId}`);
      const data = await res.json();
      if (data.success) {
        setImages(data.modelImages || []);
      }
    } catch (err) {
      console.error('Failed to fetch model images:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchImages();
    }
  }, [productId]);

  const handleUnlink = async (linkId: string) => {
    setUnlinking(linkId);
    try {
      const res = await fetch(`/api/products/model-images?linkId=${linkId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setImages(prev => prev.filter(img => img.link_id !== linkId));
        if (previewImage?.link_id === linkId) {
          setPreviewImage(null);
        }
      }
    } catch (err) {
      console.error('Failed to unlink:', err);
    } finally {
      setUnlinking(null);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4"
      >
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-3">
          モデル着用画像
        </h3>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-[var(--color-text-label)]" />
        </div>
      </motion.div>
    );
  }

  if (images.length === 0) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-4 mt-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
            モデル着用画像
          </h3>
          <span className="text-xs text-[var(--color-text-label)]">
            {images.length}枚
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <div
                onClick={() => setPreviewImage(img)}
                className="aspect-square rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-bg-element)] border border-[var(--color-line)] cursor-pointer flex items-center justify-center"
              >
                <img
                  src={img.image_url}
                  alt="Model"
                  className="max-w-full max-h-full object-contain"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlink(img.link_id);
                    }}
                    disabled={unlinking === img.link_id}
                    className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                  >
                    {unlinking === img.link_id ? (
                      <Loader2 size={12} className="text-white animate-spin" />
                    ) : (
                      <Unlink size={12} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[var(--color-text-label)] mt-2">
          AI Studioから紐付け・解除できます
        </p>
      </motion.div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
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
              className="relative bg-white rounded-lg overflow-hidden max-w-md w-full"
            >
              <div className="bg-[#f5f5f0] flex items-center justify-center max-h-[70vh]">
                <img
                  src={previewImage.image_url}
                  alt="Model"
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-3 border-t border-[var(--color-line)] flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-label)]">
                  モデル着用画像
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      handleUnlink(previewImage.link_id);
                    }}
                    disabled={unlinking === previewImage.link_id}
                    className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded transition-colors flex items-center gap-1"
                  >
                    <Unlink size={12} />
                    紐付け解除
                  </button>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="px-3 py-1.5 text-xs bg-[var(--color-bg-element)] hover:bg-[var(--color-bg-input)] rounded transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
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
