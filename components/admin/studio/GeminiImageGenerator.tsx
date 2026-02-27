'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Download, User, Check, Image as ImageIcon, ChevronDown, ChevronUp, X, Link2, CheckCircle2, Layers } from 'lucide-react';
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
  selectedGarmentImages?: string[];
  selectedGarmentName?: string;
  selectedGarmentDescription?: string;
  selectedGarmentCategory?: string;
  selectedGarmentSizeSpecs?: SizeSpec;
  secondGarmentImage?: string;
  secondGarmentImages?: string[];
  secondGarmentName?: string;
  thirdGarmentImage?: string;
  thirdGarmentImages?: string[];
  thirdGarmentName?: string;
  fourthGarmentImage?: string;
  fourthGarmentImages?: string[];
  fourthGarmentName?: string;
  fifthGarmentImage?: string;
  fifthGarmentImages?: string[];
  fifthGarmentName?: string;
  // Product IDs for linking
  selectedProductIds?: string[];
  // All products for modal display
  allProducts?: { id: string; name: string; name_en?: string; category: string; product_images?: { id: string; url: string; is_primary: boolean }[] }[];
  // Store ID for AI Studio credit consumption
  storeId?: string;
}

interface SavedImage {
  id: string;
  image_url: string;
  thumbnail_url?: string;
  garment_count: number;
  product_ids?: string[];
  created_at: string;
}

// Helper function to convert image URL to base64 on client-side
async function imageToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;

  if (imageUrl.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (e) { reject(new Error(`Canvas conversion failed for blob: ${e}`)); }
      };
      img.onerror = () => reject(new Error('Failed to load blob image.'));
      img.src = imageUrl;
    });
  }

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
  } catch { /* fallback below */ }

  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    if (!imageUrl.startsWith('/')) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Failed to get canvas context')); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) { reject(new Error(`Canvas conversion failed: ${e}`)); }
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
    img.src = imageUrl;
  });
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

// All label lookups (superset) - filtered at runtime by available model images
const allAgeRangeLabels: Record<string, { labelEn: string; labelJa: string }> = {
  '18-24': { labelEn: '18-24', labelJa: '18-24歳' },
  '25-34': { labelEn: '25-34', labelJa: '25-34歳' },
  '35-44': { labelEn: '35-44', labelJa: '35-44歳' },
  '45-54': { labelEn: '45-54', labelJa: '45-54歳' },
};

const allEthnicityLabels: Record<string, { labelEn: string; labelJa: string }> = {
  'japanese': { labelEn: 'Japanese', labelJa: '日本人' },
  'korean': { labelEn: 'Korean', labelJa: '韓国人' },
  'chinese': { labelEn: 'Chinese', labelJa: '中国人' },
  'eastern-european': { labelEn: 'E. European', labelJa: '東欧系' },
  'western-european': { labelEn: 'W. European', labelJa: '西欧系' },
  'african': { labelEn: 'African', labelJa: 'アフリカ系' },
  'latin': { labelEn: 'Latin', labelJa: 'ラテン系' },
  'southeast-asian': { labelEn: 'SE Asian', labelJa: '東南アジア系' },
};

const allPoseLabels: Record<string, { labelEn: string; labelJa: string }> = {
  'standing': { labelEn: 'Standing', labelJa: 'スタンディング' },
  'walking': { labelEn: 'Walking', labelJa: 'ウォーキング' },
  'sitting': { labelEn: 'Sitting', labelJa: 'シッティング' },
  'dynamic': { labelEn: 'Dynamic', labelJa: 'ダイナミック' },
};

const aspectRatioOptions = [
  { id: '1:1', labelEn: '1:1 Square', labelJa: '1:1 正方形' },
  { id: '3:4', labelEn: '3:4 Portrait', labelJa: '3:4 縦長' },
  { id: '4:3', labelEn: '4:3 Landscape', labelJa: '4:3 横長' },
  { id: '9:16', labelEn: '9:16 Story', labelJa: '9:16 ストーリー' },
];

export function GeminiImageGenerator({
  selectedGarmentImage,
  selectedGarmentImages = [],
  selectedGarmentName,
  selectedGarmentDescription,
  selectedGarmentSizeSpecs,
  secondGarmentImage,
  secondGarmentImages = [],
  secondGarmentName,
  thirdGarmentImage,
  thirdGarmentImages = [],
  thirdGarmentName,
  fourthGarmentImage,
  fourthGarmentImages = [],
  fourthGarmentName,
  fifthGarmentImage,
  fifthGarmentImages = [],
  fifthGarmentName,
  selectedProductIds = [],
  allProducts = [],
  storeId,
}: GeminiImageGeneratorProps) {
  const locale = useLocale();
  const [modelDatabase, setModelDatabase] = useState<ModelDatabase | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extractedSize, setExtractedSize] = useState<GarmentSize | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [showSavedImages, setShowSavedImages] = useState(false);
  const [modalImage, setModalImage] = useState<SavedImage | null>(null);
  const [linkingProductIds, setLinkingProductIds] = useState<string[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const pendingAutoOpen = useRef(false);

  // AI Studio credit balance
  const [studioCredits, setStudioCredits] = useState<{ subscription: number; topup: number } | null>(null);

  const [settings, setSettings] = useState({
    gender: 'female',
    height: 165,
    ageRange: '18-24',
    ethnicity: 'japanese',
    pose: 'standing',
    background: 'studioWhite',
    aspectRatio: '3:4',
    customPrompt: '',
  });

  // Fetch AI Studio credit balance
  const fetchCredits = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`/api/billing/subscription-status?storeId=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setStudioCredits({
          subscription: data.studioSubscriptionCredits || 0,
          topup: data.studioTopupCredits || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch studio credits:', err);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [storeId]);

  useEffect(() => {
    fetch('/models/database.json')
      .then(res => res.json())
      .then((data: ModelDatabase) => setModelDatabase(data))
      .catch(err => console.error('Failed to load model database:', err));
  }, []);

  useEffect(() => {
    const fetchSavedImages = async () => {
      if (!storeId) return;
      try {
        const response = await fetch(`/api/ai/gemini-results?all=true&storeId=${storeId}&source=studio`);
        const data = await response.json();
        if (data.success && data.results) {
          setSavedImages(data.results);
          // Auto-open modal for the newest image after generation
          if (pendingAutoOpen.current && data.results.length > 0) {
            pendingAutoOpen.current = false;
            const newest = data.results[0];
            const usedIds = allProducts
              .filter((p: any) => newest.product_ids?.includes(p.id))
              .map((p: any) => p.id);
            setModalImage(newest);
            setLinkingProductIds(usedIds);
            setLinkSuccess(false);
            setCollectionSuccess(false);
            setShowSavedImages(true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch saved images:', err);
      }
    };
    fetchSavedImages();
  }, [generatedImage, storeId]);

  useEffect(() => {
    if (selectedGarmentSizeSpecs && selectedGarmentSizeSpecs.rows.length > 0) {
      const mRow = selectedGarmentSizeSpecs.rows.find(r => r.size === 'M') || selectedGarmentSizeSpecs.rows[0];
      const size: GarmentSize = {};
      const columnMappings: Record<string, keyof GarmentSize> = {
        '身幅': 'bodyWidth', '着丈': 'length', '袖丈': 'sleeveLength', 'そで丈': 'sleeveLength', '肩幅': 'shoulderWidth',
      };
      for (const [colName, value] of Object.entries(mRow.values)) {
        const key = columnMappings[colName];
        if (key && value) size[key] = parseFloat(value);
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
    model.ageRange === settings.ageRange &&
    model.ethnicity === settings.ethnicity &&
    model.pose === settings.pose
  ) || [];

  // Compute available options from actual model images, cascading: gender → ageRange → ethnicity → pose
  // If no models exist for a gender, fall back to showing all options
  const models = modelDatabase?.models || [];
  const genderModels = models.filter(m => m.gender === settings.gender);
  const hasModelsForGender = genderModels.length > 0;

  const allAgeRangeIds = Object.keys(allAgeRangeLabels);
  const allEthnicityIds = Object.keys(allEthnicityLabels);
  const allPoseIds = Object.keys(allPoseLabels);

  const availableAgeRanges = hasModelsForGender
    ? [...new Set(genderModels.map(m => m.ageRange))]
    : allAgeRangeIds;

  const availableEthnicities = hasModelsForGender
    ? [...new Set(genderModels.filter(m => m.ageRange === settings.ageRange).map(m => m.ethnicity))]
    : allEthnicityIds;

  const availablePoses = hasModelsForGender
    ? [...new Set(genderModels.filter(m => m.ageRange === settings.ageRange && m.ethnicity === settings.ethnicity).map(m => m.pose))]
    : allPoseIds;

  // If filtered lists are empty (e.g. age has models but no match for specific combo), fallback
  const finalEthnicities = availableEthnicities.length > 0 ? availableEthnicities : allEthnicityIds;
  const finalPoses = availablePoses.length > 0 ? availablePoses : allPoseIds;

  const handleGenerate = async () => {
    if (!selectedGarmentImage && selectedGarmentImages.length === 0) return;

    setIsGenerating(true);
    setError(null);

    try {
      const firstImages = selectedGarmentImages.length > 0 ? selectedGarmentImages : (selectedGarmentImage ? [selectedGarmentImage] : []);
      const secondImages = secondGarmentImages.length > 0 ? secondGarmentImages : (secondGarmentImage ? [secondGarmentImage] : []);
      const thirdImages = thirdGarmentImages.length > 0 ? thirdGarmentImages : (thirdGarmentImage ? [thirdGarmentImage] : []);
      const fourthImages = fourthGarmentImages.length > 0 ? fourthGarmentImages : (fourthGarmentImage ? [fourthGarmentImage] : []);
      const fifthImages = fifthGarmentImages.length > 0 ? fifthGarmentImages : (fifthGarmentImage ? [fifthGarmentImage] : []);

      const allImagesToConvert: Promise<string>[] = [];
      for (const img of firstImages) allImagesToConvert.push(imageToBase64(img));
      if (selectedModel?.fullImage) allImagesToConvert.push(imageToBase64(selectedModel.fullImage));
      for (const img of secondImages) allImagesToConvert.push(imageToBase64(img));
      for (const img of thirdImages) allImagesToConvert.push(imageToBase64(img));
      for (const img of fourthImages) allImagesToConvert.push(imageToBase64(img));
      for (const img of fifthImages) allImagesToConvert.push(imageToBase64(img));

      const convertedImages = await Promise.all(allImagesToConvert);

      let idx = 0;
      const firstGarmentBase64 = convertedImages.slice(idx, idx + firstImages.length);
      idx += firstImages.length;
      const baseImageBase64 = selectedModel?.fullImage ? convertedImages[idx++] : undefined;
      const secondGarmentBase64 = convertedImages.slice(idx, idx + secondImages.length);
      idx += secondImages.length;
      const thirdGarmentBase64 = convertedImages.slice(idx, idx + thirdImages.length);
      idx += thirdImages.length;
      const fourthGarmentBase64 = convertedImages.slice(idx, idx + fourthImages.length);
      idx += fourthImages.length;
      const fifthGarmentBase64 = convertedImages.slice(idx, idx + fifthImages.length);

      const response = await fetch('/api/ai/gemini-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImages: firstGarmentBase64.length > 0 ? firstGarmentBase64 : undefined,
          garmentName: selectedGarmentName,
          garmentSize: extractedSize,
          garmentSizeSpecs: selectedGarmentSizeSpecs,
          secondGarmentImages: secondGarmentBase64,
          secondGarmentName,
          thirdGarmentImages: thirdGarmentBase64,
          thirdGarmentName,
          fourthGarmentImages: fourthGarmentBase64,
          fourthGarmentName,
          fifthGarmentImages: fifthGarmentBase64,
          fifthGarmentName,
          productIds: selectedProductIds,
          modelSettings: settings,
          modelImage: baseImageBase64,
          background: settings.background,
          aspectRatio: settings.aspectRatio,
          customPrompt: settings.customPrompt,
          locale,
          storeId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        // Refresh credit balance after successful generation
        fetchCredits();
        const newImage = result.images?.[0] || result.image;
        setGeneratedImage(newImage);
        pendingAutoOpen.current = true;
        if (newImage && result.savedImageUrl) {
          console.log('Image saved to:', result.savedImageUrl);
        }
      } else if (result.errorCode === 'insufficient_studio_credits') {
        setError(locale === 'ja' ? 'VUALスタジオのクレジットが不足しています。トップアップを購入してください。' : 'Insufficient VUAL Studio credits. Please purchase a top-up pack.');
      } else if (result.errorCode === 'no_subscription') {
        setError(locale === 'ja' ? 'サブスクリプションが有効ではありません。' : 'Subscription is not active.');
      } else {
        setError(result.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Gemini generation error:', err);
      setError(err instanceof Error ? err.message : 'Image conversion failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const heightOptions = settings.gender === 'female' ? femaleHeights : maleHeights;
  const hasSecondItem = !!secondGarmentImage;
  const hasThirdItem = !!thirdGarmentImage;
  const hasFourthItem = !!fourthGarmentImage;
  const hasFifthItem = !!fifthGarmentImage;

  return (
    <div className="h-full flex flex-col">
      {/* Settings Bar */}
      <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-[var(--color-line)] flex-shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => {
              const all = modelDatabase?.models || [];
              const gModels = all.filter(m => m.gender === 'female');
              const age = gModels[0]?.ageRange || '18-24';
              const eth = gModels.find(m => m.ageRange === age)?.ethnicity || 'japanese';
              const pose = gModels.find(m => m.ageRange === age && m.ethnicity === eth)?.pose || 'standing';
              setSettings(prev => ({ ...prev, gender: 'female', height: 165, ageRange: age, ethnicity: eth, pose }));
              setSelectedModel(null);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              settings.gender === 'female'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
            }`}
          >
            {locale === 'ja' ? '女性' : 'F'}
          </button>
          <button
            onClick={() => {
              setSettings(prev => ({ ...prev, gender: 'male', height: 175, ageRange: '18-24', ethnicity: 'japanese', pose: 'standing' }));
              setSelectedModel(null);
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
              settings.gender === 'male'
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
            }`}
          >
            {locale === 'ja' ? '男性' : 'M'}
          </button>
        </div>

        <select
          value={settings.height}
          onChange={(e) => setSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {heightOptions.map(h => <option key={h} value={h}>{h}cm</option>)}
        </select>

        <select
          value={settings.ageRange}
          onChange={(e) => {
            const newAge = e.target.value;
            setSettings(prev => {
              const all = modelDatabase?.models || [];
              const eths = [...new Set(all.filter(m => m.gender === prev.gender && m.ageRange === newAge).map(m => m.ethnicity))];
              const eth = eths.includes(prev.ethnicity) ? prev.ethnicity : (eths[0] || 'japanese');
              const poses = [...new Set(all.filter(m => m.gender === prev.gender && m.ageRange === newAge && m.ethnicity === eth).map(m => m.pose))];
              const pose = poses.includes(prev.pose) ? prev.pose : (poses[0] || 'standing');
              return { ...prev, ageRange: newAge, ethnicity: eth, pose };
            });
            setSelectedModel(null);
          }}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {availableAgeRanges.map(id => {
            const labels = allAgeRangeLabels[id];
            return <option key={id} value={id}>{locale === 'ja' ? labels?.labelJa || id : labels?.labelEn || id}</option>;
          })}
        </select>

        <select
          value={settings.ethnicity}
          onChange={(e) => {
            const newEthnicity = e.target.value;
            setSettings(prev => {
              const posesForNew = [...new Set(
                (modelDatabase?.models || [])
                  .filter(m => m.gender === prev.gender && m.ageRange === prev.ageRange && m.ethnicity === newEthnicity)
                  .map(m => m.pose)
              )];
              const pose = posesForNew.includes(prev.pose) ? prev.pose : (posesForNew[0] || 'standing');
              return { ...prev, ethnicity: newEthnicity, pose };
            });
            setSelectedModel(null);
          }}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {finalEthnicities.map(id => {
            const labels = allEthnicityLabels[id];
            return <option key={id} value={id}>{locale === 'ja' ? labels?.labelJa || id : labels?.labelEn || id}</option>;
          })}
        </select>

        <select
          value={settings.pose}
          onChange={(e) => {
            setSettings(prev => ({ ...prev, pose: e.target.value }));
            setSelectedModel(null);
          }}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {finalPoses.map(id => {
            const labels = allPoseLabels[id];
            return <option key={id} value={id}>{locale === 'ja' ? labels?.labelJa || id : labels?.labelEn || id}</option>;
          })}
        </select>

        <select
          value={settings.background}
          onChange={(e) => setSettings(prev => ({ ...prev, background: e.target.value }))}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {backgroundOptions.map(b => (
            <option key={b.id} value={b.id}>{locale === 'ja' ? b.labelJa : b.labelEn}</option>
          ))}
        </select>

        <select
          value={settings.aspectRatio}
          onChange={(e) => setSettings(prev => ({ ...prev, aspectRatio: e.target.value }))}
          className="text-sm px-2 py-1.5 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)]"
        >
          {aspectRatioOptions.map(a => (
            <option key={a.id} value={a.id}>{locale === 'ja' ? a.labelJa : a.labelEn}</option>
          ))}
        </select>

        {/* Credit balance + selected items */}
        <div className="ml-auto text-sm text-[var(--color-text-label)] flex items-center gap-2 flex-wrap">
          {studioCredits !== null && (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              (studioCredits.subscription + studioCredits.topup) > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}>
              {locale === 'ja' ? 'クレジット' : 'Credits'}: {studioCredits.subscription + studioCredits.topup}
              {studioCredits.topup > 0 && (
                <span className="ml-1 font-normal opacity-70">
                  ({studioCredits.subscription}+{studioCredits.topup})
                </span>
              )}
            </span>
          )}
          {selectedGarmentName && (
            <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              {selectedGarmentName}
            </span>
          )}
          {hasSecondItem && secondGarmentName && (
            <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {secondGarmentName}
            </span>
          )}
          {hasThirdItem && thirdGarmentName && (
            <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {thirdGarmentName}
            </span>
          )}
          {hasFourthItem && fourthGarmentName && (
            <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {fourthGarmentName}
            </span>
          )}
          {hasFifthItem && fifthGarmentName && (
            <span className="px-2 py-0.5 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-xs">
              + {fifthGarmentName}
            </span>
          )}
        </div>
      </div>

      {/* Model Selector (left, vertical scroll) + Preview (right) */}
      <div className="flex-1 min-h-0 flex gap-3 pt-3">
        {/* Model Selector - 2-column vertical scroll */}
        <div className="w-36 flex-shrink-0 flex flex-col">
          <span className="text-[10px] font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-2 text-center">
            {locale === 'ja' ? 'モデル' : 'Model'}
          </span>
          <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredModels.length > 0 ? (
                filteredModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all relative ${
                      selectedModel?.id === model.id
                        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/20'
                        : 'border-[var(--color-line)] hover:border-[var(--color-accent)]'
                    }`}
                  >
                    {model.thumbnail ? (
                      <Image src={model.thumbnail} alt={model.id} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--color-bg-element)] flex items-center justify-center">
                        <User size={16} className="text-[var(--color-text-placeholder)]" />
                      </div>
                    )}
                    {selectedModel?.id === model.id && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <p className="col-span-2 text-[10px] text-[var(--color-text-placeholder)] text-center py-4">{locale === 'ja' ? 'モデルなし' : 'No models'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview - fills remaining space */}
        <div className="flex-1 min-w-0">
          <div className="bg-[var(--color-bg-element)] rounded-2xl overflow-hidden flex items-center justify-center w-full h-full p-4">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center"
                >
                  <Loader2 size={48} className="text-[var(--color-accent)] animate-spin mb-3" />
                  <p className="text-base font-medium text-[var(--color-accent)]">
                    {locale === 'ja' ? '生成中...' : 'Generating...'}
                  </p>
                  <p className="text-xs text-[var(--color-text-placeholder)] mt-1">10-20s</p>
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
                    className="rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => {
                      // Find this image in savedImages to open modal, or create a temporary one
                      const saved = savedImages.find(s => s.image_url === generatedImage);
                      if (saved) {
                        setModalImage(saved);
                      } else {
                        setModalImage({
                          id: 'current',
                          image_url: generatedImage,
                          garment_count: 1 + (secondGarmentImage ? 1 : 0) + (thirdGarmentImage ? 1 : 0) + (fourthGarmentImage ? 1 : 0) + (fifthGarmentImage ? 1 : 0),
                          product_ids: selectedProductIds,
                          created_at: new Date().toISOString(),
                        });
                      }
                      setLinkingProductIds([]);
                      setLinkSuccess(false);
                    }}
                    title={locale === 'ja' ? 'クリックで詳細' : 'Click for details'}
                  />
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
                  <Sparkles size={48} className="text-[var(--color-accent)]/30 mb-3" />
                  <p className="text-sm text-[var(--color-text-placeholder)]">{locale === 'ja' ? 'モデルを選択' : 'Select model'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Prompt & Generate */}
      <div className="flex items-center gap-2 flex-shrink-0 py-3 border-t border-[var(--color-line)]">
        <div className="flex-1 flex gap-1.5">
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                setSettings(prev => ({ ...prev, customPrompt: e.target.value }));
              }
            }}
            className="text-sm px-2 py-2 border border-[var(--color-line)] rounded-lg bg-white text-[var(--color-text-body)] w-[200px] flex-shrink-0"
          >
            <option value="">{locale === 'ja' ? 'スタイル選択' : 'Select style'}</option>
            <option value="High-end fashion magazine cover editorial. Dramatic cinematic lighting, striking pose, luxury fashion aesthetic with bold composition and high contrast tones.">{locale === 'ja' ? 'ハイファッション誌カバー' : 'Fashion Magazine Cover'}</option>
            <option value="Minimalist Scandinavian e-commerce lookbook. Clean white background, soft diffused natural light, relaxed yet refined pose. Focus on garment silhouette and fabric texture.">{locale === 'ja' ? 'ミニマルECルックブック' : 'Minimal EC Lookbook'}</option>
            <option value="Parisian street style editorial. Golden hour warm sunlight, candid walking pose on European cobblestone street. Effortlessly chic, natural movement with wind-blown fabric.">{locale === 'ja' ? 'パリジャン・ストリートスナップ' : 'Parisian Street Snap'}</option>
            <option value="High fashion studio campaign. Moody dramatic studio lighting with deep shadows and rim light. Strong editorial pose, avant-garde fashion photography with cinematic color grading.">{locale === 'ja' ? 'スタジオ・キャンペーンビジュアル' : 'Studio Campaign Visual'}</option>
            <option value="Lifestyle resort collection lookbook. Bright airy natural light, relaxed resort setting. Warm golden tones, vacation mood with soft bokeh background and effortless styling.">{locale === 'ja' ? 'リゾートライフスタイル' : 'Resort Lifestyle'}</option>
          </select>
          <input
            type="text"
            value={settings.customPrompt}
            onChange={(e) => setSettings(prev => ({ ...prev, customPrompt: e.target.value }))}
            placeholder={locale === 'ja' ? '追加プロンプト（任意）' : 'Additional prompt'}
            className="flex-1 text-sm px-4 py-2 border border-[var(--color-line)] rounded-lg text-[var(--color-text-body)] placeholder:text-[var(--color-text-placeholder)]"
          />
        </div>
        <Button
          variant="primary"
          size="lg"
          isLoading={isGenerating}
          disabled={!selectedGarmentImage}
          leftIcon={<Sparkles size={16} />}
          onClick={handleGenerate}
          className="!px-6"
        >
          {locale === 'ja' ? '生成' : 'Generate'}
        </Button>
      </div>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

      {/* Saved Images */}
      <div className="flex-shrink-0 border-t border-[var(--color-line)] pt-3">
        <button
          onClick={() => setShowSavedImages(!showSavedImages)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-body)] hover:text-[var(--color-accent)] transition-colors"
        >
          <ImageIcon size={16} />
          {locale === 'ja' ? `生成済み (${savedImages.length})` : `Generated (${savedImages.length})`}
          {showSavedImages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <AnimatePresence>
          {showSavedImages && savedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 flex gap-2 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {savedImages.map((img) => (
                <div
                  key={img.id}
                  className="w-24 h-32 rounded-lg overflow-hidden border border-[var(--color-line)] hover:border-[var(--color-accent)] transition-colors relative group cursor-pointer flex-shrink-0"
                  onClick={() => {
                    setModalImage(img);
                    // Default: select all used products
                    const usedIds = allProducts
                      .filter(p => img.product_ids?.includes(p.id))
                      .map(p => p.id);
                    setLinkingProductIds(usedIds);
                    setLinkSuccess(false);
                    setCollectionSuccess(false);
                  }}
                >
                  <img
                    src={img.thumbnail_url || img.image_url}
                    alt="Saved"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.garment_count}{locale === 'ja' ? '点' : 'p'}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {showSavedImages && savedImages.length === 0 && (
          <p className="mt-2 text-sm text-[var(--color-text-placeholder)]">
            {locale === 'ja' ? '保存された画像はありません' : 'No saved images yet'}
          </p>
        )}
      </div>

      {/* Image Detail Modal */}
      <AnimatePresence>
        {modalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setModalImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-line)]">
                <h3 className="text-sm font-bold text-[var(--color-title-active)]">
                  {locale === 'ja' ? '生成画像' : 'Generated Image'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(modalImage.image_url);
                        const blob = await response.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = `gemini-${modalImage.id}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(blobUrl);
                      } catch (err) {
                        console.error('Download failed:', err);
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-element)] transition-colors"
                    title={locale === 'ja' ? 'ダウンロード' : 'Download'}
                  >
                    <Download size={18} className="text-[var(--color-text-body)]" />
                  </button>
                  <button
                    onClick={() => setModalImage(null)}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-bg-element)] transition-colors"
                  >
                    <X size={18} className="text-[var(--color-text-body)]" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5">
                {/* Large Preview */}
                <div className="bg-[var(--color-bg-element)] rounded-xl overflow-hidden flex items-center justify-center mb-4" style={{ maxHeight: '55vh' }}>
                  <img
                    src={modalImage.image_url}
                    alt="Generated"
                    style={{ maxWidth: '100%', maxHeight: '55vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    className="rounded-xl"
                  />
                </div>

                {/* Used Products */}
                {(() => {
                  const usedProducts = allProducts.filter(p =>
                    modalImage.product_ids?.includes(p.id)
                  );
                  if (usedProducts.length === 0) return null;

                  return (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wide mb-2">
                        {locale === 'ja' ? '使用アイテム' : 'Used Items'}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {usedProducts.map((product) => {
                          const primary = product.product_images?.find(img => img.is_primary);
                          const imgUrl = primary?.url || product.product_images?.[0]?.url;
                          const isSelected = linkingProductIds.includes(product.id);
                          const productName = locale === 'ja' ? product.name : (product.name_en || product.name);

                          return (
                            <button
                              key={product.id}
                              onClick={() => {
                                setLinkSuccess(false);
                                setLinkingProductIds(prev =>
                                  prev.includes(product.id)
                                    ? prev.filter(id => id !== product.id)
                                    : [...prev, product.id]
                                );
                              }}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                                  : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/50'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0">
                                {imgUrl ? (
                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--color-text-placeholder)]">?</div>
                                )}
                              </div>
                              <span className="text-xs font-medium text-[var(--color-title-active)] max-w-[120px] truncate">
                                {productName}
                              </span>
                              {isSelected && <Check size={14} className="text-[var(--color-accent)] flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Add to Collection */}
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isAddingToCollection}
                  isLoading={isAddingToCollection}
                  leftIcon={collectionSuccess ? <CheckCircle2 size={14} /> : <Layers size={14} />}
                  onClick={async () => {
                    setIsAddingToCollection(true);
                    try {
                      const res = await fetch('/api/collections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          imageUrl: modalImage.image_url,
                          sourceGeminiResultId: modalImage.id !== 'current' ? modalImage.id : undefined,
                          productIds: linkingProductIds.slice(0, 4),
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setCollectionSuccess(true);
                      }
                    } catch (err) {
                      console.error('Collection add failed:', err);
                    } finally {
                      setIsAddingToCollection(false);
                    }
                  }}
                >
                  {collectionSuccess
                    ? (locale === 'ja' ? 'コレクションに追加済み！' : 'Added to Collection!')
                    : (locale === 'ja'
                      ? `コレクションに${linkingProductIds.length > 0 ? `${linkingProductIds.length}点` : ''}追加`
                      : `Add${linkingProductIds.length > 0 ? ` ${linkingProductIds.length} items` : ''} to Collection`)}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GeminiImageGenerator;
