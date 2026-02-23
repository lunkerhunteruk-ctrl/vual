'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Zap, Sparkles, Shirt, Search, Check, Plus } from 'lucide-react';
import { VTONGenerator, GeminiImageGenerator } from '@/components/admin/studio';

// SizeSpec type for structured size data
interface SizeSpec {
  columns: string[];
  rows: { size: string; values: Record<string, string> }[];
}

const mockProducts = [
  {
    id: '1',
    name: 'Oversized Blazer',
    nameJa: 'オーバーサイズブレザー',
    category: 'Outer',
    image: '',
    description: 'サイズM: 身幅55cm、着丈72cm、袖丈60cm',
    sizeSpecs: {
      columns: ['身幅', '肩幅', '着丈', '袖丈'],
      rows: [
        { size: 'S', values: { '身幅': '53', '肩幅': '44', '着丈': '70', '袖丈': '58' } },
        { size: 'M', values: { '身幅': '55', '肩幅': '46', '着丈': '72', '袖丈': '60' } },
        { size: 'L', values: { '身幅': '57', '肩幅': '48', '着丈': '74', '袖丈': '62' } },
      ]
    }
  },
  {
    id: '2',
    name: 'Silk Blouse',
    nameJa: 'シルクブラウス',
    category: 'Tops',
    image: '',
    description: 'サイズM: 身幅50cm、着丈65cm、袖丈58cm',
    sizeSpecs: {
      columns: ['身幅', '肩幅', '着丈', '袖丈'],
      rows: [
        { size: 'S', values: { '身幅': '48', '肩幅': '36', '着丈': '63', '袖丈': '56' } },
        { size: 'M', values: { '身幅': '50', '肩幅': '38', '着丈': '65', '袖丈': '58' } },
        { size: 'L', values: { '身幅': '52', '肩幅': '40', '着丈': '67', '袖丈': '60' } },
      ]
    }
  },
  {
    id: '3',
    name: 'Cotton T-Shirt',
    nameJa: 'コットンTシャツ',
    category: 'Tops',
    image: '',
    description: 'サイズM: 身幅52cm、着丈68cm',
    sizeSpecs: {
      columns: ['身幅', '着丈'],
      rows: [
        { size: 'M', values: { '身幅': '52', '着丈': '68' } },
        { size: 'L', values: { '身幅': '54', '着丈': '70' } },
      ]
    }
  },
  {
    id: '4',
    name: 'Denim Jeans',
    nameJa: 'デニムジーンズ',
    category: 'Bottoms',
    image: '',
    description: 'サイズM: ウエスト76cm、股下72cm',
    sizeSpecs: {
      columns: ['ウエスト', 'ヒップ', '股下', 'わたり'],
      rows: [
        { size: '28', values: { 'ウエスト': '72', 'ヒップ': '92', '股下': '70', 'わたり': '28' } },
        { size: '30', values: { 'ウエスト': '76', 'ヒップ': '96', '股下': '72', 'わたり': '29' } },
        { size: '32', values: { 'ウエスト': '80', 'ヒップ': '100', '股下': '74', 'わたり': '30' } },
      ]
    }
  },
  {
    id: '5',
    name: 'Pleated Skirt',
    nameJa: 'プリーツスカート',
    category: 'Bottoms',
    image: '',
    description: 'サイズM: ウエスト66cm、スカート丈65cm',
    sizeSpecs: {
      columns: ['ウエスト', 'スカート丈'],
      rows: [
        { size: 'S', values: { 'ウエスト': '64', 'スカート丈': '63' } },
        { size: 'M', values: { 'ウエスト': '66', 'スカート丈': '65' } },
        { size: 'L', values: { 'ウエスト': '68', 'スカート丈': '67' } },
      ]
    }
  },
  {
    id: '6',
    name: 'Wool Cardigan',
    nameJa: 'ウールカーディガン',
    category: 'Tops',
    image: '',
    description: 'サイズM: 身幅54cm、着丈62cm、袖丈56cm',
    sizeSpecs: {
      columns: ['身幅', '着丈', '袖丈'],
      rows: [
        { size: 'M', values: { '身幅': '54', '着丈': '62', '袖丈': '56' } },
        { size: 'L', values: { '身幅': '56', '着丈': '64', '袖丈': '58' } },
      ]
    }
  },
];

type TabType = 'vton' | 'gemini';

export default function AIStudioPage() {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabType>('vton');
  const [selectedProduct, setSelectedProduct] = useState<typeof mockProducts[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Second item selection
  const [enableSecondItem, setEnableSecondItem] = useState(false);
  const [selectedSecondProduct, setSelectedSecondProduct] = useState<typeof mockProducts[0] | null>(null);

  const filteredProducts = mockProducts.filter(p => {
    const name = locale === 'ja' ? p.nameJa : p.name;
    return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter second item options based on first selection
  const secondItemOptions = mockProducts.filter(p => {
    if (!selectedProduct) return false;
    if (selectedProduct.category === 'Tops' || selectedProduct.category === 'Outer') {
      return p.category === 'Bottoms';
    }
    return p.category === 'Tops' || p.category === 'Outer';
  });

  const getProductName = (product: typeof mockProducts[0]) =>
    locale === 'ja' ? product.nameJa : product.name;

  return (
    <div className="h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-title-active)]">AI Studio</h1>
          <p className="text-sm text-[var(--color-text-label)] mt-0.5">
            {locale === 'ja' ? 'AIでモデル着用画像を生成' : 'Generate model images with AI'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('vton')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'vton'
                ? 'bg-green-600 text-white shadow-lg shadow-green-200'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-green-400'
            }`}
          >
            <Zap size={18} />
            VTON
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'vton' ? 'bg-green-500' : 'bg-gray-100'}`}>
              ¥3
            </span>
          </button>
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'gemini'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-400'
            }`}
          >
            <Sparkles size={18} />
            Gemini
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'gemini' ? 'bg-purple-500' : 'bg-gray-100'}`}>
              ¥6
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 h-[calc(100%-4rem)]">
        {/* Left: Product Selection */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-4">
          {/* First Product */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 flex-1 flex flex-col">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shirt size={16} />
              {locale === 'ja' ? '1点目を選択' : 'Select 1st Item'}
            </h3>

            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ja' ? '検索...' : 'Search...'}
                className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedProduct(product)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 ${
                    selectedProduct?.id === product.id
                      ? activeTab === 'vton'
                        ? 'bg-green-50 border-2 border-green-500'
                        : 'bg-purple-50 border-2 border-purple-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="w-11 h-11 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{getProductName(product)}</p>
                    <p className="text-xs text-gray-500">{product.category}</p>
                  </div>
                  {selectedProduct?.id === product.id && (
                    <Check size={16} className={activeTab === 'vton' ? 'text-green-600' : 'text-purple-600'} />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Second Item Toggle & Selection */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <button
              onClick={() => {
                setEnableSecondItem(!enableSecondItem);
                if (enableSecondItem) setSelectedSecondProduct(null);
              }}
              className="w-full flex items-center justify-between"
            >
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                <Plus size={16} />
                {locale === 'ja' ? '2点目を追加' : 'Add 2nd Item'}
              </h3>
              <div
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  enableSecondItem
                    ? activeTab === 'vton' ? 'bg-green-500' : 'bg-purple-500'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow ${
                    enableSecondItem ? 'left-6' : 'left-1'
                  }`}
                />
              </div>
            </button>

            {enableSecondItem && (
              <div className="space-y-2 max-h-48 overflow-y-auto mt-4">
                {secondItemOptions.length > 0 ? (
                  secondItemOptions.map((product) => (
                    <motion.button
                      key={product.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSecondProduct(product)}
                      className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 ${
                        selectedSecondProduct?.id === product.id
                          ? activeTab === 'vton'
                            ? 'bg-green-50 border-2 border-green-500'
                            : 'bg-purple-50 border-2 border-purple-500'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{getProductName(product)}</p>
                        <p className="text-xs text-gray-500">{product.category}</p>
                      </div>
                      {selectedSecondProduct?.id === product.id && (
                        <Check size={14} className={activeTab === 'vton' ? 'text-green-600' : 'text-purple-600'} />
                      )}
                    </motion.button>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {locale === 'ja' ? '1点目を選択してください' : 'Select 1st item first'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Generator */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'vton' ? (
                <VTONGenerator
                  selectedGarmentImage={selectedProduct?.image || undefined}
                  selectedGarmentName={selectedProduct ? getProductName(selectedProduct) : undefined}
                  selectedGarmentCategory={selectedProduct?.category}
                  secondGarmentImage={enableSecondItem ? selectedSecondProduct?.image : undefined}
                  secondGarmentName={enableSecondItem && selectedSecondProduct ? getProductName(selectedSecondProduct) : undefined}
                />
              ) : (
                <GeminiImageGenerator
                  selectedGarmentImage={selectedProduct?.image || undefined}
                  selectedGarmentName={selectedProduct ? getProductName(selectedProduct) : undefined}
                  selectedGarmentDescription={selectedProduct?.description}
                  selectedGarmentCategory={selectedProduct?.category}
                  selectedGarmentSizeSpecs={selectedProduct?.sizeSpecs}
                  secondGarmentImage={enableSecondItem ? selectedSecondProduct?.image : undefined}
                  secondGarmentName={enableSecondItem && selectedSecondProduct ? getProductName(selectedSecondProduct) : undefined}
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
