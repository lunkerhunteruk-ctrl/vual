'use client';

import { motion } from 'framer-motion';
import { Video, Music, Type, Zap, Film, Clock, Maximize, Palette, Save, Trash2, BookmarkCheck, Clapperboard, Upload, Loader2, X } from 'lucide-react';
import { useVideoSettingsStore } from '@/lib/store/video-settings-store';
import { FILM_LOOK_PRESETS, type EffectLevel } from '@/lib/video/film-presets';
import {
  distributeVideoDuration,
  formatDistribution,
  getDurationRange,
} from '@/lib/utils/video-duration';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';

interface BgmTrack {
  id: string;
  name: string;
  url: string;
  file_size: number;
  created_at: string;
}

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
  { id: 'playfair-display' as const, label: 'Playfair Display' },
  { id: 'cormorant-garamond' as const, label: 'Cormorant' },
  { id: 'dm-serif-display' as const, label: 'DM Serif' },
];

const EFFECT_LEVELS: { id: EffectLevel; labelEn: string; labelJa: string }[] = [
  { id: 'off', labelEn: 'Off', labelJa: 'Off' },
  { id: 'weak', labelEn: 'Weak', labelJa: '弱' },
  { id: 'medium', labelEn: 'Med', labelJa: '中' },
  { id: 'strong', labelEn: 'Strong', labelJa: '強' },
];

const filmEffectLabels: { key: keyof import('@/lib/video/film-presets').FilmEffects; labelEn: string; labelJa: string }[] = [
  { key: 'vignette', labelEn: 'Vignette', labelJa: 'ビネット' },
  { key: 'colorChrome', labelEn: 'Color Chrome', labelJa: 'カラークローム' },
  { key: 'colorChromeBlue', labelEn: 'Chrome Blue', labelJa: 'クロームブルー' },
  { key: 'grain', labelEn: 'Grain', labelJa: 'グレイン' },
  { key: 'colorShift', labelEn: 'Color Shift', labelJa: 'カラーシフト' },
];

const introStyleOptions = [
  { id: 'flatlay' as const, labelEn: 'Flatlay', labelJa: 'フラットレイ' },
  { id: 'text-only' as const, labelEn: 'Text Only', labelJa: 'テキストのみ' },
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

  const [presetName, setPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // BGM custom tracks
  const [customBgmTracks, setCustomBgmTracks] = useState<BgmTrack[]>([]);
  const [showBgmUpload, setShowBgmUpload] = useState(false);
  const [bgmUploadName, setBgmUploadName] = useState('');
  const [bgmUploading, setBgmUploading] = useState(false);
  const [bgmStatus, setBgmStatus] = useState('');
  const [bgmDeleting, setBgmDeleting] = useState<string | null>(null);
  const bgmFileRef = useRef<HTMLInputElement>(null);
  const [bgmFile, setBgmFile] = useState<File | null>(null);

  const fetchBgmTracks = useCallback(async () => {
    try {
      const res = await fetch('/api/video/bgm');
      const data = await res.json();
      if (data.tracks) setCustomBgmTracks(data.tracks);
    } catch {}
  }, []);

  useEffect(() => { fetchBgmTracks(); }, [fetchBgmTracks]);

  const handleBgmUpload = async () => {
    if (!bgmFile || !bgmUploadName.trim()) return;
    setBgmUploading(true);
    setBgmStatus('');
    try {
      // Step 1: Get signed upload URL from API (service_role)
      setBgmStatus('準備中...');
      const signRes = await fetch('/api/video/bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign',
          fileName: bgmFile.name,
          contentType: bgmFile.type || 'audio/mpeg',
        }),
      });
      const signData = await signRes.json();
      if (!signData.signedUrl) throw new Error(signData.error || 'Failed to get upload URL');

      // Step 2: Upload directly to Supabase Storage via signed URL
      setBgmStatus('アップロード中...');
      const uploadRes = await fetch(signData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': bgmFile.type || 'audio/mpeg' },
        body: bgmFile,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      // Step 3: Register metadata via API
      setBgmStatus('登録中...');
      const regRes = await fetch('/api/video/bgm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: bgmUploadName.trim(),
          path: signData.path,
          fileSize: bgmFile.size,
        }),
      });
      const regData = await regRes.json();
      if (regData.success && regData.track) {
        setCustomBgmTracks(prev => [regData.track, ...prev]);
        store.setBgmId(regData.track.id);
        setShowBgmUpload(false);
        setBgmUploadName('');
        setBgmFile(null);
        setBgmStatus('');
      } else {
        setBgmStatus('登録失敗');
        console.error('BGM register failed:', regData.error);
      }
    } catch (err) {
      setBgmStatus('アップロード失敗');
      console.error('BGM upload failed:', err);
    } finally {
      setBgmUploading(false);
    }
  };

  const handleBgmDelete = async (trackId: string) => {
    setBgmDeleting(trackId);
    try {
      const res = await fetch(`/api/video/bgm?id=${trackId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCustomBgmTracks(prev => prev.filter(t => t.id !== trackId));
        if (store.bgmId === trackId) store.setBgmId(null);
      }
    } catch {} finally {
      setBgmDeleting(null);
    }
  };

  const isCustomBgm = store.bgmId && !['ambient-01', 'upbeat-01', 'cinematic-01'].includes(store.bgmId);

  const handleSavePreset = () => {
    if (!presetName.trim()) return;
    store.savePreset(presetName.trim());
    setPresetName('');
    setShowSaveInput(false);
  };

  return (
    <div className="space-y-5">
      <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wider">
        {ja ? '動画設定' : 'Video Settings'}
      </h3>

      {/* Presets */}
      <Section icon={<BookmarkCheck size={14} />} title={ja ? 'プリセット' : 'Presets'}>
        <div className="space-y-2">
          {store.presets.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {store.presets.map((p) => (
                <div key={p.id} className="flex items-center gap-0.5">
                  <Chip
                    active={store.activePresetId === p.id}
                    onClick={() => store.loadPreset(p.id)}
                    label={p.name}
                  />
                  <button
                    onClick={() => store.deletePreset(p.id)}
                    className="p-0.5 text-[var(--color-text-placeholder)] hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {showSaveInput ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                placeholder={ja ? 'プリセット名...' : 'Preset name...'}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
                autoFocus
              />
              <button
                onClick={handleSavePreset}
                disabled={!presetName.trim()}
                className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-30"
              >
                {ja ? '保存' : 'Save'}
              </button>
              <button
                onClick={() => { setShowSaveInput(false); setPresetName(''); }}
                className="px-2 py-1.5 rounded-lg border border-[var(--color-line)] text-xs text-[var(--color-text-body)]"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-line)] text-xs text-[var(--color-text-label)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-colors w-full justify-center"
            >
              <Save size={12} />
              {ja ? '現在の設定を保存' : 'Save current settings'}
            </button>
          )}
        </div>
      </Section>

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
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <select
              value={store.bgmId || 'none'}
              onChange={(e) => store.setBgmId(e.target.value === 'none' ? null : e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
            >
              {bgmOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {ja ? opt.labelJa : opt.labelEn}
                </option>
              ))}
              {customBgmTracks.length > 0 && (
                <option disabled>──────</option>
              )}
              {customBgmTracks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {isCustomBgm && (
              <button
                onClick={() => store.bgmId && handleBgmDelete(store.bgmId)}
                disabled={bgmDeleting === store.bgmId}
                className="p-1.5 rounded-lg border border-[var(--color-line)] text-red-500 hover:bg-red-50 transition-colors"
              >
                {bgmDeleting === store.bgmId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            )}
          </div>

          {showBgmUpload ? (
            <div className="space-y-1.5 p-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg-element)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-[var(--color-text-label)]">
                  {ja ? 'BGMアップロード' : 'Upload BGM'}
                </span>
                <button onClick={() => { setShowBgmUpload(false); setBgmFile(null); setBgmUploadName(''); }}>
                  <X size={12} className="text-[var(--color-text-placeholder)]" />
                </button>
              </div>
              <input
                ref={bgmFileRef}
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setBgmFile(f);
                    if (!bgmUploadName) setBgmUploadName(f.name.replace(/\.\w+$/, ''));
                  }
                }}
                className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-[var(--color-accent)]/10 file:text-[var(--color-accent)]"
              />
              <input
                type="text"
                value={bgmUploadName}
                onChange={(e) => setBgmUploadName(e.target.value)}
                placeholder={ja ? 'トラック名...' : 'Track name...'}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
              />
              <button
                onClick={handleBgmUpload}
                disabled={!bgmFile || !bgmUploadName.trim() || bgmUploading}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium disabled:opacity-30 transition-opacity"
              >
                {bgmUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                {bgmUploading ? (bgmStatus || (ja ? 'アップロード中...' : 'Uploading...')) : (ja ? 'アップロード' : 'Upload')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBgmUpload(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--color-line)] text-xs text-[var(--color-text-label)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)] transition-colors w-full justify-center"
            >
              <Upload size={12} />
              {ja ? 'BGMをアップロード' : 'Upload BGM'}
            </button>
          )}
        </div>
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

      {/* Film Look */}
      <Section icon={<Palette size={14} />} title={ja ? 'フィルムルック' : 'Film Look'}>
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {FILM_LOOK_PRESETS.map((p) => (
              <Chip
                key={p.id}
                active={store.filmLookPreset === p.id}
                onClick={() => store.setFilmLookPreset(p.id)}
                label={ja ? p.labelJa : p.labelEn}
              />
            ))}
            <Chip
              active={store.filmLookPreset === 'custom'}
              onClick={() => store.setFilmLookPreset('custom')}
              label={ja ? 'カスタム' : 'Custom'}
            />
          </div>
          {store.filmLookPreset === 'custom' && (
            <>
              <div className="border-t border-[var(--color-line)]" />
              <div className="space-y-2">
                {filmEffectLabels.map((ef) => (
                  <EffectLevelSelector
                    key={ef.key}
                    label={ja ? ef.labelJa : ef.labelEn}
                    value={store.filmEffects[ef.key]}
                    onChange={(v) => store.setFilmEffect(ef.key, v)}
                    ja={ja}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Section>

      {/* Intro */}
      <Section icon={<Clapperboard size={14} />} title={ja ? 'イントロ' : 'Intro'}>
        <div className="space-y-3">
          <Toggle
            label={ja ? 'イントロ表示' : 'Show Intro'}
            checked={store.showIntro}
            onChange={store.setShowIntro}
          />
          {store.showIntro && (
            <>
              <div className="flex gap-1.5">
                {introStyleOptions.map((s) => (
                  <Chip
                    key={s.id}
                    active={store.introStyle === s.id}
                    onClick={() => store.setIntroStyle(s.id)}
                    label={ja ? s.labelJa : s.labelEn}
                  />
                ))}
              </div>
              <input
                type="text"
                value={store.introText}
                onChange={(e) => store.setIntroText(e.target.value)}
                placeholder={ja ? 'イントロテキスト（例: FROM FLATLAY TO RUNWAY）' : 'Intro text (e.g. FROM FLATLAY TO RUNWAY)'}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
              />
              <input
                type="text"
                value={store.dateText}
                onChange={(e) => store.setDateText(e.target.value)}
                placeholder={ja ? '日付（例: 6TH MARCH 2026）' : 'Date (e.g. 6TH MARCH 2026)'}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
              />
              <input
                type="text"
                value={store.locationText}
                onChange={(e) => store.setLocationText(e.target.value)}
                placeholder={ja ? '場所（例: ACROPOLIS ATHENS）' : 'Location (e.g. ACROPOLIS ATHENS)'}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--color-line)] bg-white text-xs text-[var(--color-text-body)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/30"
              />
            </>
          )}
        </div>
      </Section>

      {/* Toggles */}
      <Section icon={<Film size={14} />} title={ja ? 'エフェクト' : 'Effects'}>
        <div className="space-y-2">
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
          <Toggle
            label={ja ? 'Instagram 4:5 レターボックス' : 'Instagram 4:5 Letterbox'}
            checked={store.letterbox}
            onChange={store.setLetterbox}
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

function EffectLevelSelector({
  label,
  value,
  onChange,
  ja,
}: {
  label: string;
  value: EffectLevel;
  onChange: (v: EffectLevel) => void;
  ja: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-text-body)] min-w-[100px]">{label}</span>
      <div className="flex gap-1">
        {EFFECT_LEVELS.map((level) => (
          <button
            key={level.id}
            onClick={() => onChange(level.id)}
            className={`
              px-2 py-1 rounded text-[10px] font-medium transition-all
              ${value === level.id
                ? 'bg-[var(--color-accent)] text-white'
                : 'border border-[var(--color-line)] text-[var(--color-text-label)] hover:border-[var(--color-accent)]/50'
              }
            `}
          >
            {ja ? level.labelJa : level.labelEn}
          </button>
        ))}
      </div>
    </div>
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
