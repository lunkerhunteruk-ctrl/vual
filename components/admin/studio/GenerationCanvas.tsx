'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, History, Download, Share2, Loader2 } from 'lucide-react';
import { Button, Select } from '@/components/ui';

interface GeneratedImage {
  id: string;
  timestamp: Date;
}

interface GenerationCanvasProps {
  selectedItems: string[];
  isGenerating: boolean;
  onGenerate: () => void;
}

const modelSettingsOptions = {
  gender: [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
  ],
  pose: [
    { value: 'standing', label: 'Standing' },
    { value: 'walking', label: 'Walking' },
    { value: 'dynamic', label: 'Dynamic' },
  ],
  background: [
    { value: 'studio', label: 'Studio' },
    { value: 'urban', label: 'Urban' },
    { value: 'nature', label: 'Nature' },
  ],
};

export function GenerationCanvas({ selectedItems, isGenerating, onGenerate }: GenerationCanvasProps) {
  const t = useTranslations('admin.studio');
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const hasSelection = selectedItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-5 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('generationCanvas')}
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-[var(--radius-md)] transition-colors ${
            showHistory
              ? 'bg-[var(--color-bg-element)] text-[var(--color-accent)]'
              : 'hover:bg-[var(--color-bg-element)] text-[var(--color-text-label)]'
          }`}
        >
          <History size={18} />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 min-h-[400px] bg-[var(--color-bg-element)] rounded-[var(--radius-md)] relative overflow-hidden mb-4">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              {/* Skeleton Loading */}
              <div className="relative w-48 h-64 mb-4">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
                <div className="w-full h-full bg-[var(--color-bg-input)] rounded-[var(--radius-md)]" />
              </div>
              <div className="flex items-center gap-2 text-[var(--color-text-body)]">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">{t('generating')}</span>
              </div>
            </motion.div>
          ) : hasSelection ? (
            <motion.div
              key="canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {generatedImages.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Generated Image Placeholder */}
                  <div className="w-64 h-80 bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-line)] rounded-[var(--radius-md)] flex items-center justify-center">
                    <Sparkles size={48} className="text-[var(--color-accent)] opacity-50" />
                  </div>

                  {/* Action buttons */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <button className="p-2 bg-white/80 backdrop-blur-sm rounded-[var(--radius-md)] hover:bg-white transition-colors">
                      <Download size={16} className="text-[var(--color-text-body)]" />
                    </button>
                    <button className="p-2 bg-white/80 backdrop-blur-sm rounded-[var(--radius-md)] hover:bg-white transition-colors">
                      <Share2 size={16} className="text-[var(--color-text-body)]" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-bg-input)] flex items-center justify-center">
                    <Sparkles size={32} className="text-[var(--color-accent)]" />
                  </div>
                  <p className="text-sm text-[var(--color-text-body)] mb-1">
                    {selectedItems.length} items selected
                  </p>
                  <p className="text-xs text-[var(--color-text-label)]">
                    Click "Generate New Look" to create
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
            >
              <div className="w-20 h-20 mb-4 rounded-full bg-[var(--color-bg-input)] flex items-center justify-center">
                <Sparkles size={28} className="text-[var(--color-text-label)]" />
              </div>
              <p className="text-sm font-medium text-[var(--color-text-body)] mb-1">
                {t('noItemsSelected')}
              </p>
              <p className="text-xs text-[var(--color-text-label)]">
                {t('selectItemsToGenerate')}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Model Settings */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-3">
          {t('modelSettings')}
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <Select
            options={modelSettingsOptions.gender}
            defaultValue="female"
          />
          <Select
            options={modelSettingsOptions.pose}
            defaultValue="standing"
          />
          <Select
            options={modelSettingsOptions.background}
            defaultValue="studio"
          />
        </div>
      </div>

      {/* Generate Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isGenerating}
        disabled={!hasSelection}
        leftIcon={<Sparkles size={18} />}
        onClick={onGenerate}
      >
        {t('generateNewLook')}
      </Button>
    </motion.div>
  );
}

export default GenerationCanvas;
