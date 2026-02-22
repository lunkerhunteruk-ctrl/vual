'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Palette, Save, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui';
import { ThemePresetSelector, type ThemePreset } from '@/components/admin/settings/ThemePresetSelector';

export default function AppearanceSettingsPage() {
  const t = useTranslations('admin.settings');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>('vual');
  const [originalTheme, setOriginalTheme] = useState<ThemePreset>('vual');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current theme from localStorage or default
  useEffect(() => {
    const savedTheme = localStorage.getItem('vual-theme') as ThemePreset | null;
    if (savedTheme && ['vual', 'modern', 'organic', 'street', 'elegant'].includes(savedTheme)) {
      setSelectedTheme(savedTheme);
      setOriginalTheme(savedTheme);
    }
  }, []);

  // Apply theme preview when selection changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
    setHasChanges(selectedTheme !== originalTheme);
  }, [selectedTheme, originalTheme]);

  const handleThemeChange = (theme: ThemePreset) => {
    setSelectedTheme(theme);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('vual-theme', selectedTheme);

      // TODO: Save to Firestore for shop-level persistence
      // await updateDoc(doc(db, 'shops', shopId), { theme: selectedTheme });

      setOriginalTheme(selectedTheme);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedTheme(originalTheme);
    document.documentElement.setAttribute('data-theme', originalTheme);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-title-active)]">
            {t('appearance') || 'Appearance'}
          </h1>
          <p className="text-sm text-[var(--color-text-label)] mt-1">
            {t('appearanceDescription') || 'Customize your shop\'s look and feel'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw size={16} />}
              onClick={handleReset}
            >
              {t('reset') || 'Reset'}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            leftIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (t('saving') || 'Saving...') : (t('saveChanges') || 'Save Changes')}
          </Button>
        </div>
      </div>

      {/* Theme Presets Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[var(--color-bg-element)] rounded-[var(--radius-md)] flex items-center justify-center">
            <Palette size={20} className="text-[var(--color-accent)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
              {t('themePresets') || 'Theme Presets'}
            </h3>
            <p className="text-xs text-[var(--color-text-label)]">
              {t('themePresetsDescription') || 'Choose a preset to instantly change your shop\'s design'}
            </p>
          </div>
        </div>

        <ThemePresetSelector
          selectedTheme={selectedTheme}
          onThemeChange={handleThemeChange}
          isLoading={isSaving}
        />

        {/* Preview note */}
        <div className="mt-6 flex items-center gap-2 text-xs text-[var(--color-text-label)] bg-[var(--color-bg-element)] rounded-[var(--radius-md)] p-3">
          <Eye size={14} />
          <span>{t('previewNote') || 'Changes are previewed in real-time. Click "Save Changes" to apply.'}</span>
        </div>
      </motion.div>

      {/* Current Theme Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] p-6"
      >
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide mb-4">
          {t('currentTheme') || 'Current Theme'}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Primary Color */}
          <div>
            <span className="text-xs text-[var(--color-text-label)] block mb-2">Primary</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-primary)] border border-[var(--color-line)]" />
              <span className="text-sm text-[var(--color-text-body)] font-mono">Primary</span>
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <span className="text-xs text-[var(--color-text-label)] block mb-2">Accent</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-accent)] border border-[var(--color-line)]" />
              <span className="text-sm text-[var(--color-text-body)] font-mono">Accent</span>
            </div>
          </div>

          {/* Background */}
          <div>
            <span className="text-xs text-[var(--color-text-label)] block mb-2">Background</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-bg-element)] border border-[var(--color-line)]" />
              <span className="text-sm text-[var(--color-text-body)] font-mono">Element</span>
            </div>
          </div>

          {/* Border Radius */}
          <div>
            <span className="text-xs text-[var(--color-text-label)] block mb-2">Border Radius</span>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 bg-[var(--color-line)]"
                style={{ borderRadius: 'var(--radius-md)' }}
              />
              <span className="text-sm text-[var(--color-text-body)] font-mono">--radius-md</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
