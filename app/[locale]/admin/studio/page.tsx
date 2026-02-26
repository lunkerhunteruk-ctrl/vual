'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Search, Check, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { GeminiImageGenerator } from '@/components/admin/studio';
import { useStoreContext } from '@/lib/store/store-context';

// SizeSpec type for structured size data
interface SizeSpec {
  columns: string[];
  rows: { size: string; values: Record<string, string> }[];
}

interface Product {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  base_price: number;
  currency: string;
  description?: string;
  size_specs?: SizeSpec;
  product_images?: { id: string; url: string; is_primary: boolean }[];
}

export default function AIStudioPage() {
  const locale = useLocale();
  const store = useStoreContext((s) => s.store);
  const storeId = store?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected products for each slot
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSecondProduct, setSelectedSecondProduct] = useState<Product | null>(null);
  const [selectedThirdProduct, setSelectedThirdProduct] = useState<Product | null>(null);
  const [selectedFourthProduct, setSelectedFourthProduct] = useState<Product | null>(null);

  // Per-slot search queries
  const [search1, setSearch1] = useState('');
  const [search2, setSearch2] = useState('');
  const [search3, setSearch3] = useState('');
  const [search4, setSearch4] = useState('');

  // Additional reference images for each item (4+4+3+3)
  const [selectedFirstImages, setSelectedFirstImages] = useState<string[]>([]);
  const [selectedSecondImages, setSelectedSecondImages] = useState<string[]>([]);
  const [selectedThirdImages, setSelectedThirdImages] = useState<string[]>([]);
  const [selectedFourthImages, setSelectedFourthImages] = useState<string[]>([]);


  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/products?status=all&limit=100');
        const data = await response.json();
        if (data.products) setProducts(data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Helpers
  const getProductName = (product: Product) =>
    locale === 'ja' ? product.name : (product.name_en || product.name);

  const getProductImage = (product: Product | null) => {
    if (!product?.product_images?.length) return null;
    const primary = product.product_images.find(img => img.is_primary);
    return primary?.url || product.product_images[0]?.url;
  };

  const getCategoryLabel = (category: string): string => {
    if (!category) return '-';
    if (category.includes('bags')) return locale === 'ja' ? 'バッグ' : 'Bags';
    if (category.includes('shoes')) return locale === 'ja' ? 'シューズ' : 'Shoes';
    if (category.includes('tops') || category.includes('blouse') || category.includes('shirt'))
      return locale === 'ja' ? 'トップス' : 'Tops';
    if (category.includes('pants')) return locale === 'ja' ? 'パンツ' : 'Pants';
    if (category.includes('skirt')) return locale === 'ja' ? 'スカート' : 'Skirts';
    if (category.includes('dress')) return locale === 'ja' ? 'ワンピース' : 'Dresses';
    if (category.includes('outer') || category.includes('jacket') || category.includes('coat'))
      return locale === 'ja' ? 'アウター' : 'Outerwear';
    if (category.includes('accessor')) return locale === 'ja' ? 'アクセサリー' : 'Accessories';
    // Fallback: last segment of slug
    return category.split('-').pop() || category;
  };

  // Get category group key for sorting
  const getCategoryGroup = (category: string): string => {
    if (!category) return 'other';
    if (category.includes('tops') || category.includes('blouse') || category.includes('shirt')) return 'tops';
    if (category.includes('outer') || category.includes('jacket') || category.includes('coat')) return 'outer';
    if (category.includes('dress')) return 'dress';
    if (category.includes('setup') || category.includes('set-up') || category.includes('suit')) return 'setup';
    if (category.includes('pants')) return 'pants';
    if (category.includes('skirt')) return 'skirt';
    if (category.includes('shoes') || category.includes('boot') || category.includes('sandal')) return 'shoes';
    if (category.includes('bags') || category.includes('bag')) return 'bags';
    if (category.includes('hat') || category.includes('cap') || category.includes('beanie')) return 'hat';
    if (category.includes('stole') || category.includes('scarf') || category.includes('muffler')) return 'stole';
    return 'other';
  };

  // Default sort priority per slot
  const slotPriorities: Record<number, string[]> = {
    1: ['tops', 'outer', 'dress', 'setup'],
    2: ['pants', 'skirt', 'dress', 'outer'],
    3: ['shoes', 'bags', 'hat', 'stole'],
    4: ['bags', 'shoes', 'hat', 'stole'],
  };

  // Filter and sort products for a slot
  const filterProducts = (query: string, excludeIds: string[], slotNum: number) => {
    const filtered = products.filter(p => {
      if (excludeIds.includes(p.id)) return false;
      if (!query) return true;
      const name = getProductName(p);
      const category = p.category || '';
      const catLabel = getCategoryLabel(category);
      const q = query.toLowerCase();
      return name.toLowerCase().includes(q) ||
        category.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q);
    });

    const priority = slotPriorities[slotNum] || [];
    return filtered.sort((a, b) => {
      const groupA = getCategoryGroup(a.category || '');
      const groupB = getCategoryGroup(b.category || '');
      const idxA = priority.indexOf(groupA);
      const idxB = priority.indexOf(groupB);
      // Priority items first, then others at the end
      const rankA = idxA >= 0 ? idxA : priority.length;
      const rankB = idxB >= 0 ? idxB : priority.length;
      return rankA - rankB;
    });
  };

  const toggleImageSelection = (
    imageUrl: string,
    selectedImages: string[],
    setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>,
    maxImages: number = 4
  ) => {
    if (selectedImages.includes(imageUrl)) {
      setSelectedImages(selectedImages.filter(url => url !== imageUrl));
    } else if (selectedImages.length < maxImages) {
      setSelectedImages([...selectedImages, imageUrl]);
    }
  };

  // Toggle product selection (click again to deselect)
  const handleToggleProduct = (
    product: Product,
    current: Product | null,
    setProduct: React.Dispatch<React.SetStateAction<Product | null>>,
    setImages: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (current?.id === product.id) {
      setProduct(null);
      setImages([]);
    } else {
      setProduct(product);
      const img = getProductImage(product);
      setImages(img ? [img] : []);
    }
  };

  // Exclude already-selected products from other slots
  const exclude1: string[] = [];
  const exclude2 = selectedProduct ? [selectedProduct.id] : [];
  const exclude3 = [selectedProduct?.id, selectedSecondProduct?.id].filter(Boolean) as string[];
  const exclude4 = [selectedProduct?.id, selectedSecondProduct?.id, selectedThirdProduct?.id].filter(Boolean) as string[];

  // Reusable item selector column
  const renderItemColumn = (config: {
    num: number;
    label: string;
    search: string;
    setSearch: (v: string) => void;
    excludeIds: string[];
    selected: Product | null;
    setSelected: React.Dispatch<React.SetStateAction<Product | null>>;
    images: string[];
    setImages: React.Dispatch<React.SetStateAction<string[]>>;
    maxImages: number;
    disabled?: boolean;
  }) => {
    const { num, label, search, setSearch, excludeIds, selected, setSelected, images, setImages, maxImages, disabled } = config;
    const list = filterProducts(search, excludeIds, num);

    return (
      <div className={`bg-white border border-[var(--color-line)] rounded-xl p-2.5 flex flex-col h-[240px] ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-2 flex-shrink-0 min-w-0">
          <span className="w-5 h-5 rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {num}
          </span>
          <span className="text-xs font-bold text-[var(--color-title-active)] uppercase tracking-wide flex-shrink-0">
            {label}
          </span>
          {selected && (
            <span className="ml-auto text-[10px] font-medium text-[var(--color-accent)] truncate">
              {getProductName(selected)}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-2 flex-shrink-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-placeholder)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ja' ? '名前・カテゴリで検索...' : 'Search name/category...'}
            className="w-full h-8 pl-8 pr-3 text-xs bg-[var(--color-bg-element)] border border-[var(--color-line)] rounded-lg focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>

        {/* Product list */}
        <div className="flex-1 space-y-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-[var(--color-text-label)]" />
            </div>
          ) : list.length === 0 ? (
            <p className="text-xs text-[var(--color-text-placeholder)] text-center py-6">
              {locale === 'ja' ? '該当なし' : 'No matches'}
            </p>
          ) : (
            list.map((product) => {
              const imageUrl = getProductImage(product);
              const isSelected = selected?.id === product.id;
              return (
                <div key={product.id}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleToggleProduct(product, selected, setSelected, setImages)}
                    className={`w-full p-1.5 rounded-lg text-left transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]'
                        : 'bg-[var(--color-bg-element)] border border-transparent hover:border-[var(--color-line)]'
                    }`}
                  >
                    <div className="w-9 h-9 bg-[var(--color-bg-element)] rounded-md flex-shrink-0 overflow-hidden">
                      {imageUrl ? (
                        <Image src={imageUrl} alt="" width={36} height={36} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[var(--color-bg-element)] to-[var(--color-bg-input)] flex items-center justify-center text-[10px] text-[var(--color-text-placeholder)]">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-title-active)] truncate">{getProductName(product)}</p>
                      <p className="text-[10px] text-[var(--color-text-label)]">{getCategoryLabel(product.category)}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-[var(--color-accent)] flex-shrink-0" />}
                  </motion.button>

                  {/* Image selection thumbnails */}
                  {isSelected && product.product_images && product.product_images.length > 1 && (
                    <div className="mt-1 flex gap-1 flex-wrap pl-1">
                      {product.product_images.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => toggleImageSelection(img.url, images, setImages, maxImages)}
                          className={`w-7 h-7 rounded overflow-hidden border-2 transition-all ${
                            images.includes(img.url)
                              ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
                              : 'border-transparent opacity-50 hover:opacity-100'
                          }`}
                        >
                          <Image src={img.url} alt="" width={28} height={28} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      <span className="text-[10px] text-[var(--color-text-placeholder)] self-center ml-0.5">
                        {images.length}/{maxImages}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-2 flex-shrink-0">
        <h1 className="text-xl font-bold text-[var(--color-title-active)]">VUAL Studio</h1>
      </div>

      {/* Item Selection Grid - 4 columns */}
      <div className="flex-shrink-0 grid grid-cols-4 gap-2 mb-2">
        {renderItemColumn({
          num: 1,
          label: locale === 'ja' ? 'アイテム1' : 'Item 1',
          search: search1,
          setSearch: setSearch1,
          excludeIds: exclude1,
          selected: selectedProduct,
          setSelected: setSelectedProduct,
          images: selectedFirstImages,
          setImages: setSelectedFirstImages,
          maxImages: 4,
        })}
        {renderItemColumn({
          num: 2,
          label: locale === 'ja' ? 'アイテム2' : 'Item 2',
          search: search2,
          setSearch: setSearch2,
          excludeIds: exclude2,
          selected: selectedSecondProduct,
          setSelected: setSelectedSecondProduct,
          images: selectedSecondImages,
          setImages: setSelectedSecondImages,
          maxImages: 4,
        })}
        {renderItemColumn({
          num: 3,
          label: locale === 'ja' ? 'アイテム3' : 'Item 3',
          search: search3,
          setSearch: setSearch3,
          excludeIds: exclude3,
          selected: selectedThirdProduct,
          setSelected: setSelectedThirdProduct,
          images: selectedThirdImages,
          setImages: setSelectedThirdImages,
          maxImages: 3,
        })}
        {renderItemColumn({
          num: 4,
          label: locale === 'ja' ? 'アイテム4' : 'Item 4',
          search: search4,
          setSearch: setSearch4,
          excludeIds: exclude4,
          selected: selectedFourthProduct,
          setSelected: setSelectedFourthProduct,
          images: selectedFourthImages,
          setImages: setSelectedFourthImages,
          maxImages: 3,
        })}
      </div>

      {/* Generator - fills remaining space */}
      <div className="flex-1 min-h-0">
        <div className="bg-white border border-[var(--color-line)] rounded-2xl p-4 h-full">
          <GeminiImageGenerator
            selectedGarmentImage={getProductImage(selectedProduct) || undefined}
            selectedGarmentImages={selectedFirstImages}
            selectedGarmentName={selectedProduct ? getProductName(selectedProduct) : undefined}
            selectedGarmentDescription={selectedProduct?.description}
            selectedGarmentCategory={selectedProduct?.category}
            selectedGarmentSizeSpecs={selectedProduct?.size_specs}
            secondGarmentImage={selectedSecondProduct ? getProductImage(selectedSecondProduct) || undefined : undefined}
            secondGarmentImages={selectedSecondProduct ? selectedSecondImages : []}
            secondGarmentName={selectedSecondProduct ? getProductName(selectedSecondProduct) : undefined}
            thirdGarmentImage={selectedThirdProduct ? getProductImage(selectedThirdProduct) || undefined : undefined}
            thirdGarmentImages={selectedThirdProduct ? selectedThirdImages : []}
            thirdGarmentName={selectedThirdProduct ? getProductName(selectedThirdProduct) : undefined}
            fourthGarmentImage={selectedFourthProduct ? getProductImage(selectedFourthProduct) || undefined : undefined}
            fourthGarmentImages={selectedFourthProduct ? selectedFourthImages : []}
            fourthGarmentName={selectedFourthProduct ? getProductName(selectedFourthProduct) : undefined}
            selectedProductIds={[selectedProduct, selectedSecondProduct, selectedThirdProduct, selectedFourthProduct].filter(Boolean).map(p => p!.id)}
            allProducts={products}
            storeId={storeId}
          />
        </div>
      </div>
    </div>
  );
}
