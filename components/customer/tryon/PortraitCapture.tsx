'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Check, Loader2 } from 'lucide-react';
import { useTryOnStore, type Portrait } from '@/lib/store/tryon';

interface PortraitCaptureProps {
  onClose: () => void;
  onCaptured: (portrait: Portrait) => void;
}

export function PortraitCapture({ onClose, onCaptured }: PortraitCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPortrait } = useTryOnStore();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Resize image to max 1024px
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 1024;
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!preview) return;
    setIsProcessing(true);

    const portrait: Portrait = {
      id: `portrait-${Date.now()}`,
      name: `ポートレート ${new Date().toLocaleDateString('ja-JP')}`,
      dataUrl: preview,
      createdAt: new Date().toISOString(),
    };

    addPortrait(portrait);
    onCaptured(portrait);
    setIsProcessing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md sm:rounded-[var(--radius-lg)] rounded-t-[var(--radius-lg)] p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--color-title-active)]">
            ポートレートを追加
          </h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-[var(--color-bg-element)]">
            <X size={20} className="text-[var(--color-text-label)]" />
          </button>
        </div>

        {!preview ? (
          <>
            {/* Guidelines */}
            <div className="p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] mb-4 text-xs text-[var(--color-text-body)]">
              <p className="font-medium mb-1">撮影のポイント:</p>
              <ul className="space-y-0.5 text-[var(--color-text-label)]">
                <li>- 全身が写るようにしてください</li>
                <li>- 正面を向いて立ってください</li>
                <li>- 明るい場所で撮影してください</li>
                <li>- シンプルな背景がベストです</li>
              </ul>
            </div>

            {/* Upload options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  fileInputRef.current?.setAttribute('capture', 'user');
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <Camera size={28} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-title-active)]">カメラで撮影</span>
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.removeAttribute('capture');
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-lg)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-element)] transition-colors"
              >
                <Upload size={28} className="text-[var(--color-accent)]" />
                <span className="text-sm text-[var(--color-title-active)]">ライブラリから選択</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        ) : (
          <>
            {/* Preview */}
            <div className="relative aspect-[3/4] max-h-[50vh] mx-auto rounded-[var(--radius-lg)] overflow-hidden mb-4 bg-[var(--color-bg-element)]">
              <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 py-3 rounded-[var(--radius-md)] border border-[var(--color-line)] text-sm font-medium text-[var(--color-title-active)]"
              >
                撮り直す
              </button>
              <button
                onClick={handleSave}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                保存する
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
