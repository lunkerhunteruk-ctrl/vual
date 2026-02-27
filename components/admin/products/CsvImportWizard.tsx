'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { type ParseResult } from '@/lib/csv/csv-parser';
import { type PlatformType, type VualField, detectPlatform, getDefaultFieldMap } from '@/lib/csv/platform-detect';
import { transformCSVToProducts, type TransformResult } from '@/lib/csv/csv-transformer';
import { CsvUploadStep } from './CsvUploadStep';
import { CsvMappingStep } from './CsvMappingStep';
import { CsvPreviewStep } from './CsvPreviewStep';
import { CsvImportStep } from './CsvImportStep';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'import';

const STEPS: WizardStep[] = ['upload', 'mapping', 'preview', 'import'];

interface CsvImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  defaultCategory?: string;
  defaultCurrency?: string;
}

export function CsvImportWizard({
  isOpen,
  onClose,
  onComplete,
  defaultCategory = '',
  defaultCurrency = 'JPY',
}: CsvImportWizardProps) {
  const t = useTranslations('admin.products.csvImport');

  // State
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [platform, setPlatform] = useState<PlatformType>('unknown');
  const [fieldMap, setFieldMap] = useState<Record<string, VualField>>({});
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});

  const stepIndex = STEPS.indexOf(currentStep);

  // Step labels
  const stepLabels: Record<WizardStep, string> = {
    upload: t('uploadStep'),
    mapping: t('mappingStep'),
    preview: t('previewStep'),
    import: t('importStep'),
  };

  // Handle CSV parsed
  const handleParsed = useCallback((result: ParseResult) => {
    setParseResult(result);
    const detected = detectPlatform(result.headers);
    setPlatform(detected);
    const defaultMap = getDefaultFieldMap(detected, result.headers);
    setFieldMap(defaultMap);
  }, []);

  // Handle transform (when going from mapping → preview)
  const handleTransform = useCallback(() => {
    if (!parseResult) return;

    const result = transformCSVToProducts(
      parseResult.rows,
      fieldMap,
      platform,
      { defaultCategory, defaultCurrency },
    );
    setTransformResult(result);
  }, [parseResult, fieldMap, platform, defaultCategory, defaultCurrency]);

  // Resolve brands before import
  const resolveBrands = useCallback(async () => {
    if (!transformResult) return;

    // Collect unique brand names
    const brandNames = new Set<string>();
    for (const product of transformResult.products) {
      if (product.brandName) brandNames.add(product.brandName);
    }

    if (brandNames.size === 0) return;

    // Fetch existing brands
    try {
      const response = await fetch('/api/brands');
      if (!response.ok) return;
      const data = await response.json();
      const existingBrands: { id: string; name: string; name_en: string | null }[] = data.brands || [];

      const newBrandMap: Record<string, string> = {};

      for (const brandName of brandNames) {
        // Try to match by name or name_en
        const existing = existingBrands.find(
          b => b.name === brandName || b.name_en === brandName
        );

        if (existing) {
          newBrandMap[brandName] = existing.id;
        } else {
          // Auto-create brand
          try {
            const createRes = await fetch('/api/brands', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: brandName }),
            });
            if (createRes.ok) {
              const created = await createRes.json();
              newBrandMap[brandName] = created.brand.id;
            }
          } catch {
            // Skip brand if creation fails
          }
        }
      }

      setBrandMap(newBrandMap);
    } catch {
      // If brand fetch fails, proceed without brand mapping
    }
  }, [transformResult]);

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 'upload': return parseResult !== null;
      case 'mapping': {
        const mappedFields = Object.values(fieldMap);
        return mappedFields.includes('name') && mappedFields.includes('price');
      }
      case 'preview': return transformResult !== null && transformResult.products.length > 0;
      case 'import': return false;
    }
  }, [currentStep, parseResult, fieldMap, transformResult]);

  const goNext = useCallback(async () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx >= STEPS.length) return;

    const nextStep = STEPS[nextIdx];

    // Run transform when entering preview
    if (nextStep === 'preview') {
      handleTransform();
    }

    // Resolve brands when entering import
    if (nextStep === 'import') {
      await resolveBrands();
    }

    setCurrentStep(nextStep);
  }, [stepIndex, handleTransform, resolveBrands]);

  const goBack = useCallback(() => {
    const prevIdx = stepIndex - 1;
    if (prevIdx < 0) return;
    setCurrentStep(STEPS[prevIdx]);
  }, [stepIndex]);

  // Reset on close
  const handleClose = useCallback(() => {
    setCurrentStep('upload');
    setParseResult(null);
    setPlatform('unknown');
    setFieldMap({});
    setTransformResult(null);
    setBrandMap({});
    onClose();
  }, [onClose]);

  const handleComplete = useCallback(() => {
    handleClose();
    onComplete();
  }, [handleClose, onComplete]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('title')} size="xl">
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center gap-2">
          {STEPS.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`
                  flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
                  ${idx === stepIndex
                    ? 'bg-[var(--color-accent)] text-white'
                    : idx < stepIndex
                    ? 'bg-green-100 text-green-700'
                    : 'bg-[var(--color-bg-element)] text-[var(--color-text-label)]'
                  }
                `}
              >
                {idx + 1}
              </div>
              <span className={`text-xs ${
                idx === stepIndex ? 'text-[var(--color-title-active)] font-medium' : 'text-[var(--color-text-label)]'
              }`}>
                {stepLabels[step]}
              </span>
              {idx < STEPS.length - 1 && (
                <div className="w-8 h-px bg-[var(--color-line)]" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStep === 'upload' && (
            <CsvUploadStep onParsed={handleParsed} />
          )}
          {currentStep === 'mapping' && parseResult && (
            <CsvMappingStep
              headers={parseResult.headers}
              platform={platform}
              fieldMap={fieldMap}
              onFieldMapChange={setFieldMap}
            />
          )}
          {currentStep === 'preview' && transformResult && (
            <CsvPreviewStep result={transformResult} />
          )}
          {currentStep === 'import' && transformResult && (
            <CsvImportStep
              products={transformResult.products}
              brandMap={brandMap}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'import' && (
          <div className="flex items-center justify-between pt-4 border-t border-[var(--color-line)]">
            <div>
              {stepIndex > 0 && (
                <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={goBack}>
                  {t('back')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={handleClose}>
                {t('close')}
              </Button>
              {canGoNext && (
                <Button variant="primary" rightIcon={<ArrowRight size={16} />} onClick={goNext}>
                  {t('next')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
