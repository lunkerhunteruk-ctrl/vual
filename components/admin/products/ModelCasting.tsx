'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { Button, Select } from '@/components/ui';

interface GeneratedLook {
  id: string;
  imageUrl: string;
  settings: {
    gender: string;
    ageRange: string;
    ethnicity: string;
    poseStyle: string;
    background: string;
  };
}

const modelCastingOptions = {
  gender: [
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
    { value: 'non-binary', label: 'Non-binary' },
  ],
  ageRange: [
    { value: '18-24', label: '18-24' },
    { value: '25-35', label: '25-35' },
    { value: '36-45', label: '36-45' },
    { value: '46-55', label: '46-55' },
    { value: '55+', label: '55+' },
  ],
  ethnicity: [
    { value: 'asian', label: 'Asian' },
    { value: 'black', label: 'Black' },
    { value: 'caucasian', label: 'Caucasian' },
    { value: 'hispanic', label: 'Hispanic' },
    { value: 'middle-eastern', label: 'Middle Eastern' },
    { value: 'mixed', label: 'Mixed' },
  ],
  poseStyle: [
    { value: 'standing', label: 'Standing' },
    { value: 'walking', label: 'Walking' },
    { value: 'sitting', label: 'Sitting' },
    { value: 'dynamic', label: 'Dynamic' },
  ],
  background: [
    { value: 'studio-white', label: 'Studio White' },
    { value: 'studio-gray', label: 'Studio Gray' },
    { value: 'outdoor-urban', label: 'Outdoor Urban' },
    { value: 'outdoor-nature', label: 'Outdoor Nature' },
    { value: 'lifestyle', label: 'Lifestyle' },
  ],
};

export function ModelCasting() {
  const t = useTranslations('admin.modelCasting');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLooks, setGeneratedLooks] = useState<GeneratedLook[]>([]);
  const [settings, setSettings] = useState({
    gender: 'female',
    ageRange: '25-35',
    ethnicity: 'asian',
    poseStyle: 'standing',
    background: 'studio-white',
  });

  const handleGenerate = async () => {
    setIsGenerating(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newLook: GeneratedLook = {
      id: Date.now().toString(),
      imageUrl: '',
      settings: { ...settings },
    };

    setGeneratedLooks(prev => [...prev, newLook]);
    setIsGenerating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[var(--color-bg-element)] flex items-center justify-center">
          <Sparkles size={20} className="text-[var(--color-accent)]" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-title-active)] tracking-wide">
            {t('title')}
          </h3>
          <p className="text-sm text-[var(--color-text-label)]">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select
          label={t('gender')}
          value={settings.gender}
          onChange={(e) => setSettings(prev => ({ ...prev, gender: e.target.value }))}
          options={modelCastingOptions.gender}
        />
        <Select
          label={t('ageRange')}
          value={settings.ageRange}
          onChange={(e) => setSettings(prev => ({ ...prev, ageRange: e.target.value }))}
          options={modelCastingOptions.ageRange}
        />
        <Select
          label={t('ethnicity')}
          value={settings.ethnicity}
          onChange={(e) => setSettings(prev => ({ ...prev, ethnicity: e.target.value }))}
          options={modelCastingOptions.ethnicity}
        />
        <Select
          label={t('poseStyle')}
          value={settings.poseStyle}
          onChange={(e) => setSettings(prev => ({ ...prev, poseStyle: e.target.value }))}
          options={modelCastingOptions.poseStyle}
        />
        <Select
          label={t('background')}
          value={settings.background}
          onChange={(e) => setSettings(prev => ({ ...prev, background: e.target.value }))}
          options={modelCastingOptions.background}
        />
      </div>

      {/* Generate Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isGenerating}
        leftIcon={<Sparkles size={18} />}
        onClick={handleGenerate}
      >
        {t('generateLook')}
      </Button>

      {/* Generated Looks Gallery */}
      {generatedLooks.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-4">
            {t('generatedLooks')}
          </h4>
          <div className="grid grid-cols-4 gap-4">
            <AnimatePresence>
              {generatedLooks.map((look) => (
                <motion.div
                  key={look.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="aspect-[3/4] bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] rounded-[var(--radius-md)] overflow-hidden relative group"
                >
                  {/* Placeholder for generated image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={24} className="text-[var(--color-accent)] opacity-50" />
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="inverse" size="sm">
                      Use This
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add More Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="aspect-[3/4] bg-[var(--color-bg-element)] border-2 border-dashed border-[var(--color-line)] rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-2 hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={24} className="text-[var(--color-accent)] animate-spin" />
              ) : (
                <>
                  <Plus size={24} className="text-[var(--color-text-label)]" />
                  <span className="text-sm text-[var(--color-text-label)]">Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {isGenerating && generatedLooks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 p-8 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-[var(--color-line)] border-t-[var(--color-accent)] animate-spin" />
              <Sparkles size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--color-accent)]" />
            </div>
            <p className="text-sm text-[var(--color-text-body)]">Generating your look...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ModelCasting;
