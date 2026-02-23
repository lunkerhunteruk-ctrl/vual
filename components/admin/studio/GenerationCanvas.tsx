'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, History, Download, Share2, Loader2, Plus, User } from 'lucide-react';
import { Button, Select } from '@/components/ui';
import Image from 'next/image';

interface ModelData {
  id: string;
  gender: string;
  ageRange: string;
  ethnicity: string;
  pose: string;
  thumbnail: string;
  fullImage: string;
}

interface ModelDatabase {
  models: ModelData[];
  ethnicities: { id: string; labelEn: string; labelJa: string }[];
  ageRanges: { id: string; labelEn: string; labelJa: string }[];
  poses: { id: string; labelEn: string; labelJa: string }[];
  genders: { id: string; labelEn: string; labelJa: string }[];
}

interface GeneratedLook {
  id: string;
  imageUrl: string;
  settings: {
    gender: string;
    ageRange: string;
    ethnicity: string;
    pose: string;
    background: string;
  };
}

interface ItemSelection {
  keyItem: string | null;
  subItem: string | null;
  manualSubItem: boolean;
}

interface GenerationCanvasProps {
  selection: ItemSelection;
  isGenerating: boolean;
  onGenerate: (modelSettings: GeneratedLook['settings'] & { aspectRatio: string }, selectedModel?: ModelData) => void;
}

const backgroundOptions = [
  { value: 'studioWhite', label: 'Studio White' },
  { value: 'studioGray', label: 'Studio Gray' },
  { value: 'outdoorUrban', label: 'Outdoor Urban' },
  { value: 'outdoorNature', label: 'Outdoor Nature' },
  { value: 'lifestyle', label: 'Lifestyle' },
];

const aspectRatioOptions = [
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '9:16', label: '9:16 (Story)' },
];

export function GenerationCanvas({ selection, isGenerating, onGenerate }: GenerationCanvasProps) {
  const t = useTranslations('admin.studio');
  const tCasting = useTranslations('admin.modelCasting');
  const locale = useLocale();

  const [modelDatabase, setModelDatabase] = useState<ModelDatabase | null>(null);
  const [filteredModels, setFilteredModels] = useState<ModelData[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [generatedLooks, setGeneratedLooks] = useState<GeneratedLook[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [settings, setSettings] = useState({
    gender: 'female',
    ageRange: '18-24',
    ethnicity: 'japanese',
    pose: 'standing',
    background: 'studioWhite',
    aspectRatio: '3:4',
  });

  // Load model database
  useEffect(() => {
    fetch('/models/database.json')
      .then(res => res.json())
      .then((data: ModelDatabase) => {
        setModelDatabase(data);
      })
      .catch(err => console.error('Failed to load model database:', err));
  }, []);

  // Filter models when settings change
  useEffect(() => {
    if (!modelDatabase) return;

    const filtered = modelDatabase.models.filter(model =>
      model.gender === settings.gender &&
      model.ageRange === settings.ageRange &&
      model.ethnicity === settings.ethnicity &&
      model.pose === settings.pose
    );

    setFilteredModels(filtered);
    setSelectedModel(filtered[0] || null);
  }, [modelDatabase, settings.gender, settings.ageRange, settings.ethnicity, settings.pose]);

  const hasSelection = selection.keyItem !== null;

  const handleGenerate = () => {
    onGenerate(settings, selectedModel || undefined);
  };

  const getLabel = (items: { id: string; labelEn: string; labelJa: string }[] | undefined, id: string) => {
    if (!items) return id;
    const item = items.find(i => i.id === id);
    return locale === 'ja' ? item?.labelJa : item?.labelEn || id;
  };

  // Convert database options to select format
  const genderOptions = modelDatabase?.genders.map(g => ({
    value: g.id,
    label: locale === 'ja' ? g.labelJa : g.labelEn,
  })) || [{ value: 'female', label: 'Female' }, { value: 'male', label: 'Male' }];

  const ageOptions = modelDatabase?.ageRanges.map(a => ({
    value: a.id,
    label: locale === 'ja' ? a.labelJa : a.labelEn,
  })) || [{ value: '18-24', label: '18-24' }];

  const ethnicityOptions = modelDatabase?.ethnicities.map(e => ({
    value: e.id,
    label: locale === 'ja' ? e.labelJa : e.labelEn,
  })) || [{ value: 'japanese', label: 'Japanese' }];

  const poseOptions = modelDatabase?.poses.map(p => ({
    value: p.id,
    label: locale === 'ja' ? p.labelJa : p.labelEn,
  })) || [{ value: 'standing', label: 'Standing' }];

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
      <div className="flex-1 min-h-[300px] bg-[var(--color-bg-element)] rounded-[var(--radius-md)] relative overflow-hidden mb-4">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
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
          ) : generatedLooks.length > 0 ? (
            <motion.div
              key="generated"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-4"
            >
              <div className="grid grid-cols-2 gap-3 h-full">
                {generatedLooks.slice(-4).map((look) => (
                  <div
                    key={look.id}
                    className="relative bg-gradient-to-br from-[var(--color-bg-input)] to-[var(--color-line)] rounded-[var(--radius-md)] flex items-center justify-center group overflow-hidden"
                  >
                    {look.imageUrl ? (
                      <Image
                        src={look.imageUrl}
                        alt="Generated"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Sparkles size={32} className="text-[var(--color-accent)] opacity-50" />
                    )}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white/80 backdrop-blur-sm rounded-md hover:bg-white">
                        <Download size={14} className="text-[var(--color-text-body)]" />
                      </button>
                      <button className="p-1.5 bg-white/80 backdrop-blur-sm rounded-md hover:bg-white">
                        <Share2 size={14} className="text-[var(--color-text-body)]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : hasSelection ? (
            <motion.div
              key="ready"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-[var(--color-bg-input)] flex items-center justify-center">
                <Sparkles size={32} className="text-[var(--color-accent)]" />
              </div>
              <p className="text-sm text-[var(--color-text-body)] mb-1">
                {locale === 'ja' ? 'アイテム選択済み' : 'Item selected'}
              </p>
              <p className="text-xs text-[var(--color-text-label)]">
                {locale === 'ja' ? '「ルック生成」をクリックして作成' : 'Click "Generate Look" to create'}
              </p>
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

      {/* Model Selection from Database */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-3">
          {locale === 'ja' ? 'モデル選択' : 'Select Model'}
        </h4>

        {filteredModels.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`flex-shrink-0 w-16 h-20 rounded-[var(--radius-md)] overflow-hidden border-2 transition-all ${
                  selectedModel?.id === model.id
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : 'border-[var(--color-line)] hover:border-[var(--color-text-label)]'
                }`}
              >
                <div className="w-full h-full bg-[var(--color-bg-element)] flex items-center justify-center">
                  {model.thumbnail ? (
                    <Image
                      src={model.thumbnail}
                      alt={model.id}
                      width={64}
                      height={80}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User size={24} className="text-[var(--color-text-label)]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-label)]">
            <User size={18} />
            <span>{locale === 'ja' ? 'この条件のモデルがありません' : 'No models match this criteria'}</span>
          </div>
        )}
      </div>

      {/* Model Settings */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-[var(--color-text-label)] uppercase tracking-wide mb-3">
          {t('modelSettings')}
        </h4>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            label={tCasting('gender')}
            value={settings.gender}
            onChange={(e) => setSettings(prev => ({ ...prev, gender: e.target.value }))}
            options={genderOptions}
          />
          <Select
            label={tCasting('ageRange')}
            value={settings.ageRange}
            onChange={(e) => setSettings(prev => ({ ...prev, ageRange: e.target.value }))}
            options={ageOptions}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Select
            label={tCasting('ethnicity')}
            value={settings.ethnicity}
            onChange={(e) => setSettings(prev => ({ ...prev, ethnicity: e.target.value }))}
            options={ethnicityOptions}
          />
          <Select
            label={tCasting('poseStyle')}
            value={settings.pose}
            onChange={(e) => setSettings(prev => ({ ...prev, pose: e.target.value }))}
            options={poseOptions}
          />
        </div>
        <Select
          label={tCasting('background')}
          value={settings.background}
          onChange={(e) => setSettings(prev => ({ ...prev, background: e.target.value }))}
          options={backgroundOptions}
        />
        <Select
          label={locale === 'ja' ? 'アスペクト比' : 'Aspect Ratio'}
          value={settings.aspectRatio}
          onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
          options={aspectRatioOptions}
        />
      </div>

      {/* Generate Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isGenerating}
        disabled={!hasSelection}
        leftIcon={<Sparkles size={18} />}
        onClick={handleGenerate}
      >
        {tCasting('generateLook')}
      </Button>
    </motion.div>
  );
}

export default GenerationCanvas;
