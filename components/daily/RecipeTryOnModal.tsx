'use client';

import { useState, useRef } from 'react';
import { LookRecipe } from '@/lib/daily/types';
import { useVaultStore } from '@/lib/daily/store';
import { signInWithGoogle } from '@/lib/daily/auth';

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

const FILM_OPTIONS = [
  { value: '', label: 'AI AUTO' },
  { value: 'leicaPortra800', label: 'Leica Portra 800' },
  { value: 'leica', label: 'Leica Portra 400' },
  { value: 'contax', label: 'Contax T3' },
  { value: 'pentax', label: 'Pentax 67' },
  { value: 'nikon', label: 'Nikon Tri-X (B&W)' },
  { value: 'nikon800', label: 'Nikon Cinestill 800T' },
  { value: 'superia', label: 'Nikon Superia 800' },
];

const AR_OPTIONS = ['3:4', '9:16', '1:1', '4:3'] as const;

const ETHNICITIES = [
  { value: 'japanese', label: 'アジア系' },
  { value: 'eastern-european', label: '東欧系' },
  { value: 'western-european', label: '西欧系' },
  { value: 'african', label: 'アフリカ系' },
  { value: 'latin', label: 'ラテン系' },
  { value: 'southeast-asian', label: '東南アジア系' },
];

interface Props {
  lookImageUrl: string;
  recipe: LookRecipe;
  onClose: () => void;
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function RecipeTryOnModal({ lookImageUrl, recipe, onClose }: Props) {
  const [tryMode, setTryMode] = useState<'match' | 'customize'>('match');
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [height, setHeight] = useState(recipe.height || 170);
  const [ethnicity, setEthnicity] = useState(recipe.ethnicity || 'japanese');

  const [location, setLocation] = useState(recipe.location || '');
  const [situation, setSituation] = useState(recipe.situation || '');
  const [filmMode, setFilmMode] = useState(recipe.filmMode || '');
  const [aspectRatio, setAspectRatio] = useState<string>(recipe.aspectRatio || '3:4');

  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const user = useVaultStore((s) => s.user);
  const setUser = useVaultStore((s) => s.setUser);
  const canGenerate = useVaultStore((s) => s.canGenerate);
  const incrementGeneration = useVaultStore((s) => s.incrementGeneration);

  const pickFace = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setFaceImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleGenerate = async () => {
    if (!recipe.garmentUrls?.length) {
      setError('ガーメント情報が見つかりません');
      return;
    }
    if (!canGenerate()) {
      setError('クレジットが不足しています');
      return;
    }

    setGenerating(true);
    setError(null);
    setResultImage(null);

    const sceneSettings = tryMode === 'match'
      ? { location: recipe.location, situation: recipe.situation, filmMode: recipe.filmMode }
      : { location, situation, filmMode };

    const ar = tryMode === 'match' ? recipe.aspectRatio : aspectRatio;

    try {
      const garmentImages = await Promise.all(recipe.garmentUrls.map(urlToBase64));

      const submitRes = await fetch('/api/my/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          garmentImages,
          faceImage,
          background: tryMode === 'match' ? (recipe.background || '') : '',
          modelSettings: { gender: recipe.gender || 'female', height, ethnicity },
          sceneSettings,
          aspectRatio: ar,
          firebaseUid: user?.id ?? null,
          variant: recipe.variant || 'A',
        }),
      });

      const submit = await submitRes.json();
      if (!submitRes.ok || !submit.taskId) {
        setError(submit.error || '生成失敗');
        setGenerating(false);
        return;
      }

      const { taskId, creditId } = submit;

      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const params = new URLSearchParams({ taskId });
        if (creditId) params.set('creditId', creditId);
        if (user?.id) params.set('firebaseUid', user.id);

        const pollRes = await fetch(`/api/my/generate/poll?${params}`);
        const poll = await pollRes.json();

        if (poll.status === 'completed' && poll.image) {
          setResultImage(poll.image);
          incrementGeneration();
          setGenerating(false);
          return;
        }
        if (poll.status === 'failed') {
          setError(poll.error || '生成失敗');
          setGenerating(false);
          return;
        }
      }

      setError('タイムアウト');
      setGenerating(false);
    } catch (e) {
      setError(String(e));
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!resultImage || !user?.id || saved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/my/save-look', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: resultImage,
          firebaseUid: user.id,
          variant: recipe.variant || 'A',
          recipe,
        }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    const filename = `tryon-${Date.now()}.jpg`;
    try {
      const res = await fetch(resultImage);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {}
    const a = document.createElement('a');
    a.href = resultImage;
    a.download = filename;
    a.click();
  };

  const activeAr = tryMode === 'match' ? (recipe.aspectRatio || '3:4') : aspectRatio;
  const arStyle = activeAr.replace(':', '/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full sm:max-w-sm mx-auto flex flex-col overflow-y-auto"
        style={{
          background: 'var(--vault-bg)',
          maxHeight: '92dvh',
          fontFamily: MONO,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--vault-border)' }}
        >
          <span className="text-[11px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
            TRY ON
          </span>
          <button onClick={onClose} style={{ color: 'var(--vault-text-dim)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5 overflow-y-auto">
          {/* Preview row: original + result */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] tracking-widest mb-1" style={{ color: 'var(--vault-text-dim)' }}>ORIGINAL</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lookImageUrl}
                alt="original look"
                className="w-full object-cover"
                style={{ aspectRatio: (recipe.aspectRatio || '3:4').replace(':', '/') }}
              />
            </div>
            <div>
              <p className="text-[10px] tracking-widest mb-1" style={{ color: 'var(--vault-text-dim)' }}>YOUR LOOK</p>
              <div
                className="w-full relative flex items-center justify-center"
                style={{ aspectRatio: arStyle, background: 'var(--vault-border)' }}
              >
                {generating && (
                  <div
                    className="w-5 h-5 rounded-full border-2 animate-spin"
                    style={{ borderColor: 'var(--vault-text-dim)', borderTopColor: 'transparent' }}
                  />
                )}
                {resultImage && !generating && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resultImage} alt="try-on result" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {error && !generating && !resultImage && (
                  <p className="text-[9px] text-center px-2" style={{ color: 'var(--vault-text-dim)' }}>{error}</p>
                )}
              </div>
            </div>
          </div>

          {/* MATCH LOOK / CUSTOMIZE toggle */}
          <div className="flex gap-[2px]">
            {(['match', 'customize'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setTryMode(m)}
                className="flex-1 py-3 text-[11px] tracking-widest transition-opacity hover:opacity-80"
                style={{
                  background: tryMode === m ? 'var(--vault-text)' : 'var(--vault-border)',
                  color: tryMode === m ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                }}
              >
                {m === 'match' ? 'MATCH LOOK' : 'CUSTOMIZE'}
              </button>
            ))}
          </div>

          {/* Scene info */}
          {tryMode === 'match' && (recipe.location || recipe.filmMode) && (
            <div className="space-y-1">
              <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>SCENE</p>
              <p className="text-[12px]" style={{ color: 'var(--vault-text)' }}>
                {[recipe.location, recipe.filmMode ? FILM_OPTIONS.find(f => f.value === recipe.filmMode)?.label : null]
                  .filter(Boolean).join(' / ')}
              </p>
            </div>
          )}

          {/* Customize overrides */}
          {tryMode === 'customize' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>LOCATION</p>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={recipe.location || '東京 / Paris...'}
                  className="w-full text-[12px] py-2 bg-transparent border-b outline-none placeholder:opacity-30"
                  style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>FILM LOOK</p>
                <select
                  value={filmMode}
                  onChange={(e) => setFilmMode(e.target.value)}
                  className="w-full text-[12px] py-2 bg-transparent border-b outline-none"
                  style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
                >
                  {FILM_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>ASPECT RATIO</p>
                <div className="flex gap-[2px]">
                  {AR_OPTIONS.map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className="flex-1 py-2 text-[10px] tracking-wider"
                      style={{
                        background: aspectRatio === ar ? 'var(--vault-text)' : 'var(--vault-border)',
                        color: aspectRatio === ar ? 'var(--vault-bg)' : 'var(--vault-text-dim)',
                      }}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Model settings */}
          <div className="flex gap-4 items-start">
            {/* Face photo */}
            <div className="flex-shrink-0 space-y-1">
              <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>FACE</p>
              <button
                onClick={faceImage ? () => setFaceImage(null) : pickFace}
                className="relative group overflow-hidden flex items-center justify-center"
                style={{ width: 48, height: 48, background: 'var(--vault-border)', flexShrink: 0 }}
              >
                {faceImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={faceImage} alt="face" className="absolute inset-0 w-full h-full object-cover" />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </div>
                  </>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--vault-text-dim)' }}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                )}
              </button>
              <p className="text-[9px]" style={{ color: 'var(--vault-text-dim)' }}>
                {faceImage ? 'CLEAR' : 'OPT'}
              </p>
            </div>

            {/* Height + Ethnicity */}
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>
                  HEIGHT — {height}cm
                </p>
                <input
                  type="range" min={150} max={195} step={1}
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full"
                  style={{ accentColor: 'var(--vault-text)' }}
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] tracking-widest" style={{ color: 'var(--vault-text-dim)' }}>MODEL</p>
                <select
                  value={ethnicity}
                  onChange={(e) => setEthnicity(e.target.value)}
                  className="w-full text-[12px] py-1 bg-transparent border-b outline-none"
                  style={{ borderColor: 'var(--vault-border)', color: 'var(--vault-text)', fontFamily: MONO }}
                >
                  {ETHNICITIES.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* CTA */}
          {resultImage ? (
            <div className="flex gap-[2px]">
              {user && (
                <button
                  onClick={handleSave}
                  disabled={saving || saved}
                  className="flex-1 py-4 text-[12px] tracking-widest transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ background: saved ? 'var(--vault-border)' : 'var(--vault-text)', color: saved ? 'var(--vault-text-dim)' : 'var(--vault-bg)' }}
                >
                  {saved ? 'SAVED ✓' : saving ? '...' : 'SAVE'}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="flex-1 py-4 text-[12px] tracking-widest transition-opacity hover:opacity-70"
                style={{ background: 'var(--vault-border)', color: 'var(--vault-text)' }}
              >
                DOWNLOAD
              </button>
            </div>
          ) : user ? (
            <button
              onClick={handleGenerate}
              disabled={generating || !recipe.garmentUrls?.length}
              className="w-full py-4 text-[12px] tracking-widest transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ background: 'var(--vault-text)', color: 'var(--vault-bg)' }}
            >
              {generating ? 'GENERATING...' : 'TRY ON — 1 CREDIT'}
            </button>
          ) : (
            <button
              onClick={() => signInWithGoogle().then((u) => { if (u) setUser(u); })}
              className="w-full py-4 text-[12px] tracking-widest transition-opacity hover:opacity-70"
              style={{ border: '1px solid var(--vault-border)', color: 'var(--vault-text-dim)' }}
            >
              LOG IN TO TRY ON
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
