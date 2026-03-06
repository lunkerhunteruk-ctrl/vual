'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Modal, Button } from '@/components/ui';
import {
  Video,
  Music,
  Play,
  Sparkles,
  Type,
  Zap,
  Film,
  Clock,
} from 'lucide-react';
import {
  distributeVideoDuration,
  formatDistribution,
  getDurationRange,
} from '@/lib/utils/video-duration';

export interface VideoSettings {
  videoModel: 'veo' | 'kling';
  totalDurationSec: number;
  motionPreset: 'slide' | 'shuffle' | 'minimal';
  bgmId: string | null;
  showIntro: boolean;
  showEnding: boolean;
  whiteFlash: boolean;
  textFont: 'impact' | 'noto-sans' | 'montserrat';
}

interface VideoSettingsModalProps {
  storyCount: number;
  onClose: () => void;
  onStartGeneration: (settings: VideoSettings) => void;
  locale: string;
}

const motionPresets = [
  {
    id: 'slide' as const,
    labelEn: 'Slide',
    labelJa: 'スライド',
    descEn: 'Smooth horizontal text animation',
    descJa: '滑らかな横スライドテキスト',
  },
  {
    id: 'shuffle' as const,
    labelEn: 'Shuffle',
    labelJa: 'シャッフル',
    descEn: 'Dynamic text with stagger effects',
    descJa: 'スタガーエフェクト付き',
  },
  {
    id: 'minimal' as const,
    labelEn: 'Minimal',
    labelJa: 'ミニマル',
    descEn: 'Clean fade-in text overlay',
    descJa: 'クリーンなフェードイン',
  },
];

const fontOptions = [
  { id: 'impact' as const, label: 'Impact', preview: 'EDITORIAL' },
  { id: 'noto-sans' as const, label: 'Noto Sans', preview: 'Editorial' },
  { id: 'montserrat' as const, label: 'Montserrat', preview: 'EDITORIAL' },
];

// Placeholder BGM list (will be loaded from DB in Phase 4)
const bgmOptions = [
  { id: 'none', labelEn: 'No BGM', labelJa: 'BGMなし' },
  { id: 'ambient-01', labelEn: 'Ambient Calm', labelJa: 'アンビエント（穏やか）' },
  { id: 'upbeat-01', labelEn: 'Upbeat Fashion', labelJa: 'アップビート（ファッション）' },
  { id: 'cinematic-01', labelEn: 'Cinematic', labelJa: 'シネマティック' },
];

export function VideoSettingsModal({
  storyCount,
  onClose,
  onStartGeneration,
  locale,
}: VideoSettingsModalProps) {
  const [videoModel, setVideoModel] = useState<'veo' | 'kling'>('veo');
  const [totalDuration, setTotalDuration] = useState(26);
  const [motionPreset, setMotionPreset] = useState<'slide' | 'shuffle' | 'minimal'>('slide');
  const [bgmId, setBgmId] = useState<string>('none');
  const [showIntro, setShowIntro] = useState(true);
  const [showEnding, setShowEnding] = useState(true);
  const [whiteFlash, setWhiteFlash] = useState(true);
  const [textFont, setTextFont] = useState<'impact' | 'noto-sans' | 'montserrat'>('impact');

  const durationRange = useMemo(() => getDurationRange(storyCount), [storyCount]);
  const distribution = useMemo(
    () => distributeVideoDuration(storyCount, totalDuration),
    [storyCount, totalDuration]
  );
  const distributionLabel = useMemo(
    () => formatDistribution(distribution),
    [distribution]
  );

  const handleStart = () => {
    onStartGeneration({
      videoModel,
      totalDurationSec: totalDuration,
      motionPreset,
      bgmId: bgmId === 'none' ? null : bgmId,
      showIntro,
      showEnding,
      whiteFlash,
      textFont,
    });
  };

  const ja = locale === 'ja';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={ja ? '動画設定' : 'Video Settings'}
      size="lg"
    >
      <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
        {/* Video Model Toggle */}
        <Section icon={<Video size={16} />} title={ja ? '動画モデル' : 'Video Model'}>
          <div className="flex gap-2">
            <ToggleChip
              active={videoModel === 'veo'}
              onClick={() => setVideoModel('veo')}
              label="VEO 3.1"
            />
            <ToggleChip
              active={videoModel === 'kling'}
              onClick={() => {}}
              label="Kling 3.0"
              disabled
            />
          </div>
        </Section>

        {/* Duration Slider */}
        <Section icon={<Clock size={16} />} title={ja ? '動画尺' : 'Duration'}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={durationRange.min}
                max={durationRange.max}
                step={2}
                value={totalDuration}
                onChange={(e) => setTotalDuration(Number(e.target.value))}
                className="flex-1 accent-[var(--color-accent)]"
              />
              <span className="text-sm font-bold text-[var(--color-title-active)] w-12 text-right">
                {totalDuration}s
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-placeholder)] font-mono">
              {distributionLabel}
            </p>
          </div>
        </Section>

        {/* Motion Preset */}
        <Section icon={<Zap size={16} />} title={ja ? 'モーションプリセット' : 'Motion Preset'}>
          <div className="grid grid-cols-3 gap-2">
            {motionPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setMotionPreset(preset.id)}
                className={`
                  p-3 rounded-xl border-2 transition-all text-left
                  ${motionPreset === preset.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/30'
                  }
                `}
              >
                <p className="text-sm font-semibold text-[var(--color-title-active)]">
                  {ja ? preset.labelJa : preset.labelEn}
                </p>
                <p className="text-xs text-[var(--color-text-placeholder)] mt-0.5">
                  {ja ? preset.descJa : preset.descEn}
                </p>
              </button>
            ))}
          </div>
        </Section>

        {/* BGM Selection */}
        <Section icon={<Music size={16} />} title={ja ? 'BGM' : 'Background Music'}>
          <select
            value={bgmId}
            onChange={(e) => setBgmId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--color-line)] bg-white text-sm text-[var(--color-text-body)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
          >
            {bgmOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {ja ? opt.labelJa : opt.labelEn}
              </option>
            ))}
          </select>
        </Section>

        {/* Text Font */}
        <Section icon={<Type size={16} />} title={ja ? 'テキストフォント' : 'Text Font'}>
          <div className="flex gap-2">
            {fontOptions.map((font) => (
              <button
                key={font.id}
                onClick={() => setTextFont(font.id)}
                className={`
                  flex-1 px-3 py-2 rounded-lg border-2 transition-all text-center
                  ${textFont === font.id
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/30'
                  }
                `}
              >
                <p className="text-xs text-[var(--color-text-placeholder)]">{font.label}</p>
                <p
                  className="text-lg font-bold text-[var(--color-title-active)] mt-0.5"
                  style={{
                    fontFamily:
                      font.id === 'impact'
                        ? 'Impact, sans-serif'
                        : font.id === 'noto-sans'
                          ? '"Noto Sans", sans-serif'
                          : '"Montserrat", sans-serif',
                    fontStyle: font.id === 'impact' ? 'italic' : 'normal',
                  }}
                >
                  {font.preview}
                </p>
              </button>
            ))}
          </div>
        </Section>

        {/* Toggles */}
        <Section icon={<Film size={16} />} title={ja ? 'エフェクト' : 'Effects'}>
          <div className="space-y-3">
            <ToggleRow
              label={ja ? 'イントロ（フラットレイ）' : 'Intro (Flatlay)'}
              checked={showIntro}
              onChange={setShowIntro}
            />
            <ToggleRow
              label={ja ? 'エンディング / クレジット' : 'Ending / Credits'}
              checked={showEnding}
              onChange={setShowEnding}
            />
            <ToggleRow
              label={ja ? '白フラッシュ（カット間）' : 'White Flash (between cuts)'}
              checked={whiteFlash}
              onChange={setWhiteFlash}
            />
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[var(--color-line)]">
        <p className="text-xs text-[var(--color-text-placeholder)]">
          {ja
            ? `${storyCount}ルック × ${totalDuration}秒`
            : `${storyCount} looks × ${totalDuration}s`}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            {ja ? 'キャンセル' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Play size={16} />}
            onClick={handleStart}
          >
            {ja ? '生成開始' : 'Start Generation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Sub-components ---

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--color-accent)]">{icon}</span>
        <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-full text-sm font-medium transition-all
        ${disabled
          ? 'opacity-30 cursor-not-allowed border border-[var(--color-line)] text-[var(--color-text-placeholder)]'
          : active
            ? 'bg-[var(--color-accent)] text-white shadow-sm'
            : 'border border-[var(--color-line)] text-[var(--color-text-body)] hover:border-[var(--color-accent)]'
        }
      `}
    >
      {label}
      {disabled && (
        <span className="ml-1 text-[10px]">Soon</span>
      )}
    </button>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-[var(--color-text-body)] group-hover:text-[var(--color-title-active)] transition-colors">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-10 h-6 rounded-full transition-colors
          ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'}
        `}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 20 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </label>
  );
}
