'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, User, Loader2, Download, RotateCcw, Check, Clock, Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui';
import Image from 'next/image';
import {
  addToVTONQueue,
  pollVTONQueueUntilComplete,
  cancelVTONQueueItem,
  type VTONQueueItemStatus,
} from '@/lib/ai/vton-queue';

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
  secondGarmentCategory?: string;
  thirdGarmentImage?: string;
  thirdGarmentName?: string;
  thirdGarmentCategory?: string;
}

// Helper to determine VTON category from product category
// Handles both new format (e.g., "mens-wear-pants") and legacy format
function getVTONCategory(productCategory?: string): 'upper_body' | 'lower_body' | 'dresses' | 'footwear' {
  if (!productCategory) return 'upper_body';
  const lower = productCategory.toLowerCase();

  // Lower body items
  if (lower.includes('pants') || lower.includes('skirts') || lower.includes('skirt') ||
      lower.includes('bottom') || lower.includes('パンツ') || lower.includes('スカート')) {
    return 'lower_body';
  }

  // Dresses
  if (lower.includes('dresses') || lower.includes('dress') || lower.includes('ワンピース')) {
    return 'dresses';
  }

  // Footwear
  if (lower.includes('shoes') || lower.includes('shoe') || lower.includes('boot') ||
      lower.includes('sneaker') || lower.includes('sandal') ||
      lower.includes('シューズ') || lower.includes('靴') || lower.includes('ブーツ') ||
      lower.includes('スニーカー') || lower.includes('サンダル')) {
    return 'footwear';
  }

  // Default to upper body (tops, outer, suits, etc.)
  return 'upper_body';
}

// Helper function to convert image URL to base64 on client-side
async function imageToBase64(imageUrl: string): Promise<string> {
  // If already base64, return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // For blob URLs, use canvas method (blob URLs don't work with fetch cross-context)
  if (imageUrl.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
        } catch (canvasError) {
          reject(new Error(`Canvas conversion failed for blob: ${canvasError}`));
        }
      };
      img.onerror = () => reject(new Error(`Failed to load blob image. The image may have expired. Please re-upload the product image.`));
      img.src = imageUrl;
    });
  }

  // Try fetch method first (works for Supabase and external URLs)
  try {
    const response = await fetch(imageUrl);
    if (response.ok) {
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch (fetchError) {
    console.log('Fetch method failed, trying canvas method:', fetchError);
  }

  // Fallback to canvas method for local images (like /models/...)
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    // Don't set crossOrigin for local images
    if (!imageUrl.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      } catch (canvasError) {
        reject(new Error(`Canvas conversion failed: ${canvasError}`));
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
}

export function VTONGenerator({
  selectedGarmentImage,
  selectedGarmentName,
  selectedGarmentCategory,
  secondGarmentImage,
  secondGarmentName,
  secondGarmentCategory,
  thirdGarmentImage,
  thirdGarmentName,
  thirdGarmentCategory,
}: VTONGeneratorProps) {
  const locale = useLocale();
  const [modelDatabase, setModelDatabase] = useState<ModelDatabase | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);

  // Multiple queue items tracking
  interface QueueItem {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    position: number;
    itemsAhead: number;
    resultImage?: string;
    error?: string;
  }
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const pollingRef = useRef<{ [id: string]: boolean }>({});

  // Saved results from database
  interface SavedResult {
    id: string;
    image_url: string;
    garment_count: number;
    created_at: string;
  }
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);

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

  // Load saved results on mount
  const loadSavedResults = async () => {
    try {
      const response = await fetch('/api/ai/vton-results?limit=20');
      const data = await response.json();
      if (data.success && data.results) {
        setSavedResults(data.results);
      }
    } catch (err) {
      console.error('Failed to load saved results:', err);
    }
  };

  useEffect(() => {
    loadSavedResults();
  }, []);

  // Delete a saved result
  const handleDeleteSavedResult = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/vton-results?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setSavedResults(prev => prev.filter(r => r.id !== id));
        // Clear preview if it was showing this image
        const deletedResult = savedResults.find(r => r.id === id);
        if (deletedResult && generatedImage === deletedResult.image_url) {
          setGeneratedImage(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete result:', err);
    }
  };

  const filteredModels = modelDatabase?.models.filter(model =>
    model.gender === filters.gender &&
    model.ageRange === filters.ageRange &&
    model.ethnicity === filters.ethnicity &&
    model.pose === filters.pose
  ) || [];

  // Compute available options based on existing models
  const availableGenders = useMemo(() => {
    if (!modelDatabase) return [];
    const gendersWithModels = new Set(modelDatabase.models.map(m => m.gender));
    return modelDatabase.genders.filter(g => gendersWithModels.has(g.id));
  }, [modelDatabase]);

  const availableAgeRanges = useMemo(() => {
    if (!modelDatabase) return [];
    const agesWithModels = new Set(
      modelDatabase.models
        .filter(m => m.gender === filters.gender)
        .map(m => m.ageRange)
    );
    return modelDatabase.ageRanges.filter(a => agesWithModels.has(a.id));
  }, [modelDatabase, filters.gender]);

  const availableEthnicities = useMemo(() => {
    if (!modelDatabase) return [];
    const ethnicitiesWithModels = new Set(
      modelDatabase.models
        .filter(m => m.gender === filters.gender && m.ageRange === filters.ageRange)
        .map(m => m.ethnicity)
    );
    return modelDatabase.ethnicities.filter(e => ethnicitiesWithModels.has(e.id));
  }, [modelDatabase, filters.gender, filters.ageRange]);

  const availablePoses = useMemo(() => {
    if (!modelDatabase) return [];
    const posesWithModels = new Set(
      modelDatabase.models
        .filter(m => m.gender === filters.gender && m.ageRange === filters.ageRange && m.ethnicity === filters.ethnicity)
        .map(m => m.pose)
    );
    return modelDatabase.poses.filter(p => posesWithModels.has(p.id));
  }, [modelDatabase, filters.gender, filters.ageRange, filters.ethnicity]);

  // Auto-select first available option when current selection becomes unavailable
  useEffect(() => {
    if (availableAgeRanges.length > 0 && !availableAgeRanges.find(a => a.id === filters.ageRange)) {
      setFilters(prev => ({ ...prev, ageRange: availableAgeRanges[0].id }));
    }
  }, [availableAgeRanges, filters.ageRange]);

  useEffect(() => {
    if (availableEthnicities.length > 0 && !availableEthnicities.find(e => e.id === filters.ethnicity)) {
      setFilters(prev => ({ ...prev, ethnicity: availableEthnicities[0].id }));
    }
  }, [availableEthnicities, filters.ethnicity]);

  useEffect(() => {
    if (availablePoses.length > 0 && !availablePoses.find(p => p.id === filters.pose)) {
      setFilters(prev => ({ ...prev, pose: availablePoses[0].id }));
    }
  }, [availablePoses, filters.pose]);

  // Cancel a specific queue item
  const handleCancelItem = async (itemId: string) => {
    pollingRef.current[itemId] = false;
    await cancelVTONQueueItem(itemId);
    setQueueItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Poll a queue item for completion
  const pollQueueItem = async (queueId: string) => {
    pollingRef.current[queueId] = true;

    try {
      const finalStatus = await pollVTONQueueUntilComplete(queueId, {
        pollInterval: 2000,
        maxPollTime: 600000,
        onProgress: (status) => {
          if (!pollingRef.current[queueId]) return;

          setQueueItems(prev => prev.map(item =>
            item.id === queueId
              ? { ...item, status: status.status, position: status.position, itemsAhead: status.itemsAhead }
              : item
          ));
        },
      });

      if (!pollingRef.current[queueId]) return;

      if (finalStatus.status === 'completed' && finalStatus.resultData?.results?.length) {
        const finalResult = finalStatus.resultData.results[finalStatus.resultData.results.length - 1];
        // Reload saved results to get the newly saved image
        loadSavedResults();
        setQueueItems(prev => prev.map(item =>
          item.id === queueId
            ? { ...item, status: 'completed', resultImage: finalResult.resultImage }
            : item
        ));
        // Auto-display the latest completed result
        setGeneratedImage(finalResult.resultImage);
      } else if (finalStatus.status === 'failed') {
        setQueueItems(prev => prev.map(item =>
          item.id === queueId
            ? { ...item, status: 'failed', error: finalStatus.errorMessage || 'Failed' }
            : item
        ));
      }
    } catch (err) {
      if (pollingRef.current[queueId]) {
        setQueueItems(prev => prev.map(item =>
          item.id === queueId
            ? { ...item, status: 'failed', error: err instanceof Error ? err.message : 'Error' }
            : item
        ));
      }
    } finally {
      delete pollingRef.current[queueId];
    }
  };

  // Add to queue (without blocking)
  const handleAddToQueue = async () => {
    if (!selectedModel || !selectedGarmentImage) return;

    setIsAddingToQueue(true);
    setError(null);

    try {
      // Convert images to base64
      const personImageBase64 = await imageToBase64(selectedModel.fullImage);
      const garmentImages: string[] = [];
      const categories: ('upper_body' | 'lower_body' | 'dresses' | 'footwear')[] = [];

      garmentImages.push(await imageToBase64(selectedGarmentImage));
      categories.push(getVTONCategory(selectedGarmentCategory));

      if (secondGarmentImage) {
        garmentImages.push(await imageToBase64(secondGarmentImage));
        categories.push(getVTONCategory(secondGarmentCategory));
      }

      if (thirdGarmentImage) {
        garmentImages.push(await imageToBase64(thirdGarmentImage));
        categories.push(getVTONCategory(thirdGarmentCategory));
      }

      // Add to queue
      const addResult = await addToVTONQueue({
        personImage: personImageBase64,
        garmentImages,
        categories,
      });

      if (!addResult.success || !addResult.queueId) {
        throw new Error(addResult.error || 'Failed to add to queue');
      }

      // Add to local tracking
      const newItem: QueueItem = {
        id: addResult.queueId,
        status: 'pending',
        position: addResult.position || 1,
        itemsAhead: addResult.itemsAhead || 0,
      };
      setQueueItems(prev => [...prev, newItem]);

      // Start polling in background
      pollQueueItem(addResult.queueId);

    } catch (err) {
      console.error('Failed to add to queue:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to queue');
    } finally {
      setIsAddingToQueue(false);
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
  const hasThirdItem = !!thirdGarmentImage;
  // Count all items for generation
  const itemCount = 1 + (hasSecondItem ? 1 : 0) + (hasThirdItem ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Top Settings Bar */}
      <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-[var(--color-line)]">
        <div className="flex gap-1">
          {availableGenders.map(g => (
            <button
              key={g.id}
              onClick={() => setFilters(prev => ({ ...prev, gender: g.id }))}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                filters.gender === g.id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
              }`}
            >
              {locale === 'ja' ? g.labelJa : g.labelEn}
            </button>
          ))}
        </div>

        {availableAgeRanges.length > 0 && (
          <select
            value={filters.ageRange}
            onChange={(e) => setFilters(prev => ({ ...prev, ageRange: e.target.value }))}
            className="text-sm px-3 py-2 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
          >
            {availableAgeRanges.map(a => (
              <option key={a.id} value={a.id}>{locale === 'ja' ? a.labelJa : a.labelEn}</option>
            ))}
          </select>
        )}

        {availableEthnicities.length > 0 && (
          <select
            value={filters.ethnicity}
            onChange={(e) => setFilters(prev => ({ ...prev, ethnicity: e.target.value }))}
            className="text-sm px-3 py-2 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
          >
            {availableEthnicities.map(e => (
              <option key={e.id} value={e.id}>{locale === 'ja' ? e.labelJa : e.labelEn}</option>
            ))}
          </select>
        )}

        {availablePoses.length > 0 && (
          <select
            value={filters.pose}
            onChange={(e) => setFilters(prev => ({ ...prev, pose: e.target.value }))}
            className="text-sm px-3 py-2 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
          >
            {availablePoses.map(p => (
              <option key={p.id} value={p.id}>{locale === 'ja' ? p.labelJa : p.labelEn}</option>
            ))}
          </select>
        )}

        {/* Selected items indicator */}
        <div className="ml-auto text-sm text-[var(--color-text-label)] flex items-center gap-1 flex-wrap">
          {selectedGarmentName && (
            <span className="px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              {selectedGarmentName}
            </span>
          )}
          {hasSecondItem && secondGarmentName && (
            <span className="px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {secondGarmentName}
            </span>
          )}
          {hasThirdItem && thirdGarmentName && (
            <span className="px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {thirdGarmentName}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 pt-4 min-h-0">
        {/* Left: Model Selection */}
        <div className="w-44 flex-shrink-0 flex flex-col">
          <h4 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-2 flex items-center gap-1">
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
                    ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                    : 'border-[var(--color-line)] hover:border-[var(--color-accent)]'
                }`}
              >
                {model.thumbnail ? (
                  <Image src={model.thumbnail} alt={model.id} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-[var(--color-bg-element)] flex items-center justify-center">
                    <User size={24} className="text-[var(--color-text-placeholder)]" />
                  </div>
                )}
                {selectedModel?.id === model.id && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
            {filteredModels.length === 0 && (
              <div className="h-24 flex items-center justify-center bg-[var(--color-bg-element)] rounded-lg">
                <p className="text-xs text-[var(--color-text-placeholder)]">{locale === 'ja' ? 'なし' : 'None'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 bg-[var(--color-bg-element)] rounded-2xl overflow-hidden flex items-center justify-center p-4">
            <AnimatePresence mode="wait">
              {generatedImage ? (
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
                    <button onClick={handleDownload} className="p-3 bg-white rounded-full shadow-lg hover:bg-[var(--color-bg-element)]">
                      <Download size={20} />
                    </button>
                    <button onClick={() => setGeneratedImage(null)} className="p-3 bg-white rounded-full shadow-lg hover:bg-[var(--color-bg-element)]">
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
                  <Zap size={64} className="text-[var(--color-accent)]/30 mb-4" />
                  <p className="text-[var(--color-text-placeholder)]">{locale === 'ja' ? 'モデルを選択' : 'Select a model'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom: Queue List & Generate Button */}
          <div className="mt-4 space-y-3">
            {/* Queue Items List */}
            {queueItems.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-[var(--color-bg-element)] rounded-lg">
                {queueItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      item.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : item.status === 'processing'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status === 'processing' && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    {item.status === 'pending' && (
                      <Clock size={12} />
                    )}
                    {item.status === 'completed' && (
                      <Check size={12} />
                    )}
                    <span>
                      {item.status === 'pending' && `#${index + 1} ${locale === 'ja' ? `待機中 (${item.itemsAhead}件前)` : `Waiting (${item.itemsAhead} ahead)`}`}
                      {item.status === 'processing' && `#${index + 1} ${locale === 'ja' ? '生成中...' : 'Generating...'}`}
                      {item.status === 'completed' && `#${index + 1} ${locale === 'ja' ? '完了' : 'Done'}`}
                      {item.status === 'failed' && `#${index + 1} ${locale === 'ja' ? '失敗' : 'Failed'}`}
                    </span>
                    {item.status === 'completed' && item.resultImage && (
                      <button
                        onClick={() => setGeneratedImage(item.resultImage!)}
                        className="ml-1 underline hover:no-underline"
                      >
                        {locale === 'ja' ? '表示' : 'View'}
                      </button>
                    )}
                    {(item.status === 'pending' || item.status === 'processing') && (
                      <button
                        onClick={() => handleCancelItem(item.id)}
                        className="ml-1 hover:text-red-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {queueItems.length > 0 && (
                  <button
                    onClick={() => setQueueItems(prev => prev.filter(i => i.status === 'pending' || i.status === 'processing'))}
                    className="px-2 py-1 text-xs text-[var(--color-text-label)] hover:text-[var(--color-text-body)]"
                  >
                    {locale === 'ja' ? '完了を消す' : 'Clear done'}
                  </button>
                )}
              </div>
            )}

            {/* Saved Results Gallery */}
            {savedResults.length > 0 && (
              <div className="p-3 bg-[var(--color-bg-element)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide flex items-center gap-1">
                    <ImageIcon size={12} />
                    {locale === 'ja' ? '生成済み' : 'Generated'} ({savedResults.length})
                  </h4>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {savedResults.map((result) => (
                    <div
                      key={result.id}
                      className="relative flex-shrink-0 group"
                    >
                      <button
                        onClick={() => setGeneratedImage(result.image_url)}
                        className={`w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          generatedImage === result.image_url
                            ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                            : 'border-transparent hover:border-[var(--color-accent)]'
                        }`}
                      >
                        <img
                          src={result.image_url}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                      </button>
                      {/* Overlay buttons on hover */}
                      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg">
                        <a
                          href={result.image_url}
                          download={`vton-${result.id}.png`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 bg-white rounded-full hover:bg-gray-100"
                        >
                          <Download size={12} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSavedResult(result.id);
                          }}
                          className="p-1 bg-white rounded-full hover:bg-red-100"
                        >
                          <Trash2 size={12} className="text-red-500" />
                        </button>
                      </div>
                      {/* Garment count badge */}
                      <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                        {result.garment_count}点
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Button Row */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--color-text-label)]">
                {error && <span className="text-red-500">{error}</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-[var(--color-text-placeholder)]">
                  {`¥${itemCount * 3} (${itemCount}点)`}
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isAddingToQueue}
                  disabled={!selectedModel || !selectedGarmentImage}
                  leftIcon={<Zap size={18} />}
                  onClick={handleAddToQueue}
                  className="!px-8"
                >
                  {locale === 'ja' ? '順番待ちに送る' : 'Add to Queue'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VTONGenerator;
