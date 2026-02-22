'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Check, Palette } from 'lucide-react';

export type ThemePreset = 'vual' | 'modern' | 'organic' | 'street' | 'elegant' | 'neutral';

interface ThemeConfig {
  id: ThemePreset;
  nameKey: string;
  descriptionKey: string;
  colors: {
    primary: string;
    accent: string;
    bg: string;
    text: string;
    line: string;
  };
  radius: string;
  style: string;
}

const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'vual',
    nameKey: 'themeVual',
    descriptionKey: 'themeVualDesc',
    colors: {
      primary: '#A67C5B',
      accent: '#C48B6C',
      bg: '#FBF6F0',
      text: '#000000',
      line: '#D4C4B0',
    },
    radius: '8px',
    style: 'Warm & Elegant',
  },
  {
    id: 'modern',
    nameKey: 'themeModern',
    descriptionKey: 'themeModernDesc',
    colors: {
      primary: '#18181B',
      accent: '#0055FF',
      bg: '#FFFFFF',
      text: '#18181B',
      line: '#E4E4E7',
    },
    radius: '4px',
    style: 'Sharp & Electric',
  },
  {
    id: 'organic',
    nameKey: 'themeOrganic',
    descriptionKey: 'themeOrganicDesc',
    colors: {
      primary: '#2D3A2D',
      accent: '#6B7F5E',
      bg: '#FDFBF7',
      text: '#2D3A2D',
      line: '#D8D4CF',
    },
    radius: '10px',
    style: 'Natural & Calm',
  },
  {
    id: 'street',
    nameKey: 'themeStreet',
    descriptionKey: 'themeStreetDesc',
    colors: {
      primary: '#000000',
      accent: '#ED1C24',
      bg: '#FFFFFF',
      text: '#000000',
      line: '#000000',
    },
    radius: '0px',
    style: 'Bold & Raw',
  },
  {
    id: 'elegant',
    nameKey: 'themeElegant',
    descriptionKey: 'themeElegantDesc',
    colors: {
      primary: '#2C2828',
      accent: '#C9A8A0',
      bg: '#FFFCFA',
      text: '#2C2828',
      line: '#E8E3E0',
    },
    radius: '16px',
    style: 'Soft & Graceful',
  },
  {
    id: 'neutral',
    nameKey: 'themeNeutral',
    descriptionKey: 'themeNeutralDesc',
    colors: {
      primary: '#1A1A1A',
      accent: '#333333',
      bg: '#FAFAFA',
      text: '#1A1A1A',
      line: '#D4D4D4',
    },
    radius: '6px',
    style: 'Monochrome & Versatile',
  },
];

interface ThemePresetSelectorProps {
  selectedTheme: ThemePreset;
  onThemeChange: (theme: ThemePreset) => void;
  isLoading?: boolean;
}

export function ThemePresetSelector({
  selectedTheme,
  onThemeChange,
  isLoading = false,
}: ThemePresetSelectorProps) {
  const t = useTranslations('admin.settings');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {THEME_PRESETS.map((theme) => {
        const isSelected = selectedTheme === theme.id;

        return (
          <motion.button
            key={theme.id}
            onClick={() => onThemeChange(theme.id)}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative text-left p-4 rounded-[var(--radius-lg)] border-2 transition-all ${
              isSelected
                ? 'border-[var(--color-accent)] shadow-md'
                : 'border-[var(--color-line)] hover:border-[var(--color-text-label)]'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-[var(--color-accent)] rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}

            {/* Theme Preview */}
            <div
              className="h-32 rounded-lg mb-3 overflow-hidden border"
              style={{
                backgroundColor: theme.colors.bg,
                borderColor: theme.colors.line,
                borderRadius: theme.radius,
              }}
            >
              {/* Mini preview of the theme */}
              <div className="h-full p-3 flex flex-col">
                {/* Header bar */}
                <div
                  className="h-3 w-16 rounded-full mb-2"
                  style={{ backgroundColor: theme.colors.text }}
                />
                {/* Content preview */}
                <div className="flex-1 flex gap-2">
                  {/* Sidebar */}
                  <div
                    className="w-8 rounded"
                    style={{
                      backgroundColor: theme.colors.line,
                      borderRadius: theme.radius,
                    }}
                  />
                  {/* Main content */}
                  <div className="flex-1 space-y-2">
                    <div
                      className="h-8 rounded"
                      style={{
                        backgroundColor: theme.colors.line,
                        borderRadius: theme.radius,
                      }}
                    />
                    <div className="flex gap-2">
                      <div
                        className="flex-1 h-12 rounded"
                        style={{
                          backgroundColor: theme.colors.line,
                          borderRadius: theme.radius,
                        }}
                      />
                      <div
                        className="w-12 h-12 rounded"
                        style={{
                          backgroundColor: theme.colors.accent,
                          borderRadius: theme.radius,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Theme Info */}
            <div className="space-y-1">
              <h4 className="font-semibold text-[var(--color-title-active)]">
                {t(theme.nameKey) || theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}
              </h4>
              <p className="text-xs text-[var(--color-text-label)]">
                {t(theme.descriptionKey) || theme.style}
              </p>
            </div>

            {/* Color swatches */}
            <div className="flex gap-1.5 mt-3">
              <div
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: theme.colors.primary }}
                title="Primary"
              />
              <div
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: theme.colors.accent }}
                title="Accent"
              />
              <div
                className="w-5 h-5 rounded-full border shadow-sm"
                style={{ backgroundColor: theme.colors.bg, borderColor: theme.colors.line }}
                title="Background"
              />
              <div
                className="w-5 h-5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: theme.colors.line }}
                title="Line"
              />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

export default ThemePresetSelector;
