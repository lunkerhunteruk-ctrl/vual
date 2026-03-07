'use client';

import { motion } from 'framer-motion';
import { Video, Music, Type, Zap, Film, Clock, Maximize } from 'lucide-react';
import { useVideoSettingsStore } from '@/lib/store/video-settings-store';
import {
  distributeVideoDuration,
  formatDistribution,
  getDurationRange,
} from '@/lib/utils/video-duration';
import { useMemo } from 'react';

const motionPresets = [
  { id: 'slide' as const, labelEn: 'Slide', labelJa: 'スライド' },
  { id: 'shuffle' as const, labelEn: 'Shuffle', labelJa: 'シャッフル' },
  { id: 'minimal' as const, labelEn: 'Minimal', labelJa: 'ミニマル' },
];

const aspectRatioOptions = [
  { id: '9:16' as const, label: '9:16', descEn: 'Portrait', descJa: '縦型' },
  { id: '16:9' as const, label: '16:9', descEn: 'Landscape', descJa: '横型' },
  { id: '1:1' as const, label: '1:1', descEn: 'Square', descJa: '正方形' },
];

const fontOptions = [
  { id: 'impact' as const, label: 'Impact' },
  { id: 'noto-sans' as const, label: 'Noto Sans' },
  { id: 'montserrat' as const, label: 'Montserrat' },
];

const bgmOptions = [
  { id: 'none', labelEn: 'No BGM', labelJa: 'BGMなし' },
  { id: 'ambient-01', labelEn: 'Ambient Calm', labelJa: 'アンビエント' },
  { id: 'upbeat-01', labelEn: 'Upbeat Fashion', labelJa: 'アップビート' },
  { id: 'cinematic-01', labelEn: 'Cinematic', labelJa: 'シネマティック' },
];

export function VideoSettingsPanel({
  shotCount,
  locale,
}: {
  shotCount: number;
  locale: string;
}) {
  const ja = locale === 'ja';
  const store = useVideoSettingsStore();

  const durationRange = useMemo(() => getDurationRange(shotCount), [shotCount]);
  const distribution = useMemo(
    () => distributeVideoDuration(shotCount, store.totalDurationSec),
    [shotCount, store.totalDurationSec]
  );
  const distributionLabel = useMemo(
    () => formatDistribution(distribution),
    [distribution]
  );

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wider">
        {ja ? '動画設定' : 'Video Settings'}
      </h3>

      {/* Video Model */}
      <Section icon={<Video size={14} />} title={ja ? 'モデル' : 'Model'}>
        <div className="flex gap-1.5">
          <Chip
            active={store.videoModel === 'veo'}
            onClick={() => store.setVideoModel('veo')}
            label="VEO 3.1"
          />
          <Chip
            active={store.videoModel === 'kling'}
            onClick={() => {}}
            label="Kling 3.0"
            disabled
          />
        </div>
      </Section>

      {/* Aspect Ratio */}
      <Section icon={<Maximize size={14} />} title={ja ? 'アスペクト比' : 'Aspect Ratio'}>
        <div className="flex gap-1.5">
          {aspectRatioOptions.map((ar) => (
            <Chip
              key={ar.id}
              active={store.aspectRatio === ar.id}
              onClick={() => store.setAspectRatio(ar.id)}
              label={ar.label}
            />
          ))}
        </div>
      </Section>

      {/* Duration */}
      <Section icon={<Clock size={14} />} title={ja ? '尺' : 'Duration'}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={durationRange.min}
              max={durationRange.max}
              step={2}
              value={store.totalDurationSec}
              onChange={(e) => store.setTotalDuration(Number(e.target.value))}
              className="flex-1 accent-[var(--color-accent)] h-1.5"
            />
            <span className="text-xs font-bold text-[var(--color-title-active)] w-10 text-right">
              {store.totalDurationSec}s
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-text-placeholder)] font-mono leading-tight">
            {distributionLabel}
          </p>
        </div>
      </Section>

      {/* Motion Preset */}
      <Section icon={<Zap size={14} />} title={ja ? 'モーション' : 'Motion'}>
        <div className="flex gap-1.5">
          {motionPresets.map((p) => (
            <Chip
              key={p.id}
              active={store.motionPreset === p.id}
              onClick={() => store.setMotionPreset(p.id)}
              label={ja ? p.labelJa : p.labelEn}
            />
          ))}
        </div>
      </Section>

      {/* BGM */}
      <Section icon={<Music size={14} />} title="BGM">
        <select
          value={store.bgmId || 'none'}
          onChange={(e) => store.setBgmId(e.target.value === 'none' ? null : e.target.value)}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
        >
          {bgmOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {ja ? opt.labelJa : opt.labelEn}
            </option>
          ))}
        </select>
      </Section>

      {/* Font */}
      <Section icon={<Type size={14} />} title={ja ? 'フォント' : 'Font'}>
        <div className="flex gap-1.5">
          {fontOptions.map((f) => (
            <Chip
              key={f.id}
              active={store.textFont === f.id}
              onClick={() => store.setTextFont(f.id)}
              label={f.label}
            />
          ))}
        </div>
      </Section>

      {/* Toggles */}
      <Section icon={<Film size={14} />} title={ja ? 'エフェクト' : 'Effects'}>
        <div className="space-y-2">
          <Toggle
            label={ja ? 'イントロ' : 'Intro'}
            checked={store.showIntro}
            onChange={store.setShowIntro}
          />
          <Toggle
            label={ja ? 'エンディング' : 'Ending'}
            checked={store.showEnding}
            onChange={store.setShowEnding}
          />
          <Toggle
            label={ja ? '白フラッシュ' : 'White Flash'}
            checked={store.whiteFlash}
            onChange={store.setWhiteFlash}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[var(--color-text-label)]">{icon}</span>
        <span className="text-[10px] font-semibold text-[var(--color-text-label)] uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, label, disabled = false }: { active: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-3 py-1.5 rounded-full text-xs font-medium transition-all
        ${disabled
          ? 'opacity-30 cursor-not-allowed border border-[var(--color-line)] text-[var(--color-text-placeholder)]'
          : active
            ? 'bg-[var(--color-accent)] text-white'
            : 'border border-[var(--color-line)] text-[var(--color-text-body)] hover:border-[var(--color-accent)]/50'
        }
      `}
    >
      {label}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-[var(--color-text-body)] group-hover:text-[var(--color-title-active)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-5 rounded-full transition-colors ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-line)]'}`}
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </label>
  );
}
