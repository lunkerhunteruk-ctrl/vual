'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Loader2, Download, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui';
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

interface VTONGeneratorProps {
  selectedGarmentImage?: string;
  selectedGarmentName?: string;
  selectedGarmentCategory?: string;
  secondGarmentImage?: string;
  secondGarmentName?: string;
}

export function VTONGenerator({
  selectedGarmentImage,
  selectedGarmentName,
  secondGarmentImage,
  secondGarmentName,
}: VTONGeneratorProps) {
  const locale = useLocale();
  const [modelDatabase, setModelDatabase] = useState<ModelDatabase | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    gender: 'female',
    ageRange: '18-24',
    ethnicity: 'japanese',
    pose: 'standing',
  });

  useEffect(() => {
    fetch('/models/database.json')
      .then(res => res.json())
      .then((data: ModelDatabase) => setModelDatabase(data))
      .catch(err => console.error('Failed to load model database:', err));
  }, []);

  const filteredModels = modelDatabase?.models.filter(model =>
    model.gender === filters.gender &&
    model.ageRange === filters.ageRange &&
    model.ethnicity === filters.ethnicity &&
    model.pose === filters.pose
  ) || [];

  const handleGenerate = async () => {
    if (!selectedModel || !selectedGarmentImage) return;
    setIsGenerating(true);
    setError(null);

    try {
      // First pass: first garment
      const response = await fetch('/api/ai/vton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personImage: selectedModel.fullImage,
          garmentImage: selectedGarmentImage,
          category: 'upper_body',
        }),
      });
      const result = await response.json();

      if (result.success) {
        // If second item, do second pass
        if (secondGarmentImage) {
          const secondResponse = await fetch('/api/ai/vton', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              personImage: result.resultImage,
              garmentImage: secondGarmentImage,
              category: 'lower_body',
            }),
          });
          const secondResult = await secondResponse.json();
          setGeneratedImage(secondResult.success ? secondResult.resultImage : result.resultImage);
        } else {
          setGeneratedImage(result.resultImage);
        }
      } else {
        setError(result.error || 'Generation failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `vton-${Date.now()}.png`;
    link.click();
  };

  const hasSecondItem = !!secondGarmentImage;

  return (
    <div className="h-full flex flex-col">
      {/* Top Settings Bar */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setFilters(prev => ({ ...prev, gender: 'female' }))}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filters.gender === 'female'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'ja' ? '女性' : 'Female'}
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, gender: 'male' }))}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              filters.gender === 'male'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'ja' ? '男性' : 'Male'}
          </button>
        </div>

        <select
          value={filters.ageRange}
          onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value }))}
          className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {modelDatabase?.ageRanges.map(a => (
            <option key={a.id} value={a.id}>{locale === 'ja' ? a.labelJa : a.labelEn}</option>
          ))}
        </select>

        <select
          value={filters.ethnicity}
          onChange={(e) => setFilters(prev => ({ ...prev, ethnicity: e.target.value }))}
          className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {modelDatabase?.ethnicities.map(e => (
            <option key={e.id} value={e.id}>{locale === 'ja' ? e.labelJa : e.labelEn}</option>
          ))}
        </select>

        <select
          value={filters.pose}
          onChange={(e) => setFilters(prev => ({ ...prev, pose: e.target.value }))}
          className="text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {modelDatabase?.poses.map(p => (
            <option key={p.id} value={p.id}>{locale === 'ja' ? p.labelJa : p.labelEn}</option>
          ))}
        </select>

        {/* Selected items indicator */}
        <div className="ml-auto text-sm text-gray-500">
          {selectedGarmentName && (
            <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
              {selectedGarmentName}
            </span>
          )}
          {hasSecondItem && secondGarmentName && (
            <span className="ml-2 px-2 py-1 bg-green-50 text-green-700 rounded">
              + {secondGarmentName}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 pt-4 min-h-0">
        {/* Left: Model Selection */}
        <div className="w-44 flex-shrink-0 flex flex-col">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <User size={12} />
            {locale === 'ja' ? 'モデル' : 'Model'} ({filteredModels.length})
          </h4>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`w-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedModel?.id === model.id
                    ? 'border-green-500 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                {model.thumbnail ? (
                  <Image src={model.thumbnail} alt={model.id} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <User size={24} className="text-gray-300" />
                  </div>
                )}
                {selectedModel?.id === model.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
            {filteredModels.length === 0 && (
              <div className="h-24 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">{locale === 'ja' ? 'なし' : 'None'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center"
                >
                  <Loader2 size={64} className="text-green-500 animate-spin mb-4" />
                  <p className="text-lg font-medium text-green-700">
                    {locale === 'ja' ? '生成中...' : 'Generating...'}
                  </p>
                </motion.div>
              ) : generatedImage ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative h-full w-full flex items-center justify-center"
                >
                  <img
                    src={generatedImage}
                    alt="Generated"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    className="rounded-lg shadow-lg"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button onClick={handleDownload} className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50">
                      <Download size={20} />
                    </button>
                    <button onClick={() => setGeneratedImage(null)} className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50">
                      <RotateCcw size={20} />
                    </button>
                  </div>
                </motion.div>
              ) : selectedModel?.thumbnail ? (
                <motion.div
                  key="model"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full w-full flex items-center justify-center"
                >
                  <img
                    src={selectedModel.thumbnail}
                    alt="Model"
                    style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain' }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center"
                >
                  <Zap size={64} className="text-green-200 mb-4" />
                  <p className="text-gray-400">{locale === 'ja' ? 'モデルを選択' : 'Select a model'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Generate Button */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {error && <span className="text-red-500">{error}</span>}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {hasSecondItem ? '¥6 (2点)' : '¥3'}
              </span>
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={!selectedModel || !selectedGarmentImage}
                leftIcon={<Zap size={18} />}
                onClick={handleGenerate}
                className="!bg-green-600 hover:!bg-green-700 !px-8"
              >
                {locale === 'ja' ? 'VTON 生成' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VTONGenerator;
