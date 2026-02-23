'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Download, RotateCcw, User, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';

interface GarmentSize {
  bodyWidth?: number;
  length?: number;
  sleeveLength?: number;
  shoulderWidth?: number;
}

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

interface SizeSpec {
  columns: string[];
  rows: { size: string; values: Record<string, string> }[];
}

interface GeminiImageGeneratorProps {
  selectedGarmentImage?: string;
  selectedGarmentName?: string;
  selectedGarmentDescription?: string;
  selectedGarmentCategory?: string;
  selectedGarmentSizeSpecs?: SizeSpec;
  secondGarmentImage?: string;
  secondGarmentName?: string;
}

const femaleHeights = [155, 160, 165, 170, 175, 180];
const maleHeights = [165, 170, 175, 180, 185, 190];

const backgroundOptions = [
  { id: 'studioWhite', labelEn: 'Studio White', labelJa: 'スタジオ白' },
  { id: 'studioGray', labelEn: 'Studio Gray', labelJa: 'スタジオグレー' },
  { id: 'outdoorUrban', labelEn: 'Urban', labelJa: '都市' },
  { id: 'outdoorNature', labelEn: 'Nature', labelJa: '自然' },
  { id: 'cafeIndoor', labelEn: 'Cafe', labelJa: 'カフェ' },
];

const ethnicityOptions = [
  { id: 'japanese', labelEn: 'Japanese', labelJa: '日本人' },
  { id: 'korean', labelEn: 'Korean', labelJa: '韓国人' },
  { id: 'chinese', labelEn: 'Chinese', labelJa: '中国人' },
  { id: 'eastern-european', labelEn: 'E. European', labelJa: '東欧系' },
  { id: 'western-european', labelEn: 'W. European', labelJa: '西欧系' },
];

const poseOptions = [
  { id: 'standing', labelEn: 'Standing', labelJa: 'スタンディング' },
  { id: 'walking', labelEn: 'Walking', labelJa: 'ウォーキング' },
  { id: 'sitting', labelEn: 'Sitting', labelJa: 'シッティング' },
];

const aspectRatioOptions = [
  { id: '1:1', labelEn: '1:1 Square', labelJa: '1:1 正方形' },
  { id: '3:4', labelEn: '3:4 Portrait', labelJa: '3:4 縦長' },
  { id: '4:3', labelEn: '4:3 Landscape', labelJa: '4:3 横長' },
  { id: '9:16', labelEn: '9:16 Story', labelJa: '9:16 ストーリー' },
];

export function GeminiImageGenerator({
  selectedGarmentImage,
  selectedGarmentName,
  selectedGarmentDescription,
  selectedGarmentSizeSpecs,
  secondGarmentImage,
  secondGarmentName,
}: GeminiImageGeneratorProps) {
  const locale = useLocale();
  const [modelDatabase, setModelDatabase] = useState<ModelDatabase | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedSize, setExtractedSize] = useState<GarmentSize | null>(null);

  const [settings, setSettings] = useState({
    gender: 'female',
    height: 165,
    ethnicity: 'japanese',
    pose: 'standing',
    background: 'studioWhite',
    aspectRatio: '3:4',
    customPrompt: '',
  });

  useEffect(() => {
    fetch('/models/database.json')
      .then(res => res.json())
      .then((data: ModelDatabase) => setModelDatabase(data))
      .catch(err => console.error('Failed to load model database:', err));
  }, []);

  // Use structured sizeSpecs if available, otherwise extract from description
  useEffect(() => {
    if (selectedGarmentSizeSpecs && selectedGarmentSizeSpecs.rows.length > 0) {
      // Convert structured sizeSpecs to GarmentSize format (use M size or first available)
      const mRow = selectedGarmentSizeSpecs.rows.find(r => r.size === 'M') || selectedGarmentSizeSpecs.rows[0];
      const size: GarmentSize = {};

      // Map common column names to GarmentSize properties
      const columnMappings: Record<string, keyof GarmentSize> = {
        '身幅': 'bodyWidth',
        '着丈': 'length',
        '袖丈': 'sleeveLength',
        'そで丈': 'sleeveLength',
        '肩幅': 'shoulderWidth',
      };

      for (const [colName, value] of Object.entries(mRow.values)) {
        const key = columnMappings[colName];
        if (key && value) {
          size[key] = parseFloat(value);
        }
      }

      setExtractedSize(size);
    } else if (selectedGarmentDescription) {
      extractSizeFromDescription(selectedGarmentDescription);
    }
  }, [selectedGarmentSizeSpecs, selectedGarmentDescription]);

  const extractSizeFromDescription = async (description: string) => {
    try {
      const response = await fetch('/api/ai/extract-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (response.ok) {
        const result = await response.json();
        setExtractedSize(result.size);
      }
    } catch (err) {
      console.error('Size extraction failed:', err);
    }
  };

  const filteredModels = modelDatabase?.models.filter(model =>
    model.gender === settings.gender &&
    model.ethnicity === settings.ethnicity &&
    model.pose === settings.pose
  ) || [];

  const handleGenerate = async () => {
    if (!selectedGarmentImage) return;
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImage: selectedGarmentImage,
          garmentName: selectedGarmentName,
          garmentSize: extractedSize,
          garmentSizeSpecs: selectedGarmentSizeSpecs,
          secondGarmentImage,
          secondGarmentName,
          modelSettings: settings,
          modelImage: selectedModel?.fullImage,
          background: settings.background,
          aspectRatio: settings.aspectRatio,
          customPrompt: settings.customPrompt,
          locale,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setGeneratedImage(result.images?.[0] || result.image);
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
    link.download = `gemini-${Date.now()}.png`;
    link.click();
  };

  const heightOptions = settings.gender === 'female' ? femaleHeights : maleHeights;
  const hasSecondItem = !!secondGarmentImage;

  return (
    <div className="h-full flex flex-col">
      {/* Top Settings Bar */}
      <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-100">
        <div className="flex gap-1">
          <button
            onClick={() => setSettings(prev => ({ ...prev, gender: 'female', height: 165 }))}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              settings.gender === 'female'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'ja' ? '女性' : 'F'}
          </button>
          <button
            onClick={() => setSettings(prev => ({ ...prev, gender: 'male', height: 175 }))}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              settings.gender === 'male'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {locale === 'ja' ? '男性' : 'M'}
          </button>
        </div>

        <select
          value={settings.height}
          onChange={(e) => setSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
          className="text-sm px-2 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {heightOptions.map(h => <option key={h} value={h}>{h}cm</option>)}
        </select>

        <select
          value={settings.ethnicity}
          onChange={(e) => setSettings(prev => ({ ...prev, ethnicity: e.target.value }))}
          className="text-sm px-2 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {ethnicityOptions.map(e => (
            <option key={e.id} value={e.id}>{locale === 'ja' ? e.labelJa : e.labelEn}</option>
          ))}
        </select>

        <select
          value={settings.pose}
          onChange={(e) => setSettings(prev => ({ ...prev, pose: e.target.value }))}
          className="text-sm px-2 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {poseOptions.map(p => (
            <option key={p.id} value={p.id}>{locale === 'ja' ? p.labelJa : p.labelEn}</option>
          ))}
        </select>

        <select
          value={settings.background}
          onChange={(e) => setSettings(prev => ({ ...prev, background: e.target.value }))}
          className="text-sm px-2 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {backgroundOptions.map(b => (
            <option key={b.id} value={b.id}>{locale === 'ja' ? b.labelJa : b.labelEn}</option>
          ))}
        </select>

        {/* Aspect Ratio */}
        <select
          value={settings.aspectRatio}
          onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
          className="text-sm px-2 py-2 border border-gray-200 rounded-lg bg-white"
        >
          {aspectRatioOptions.map(a => (
            <option key={a.id} value={a.id}>{locale === 'ja' ? a.labelJa : a.labelEn}</option>
          ))}
        </select>

        {/* Selected items indicator */}
        <div className="ml-auto text-sm text-gray-500 flex items-center gap-2">
          {selectedGarmentName && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
              {selectedGarmentName}
            </span>
          )}
          {hasSecondItem && secondGarmentName && (
            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
              + {secondGarmentName}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 pt-4 min-h-0">
        {/* Left: Model Selection */}
        <div className="w-44 flex-shrink-0 flex flex-col">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {locale === 'ja' ? 'モデル' : 'Model'} ({filteredModels.length})
          </h4>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model)}
                className={`w-full aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all relative ${
                  selectedModel?.id === model.id
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                {model.thumbnail ? (
                  <Image src={model.thumbnail} alt={model.id} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <User size={20} className="text-gray-300" />
                  </div>
                )}
                {selectedModel?.id === model.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check size={10} className="text-white" />
                  </div>
                )}
              </button>
            ))}
            {filteredModels.length === 0 && (
              <div className="h-20 flex items-center justify-center bg-gray-50 rounded-lg">
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
                  <Loader2 size={64} className="text-purple-500 animate-spin mb-4" />
                  <p className="text-lg font-medium text-purple-700">
                    {locale === 'ja' ? '生成中...' : 'Generating...'}
                  </p>
                  <p className="text-sm text-purple-400 mt-1">10-20s</p>
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
                  <Sparkles size={64} className="text-purple-200 mb-4" />
                  <p className="text-gray-400">{locale === 'ja' ? 'モデルを選択' : 'Select model'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Prompt & Generate */}
          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              value={settings.customPrompt}
              onChange={(e) => setSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
              placeholder={locale === 'ja' ? '追加プロンプト（任意）' : 'Additional prompt'}
              className="flex-1 text-sm px-4 py-2.5 border border-gray-200 rounded-lg"
            />
            <span className="text-sm text-gray-400">
              {hasSecondItem ? '¥8' : '¥6'}
            </span>
            <Button
              variant="primary"
              size="lg"
              isLoading={isGenerating}
              disabled={!selectedGarmentImage}
              leftIcon={<Sparkles size={16} />}
              onClick={handleGenerate}
              className="!bg-purple-600 hover:!bg-purple-700 !px-6"
            >
              {locale === 'ja' ? '生成' : 'Generate'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default GeminiImageGenerator;
