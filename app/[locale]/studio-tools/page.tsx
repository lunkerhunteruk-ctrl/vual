'use client';

import React, { useState } from 'react';
import { Copy, Check, Loader2, Sparkles } from 'lucide-react';

// Passcode sent with API calls so the prompt-generation endpoints can't be hit directly.
const STUDIO_PASSCODE = process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE || 'vual-studio';

// ── Template Library (same as generate-prompts.ts) ──
const TEMPLATE_LIBRARY = [
  { id: 'SB1', cat: 'Scene B', desc: 'Walking LEFT, wide establishing, BRIGHT outdoor' },
  { id: 'SB2', cat: 'Scene B', desc: 'Static pose, leaning/resting, window light' },
  { id: 'SB3', cat: 'Scene B', desc: 'Walking RIGHT, medium shot, bright courtyard' },
  { id: 'SB4', cat: 'Scene B', desc: 'Looking back over shoulder, backlit' },
  { id: 'SB5', cat: 'Scene B', desc: 'Low angle, power shot, sky above' },
  { id: 'SB6', cat: 'Scene B', desc: 'Walking toward camera, lo-fi catwalk' },
  { id: 'SA1', cat: 'Scene A', desc: 'Hero catwalk — corridor/archway' },
  { id: 'AA1', cat: 'Artistic A', desc: 'Noctilux — golden hour backlight' },
  { id: 'AA2', cat: 'Artistic A', desc: 'Canon DS — twilight, round bokeh' },
  { id: 'AA3', cat: 'Artistic A', desc: 'Contax Planar — bright wide walking' },
  { id: 'AA4', cat: 'Artistic A', desc: 'Fujifilm GF — dappled light' },
  { id: 'AA5', cat: 'Artistic A', desc: 'Sigma 35mm — foreground bokeh' },
  { id: 'AA6', cat: 'Artistic A', desc: 'Nikon Noct — blue hour ethereal' },
  { id: 'AB1', cat: 'Artistic B', desc: 'Hasselblad — wet ground reflections' },
  { id: 'AB2', cat: 'Artistic B', desc: 'Summilux — architectural depth' },
  { id: 'AB3', cat: 'Artistic B', desc: 'Mamiya 7 — bright wide, wind' },
  { id: 'AB4', cat: 'Artistic B', desc: 'Nokton — warm wall lean' },
  { id: 'AB5', cat: 'Artistic B', desc: 'Sony 135mm — layered bokeh' },
  { id: 'AB6', cat: 'Artistic B', desc: 'Zeiss Batis — geometric lines' },
  { id: 'DA1', cat: 'Detail A', desc: 'Face — contemplative, Otus 85mm' },
  { id: 'DA2', cat: 'Detail A', desc: 'Face — direct gaze, Noctilux' },
  { id: 'DA3', cat: 'Detail A', desc: 'Face — profile, rim light' },
  { id: 'DA4', cat: 'Detail A', desc: 'Face — glance back, Noctilux' },
  { id: 'DA5', cat: 'Detail A', desc: 'Face — diagonal 3/4, Canon DS' },
  { id: 'DA6', cat: 'Detail A', desc: 'Face — upward gaze, Otus' },
  { id: 'DB1', cat: 'Detail B', desc: 'Upper body — Fujifilm GF' },
  { id: 'DB2', cat: 'Detail B', desc: 'Upper body — direct gaze, Noctilux' },
  { id: 'DB3', cat: 'Detail B', desc: 'Upper body — fabric texture, Hasselblad' },
  { id: 'DB4', cat: 'Detail B', desc: 'Upper body — side view, GF' },
  { id: 'DB5', cat: 'Detail B', desc: 'Upper body — hair tuck, Canon DS' },
  { id: 'DB6', cat: 'Detail B', desc: 'Upper body — glance back, Noctilux' },
  { id: 'DB7', cat: 'Detail B', desc: 'Bag close-up — Fujifilm GF' },
  { id: 'DB8', cat: 'Detail B', desc: 'Bag extreme close-up — Noctilux' },
  { id: 'DC1', cat: 'Detail C', desc: 'Catwalk side full body — Contax' },
  { id: 'DC2', cat: 'Detail C', desc: 'Catwalk side lower body — tilt-shift' },
  { id: 'DC3', cat: 'Detail C', desc: 'Wall lean side — Summilux' },
  { id: 'DC4', cat: 'Detail C', desc: 'Seated bench side — GF' },
  { id: 'DC5', cat: 'Detail C', desc: 'Shoe close-up — tilt-shift' },
  { id: 'DC6', cat: 'Detail C', desc: 'Shoe wall pose — Noctilux' },
];

type ShotResult = {
  id: string;
  customNote: string;
  prompt: string;
  templateDesc: string;
  templateCat: string;
};

export default function StudioToolsPage() {
  const [story, setStory] = useState('');
  const [height, setHeight] = useState('175');
  const [tuck, setTuck] = useState<string>('none');
  const [outer, setOuter] = useState<string>('none');
  const [shots, setShots] = useState<ShotResult[]>([]);
  const [shotCount, setShotCount] = useState<number>(6);
  const [hasBag, setHasBag] = useState(false);
  const [hasShoes, setHasShoes] = useState(false);
  const [filmMode, setFilmMode] = useState<string>('off');
  const [provocative, setProvocative] = useState(false);
  const [sculptural, setSculptural] = useState(false);
  const [surveillance, setSurveillance] = useState(false);
  const [cyberNeon, setCyberNeon] = useState(false);
  const [dailyMode, setDailyMode] = useState(false);
  const [cinematicMix, setCinematicMix] = useState(false);
  const [threadsMode, setThreadsMode] = useState(false);
  const [tights, setTights] = useState<string>('none');
  const [oversizeTop, setOversizeTop] = useState(false);
  const [oversizeBottom, setOversizeBottom] = useState(false);
  const [neonColor, setNeonColor] = useState<string>('mix');
  const [neonIntensity, setNeonIntensity] = useState<string>('normal');
  const [timeOfDay, setTimeOfDay] = useState<string>('day');

  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const generate = async () => {
    if (!story.trim()) return;
    setLoading(true);
    setShots([]);
    try {
      const res = await fetch('/api/studio-tools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-studio-passcode': STUDIO_PASSCODE },
        body: JSON.stringify({ story: story.trim(), height, tuck, outer, shotCount, hasBag, hasShoes, filmMode: filmMode === 'off' ? false : filmMode, provocative, sculptural, surveillance, cyberNeon, neonColor, neonIntensity, timeOfDay: cyberNeon ? 'night' : timeOfDay, tights, dailyMode, cinematicMix, threadsMode, oversizeTop, oversizeBottom }),
      });
      const data = await res.json();
      if (data.shots) setShots(data.shots);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const copyOne = (idx: number) => {
    navigator.clipboard.writeText(shots[idx].prompt);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const copyAll = () => {
    const all = shots.map((s, i) =>
      `${'='.repeat(60)}\nSHOT ${i + 1} / ${shots.length} — ${s.id} [${s.templateCat}]\nDirector: ${s.customNote}\n${'='.repeat(60)}\n\n${s.prompt}`
    ).join('\n\n\n');
    navigator.clipboard.writeText(all);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // ── Offshot state ──
  const [offScene, setOffScene] = useState('dinner');
  const [offLocation, setOffLocation] = useState('');
  const [offSolo, setOffSolo] = useState(true);
  const [offPov, setOffPov] = useState(false);
  const [offJapan, setOffJapan] = useState(false);
  const [offShotCount, setOffShotCount] = useState(6);
  const [offShots, setOffShots] = useState<{ index: number; prompt: string; summary?: string }[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [offCopiedIdx, setOffCopiedIdx] = useState<number | null>(null);
  const [offCopiedAll, setOffCopiedAll] = useState(false);

  const [activeTab, setActiveTab] = useState<'editorial' | 'offshot'>('editorial');

  const generateOffshot = async () => {
    if (!offLocation.trim()) return;
    setOffLoading(true);
    setOffShots([]);
    try {
      const res = await fetch('/api/studio-tools/generate-offshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-studio-passcode': STUDIO_PASSCODE },
        body: JSON.stringify({ location: offLocation.trim(), scene: offScene, shotCount: offShotCount, isJapan: offJapan, soloMode: offSolo, povMode: offPov, height, tuck, outer }),
      });
      const data = await res.json();
      if (data.shots) setOffShots(data.shots);
    } catch (e) {
      console.error(e);
    }
    setOffLoading(false);
  };

  const copyOffOne = (idx: number) => {
    navigator.clipboard.writeText(offShots[idx].prompt);
    setOffCopiedIdx(idx);
    setTimeout(() => setOffCopiedIdx(null), 2000);
  };

  const copyOffAll = () => {
    const all = offShots.map((s, i) =>
      `${'='.repeat(60)}\nSHOT ${i + 1} / ${offShots.length}\n${'='.repeat(60)}\n\n${s.prompt}`
    ).join('\n\n\n');
    navigator.clipboard.writeText(all);
    setOffCopiedAll(true);
    setTimeout(() => setOffCopiedAll(false), 2000);
  };

  const OFFSHOT_SCENES = [
    { id: 'A', label: 'A — Behind the scenes', desc: '撮影裏のキャンディッド' },
    { id: 'B', label: 'B — After hours (Night)', desc: '撮影後の夜、レストラン・バー' },
    { id: 'C', label: 'C — Morning / Daytime', desc: '撮影前の朝、ホテル・カフェ' },
    { id: 'breakfast', label: 'Breakfast', desc: '朝食シーン' },
    { id: 'lunch', label: 'Lunch', desc: 'ランチシーン' },
    { id: 'dinner', label: 'Dinner', desc: 'ディナーシーン' },
    { id: 'nightclub', label: 'Club', desc: 'ナイトクラブ' },
    { id: 'pub-bar', label: 'Bar', desc: 'パブ・バー' },
    { id: 'snap', label: 'Snap', desc: 'ストリートスナップ' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#222', padding: '40px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <h1 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.2em', color: '#111', marginBottom: 4 }}>
          PROMPT GENERATOR
        </h1>
        <p style={{ fontSize: 12, color: '#aaa', letterSpacing: '0.05em', marginBottom: 24 }}>
          39 templates / AI-optimized shot planning
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, borderBottom: '1px solid #e0e0e0' }}>
          {[
            { id: 'editorial' as const, label: 'Editorial' },
            { id: 'offshot' as const, label: 'Offshot' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 24px', border: 'none', borderBottom: '2px solid',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer',
                background: 'none', transition: 'all 0.2s',
                color: activeTab === tab.id ? '#111' : '#bbb',
                borderBottomColor: activeTab === tab.id ? '#111' : 'transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ EDITORIAL TAB ═══ */}
        {activeTab === 'editorial' && <>

        {/* Story input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Story / Location
          </label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="e.g. A.D.2226 浸水するラウンジの残照..."
            rows={4}
            style={{
              width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 8,
              padding: '12px 14px', color: '#333', fontSize: 14, lineHeight: 1.6, resize: 'vertical',
              outline: 'none', fontFamily: 'inherit',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#444')}
            onBlur={(e) => (e.target.style.borderColor = '#222')}
          />
        </div>

        {/* Options grid */}
        {/* Shot count toggle */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Shots
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[6, 12, 24].map((n) => (
              <button
                key={n}
                onClick={() => setShotCount(n)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid', borderRadius: 6,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                  background: shotCount === n ? '#111' : '#f8f8f8',
                  color: shotCount === n ? '#fff' : '#888',
                  borderColor: shotCount === n ? '#111' : '#e0e0e0',
                }}
              >
                {n === 24 ? '24 (12×2)' : `${n} shots`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          {/* Height */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Height
            </label>
            <select
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              style={{
                width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6,
                padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="160">160cm</option>
              <option value="165">165cm</option>
              <option value="168">168cm</option>
              <option value="170">170cm</option>
              <option value="172">172cm</option>
              <option value="175">175cm</option>
              <option value="178">178cm</option>
              <option value="180">180cm</option>
            </select>
          </div>

          {/* Tuck style */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Tuck Style
            </label>
            <select
              value={tuck}
              onChange={(e) => setTuck(e.target.value)}
              style={{
                width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6,
                padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="none">Auto</option>
              <option value="tuck-in">Tuck In</option>
              <option value="tuck-out">Tuck Out</option>
              <option value="french-tuck">French Tuck</option>
            </select>
          </div>

          {/* Outer style */}
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Outer
            </label>
            <select
              value={outer}
              onChange={(e) => setOuter(e.target.value)}
              style={{
                width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6,
                padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}
            >
              <option value="none">Auto</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Row 1: Camera + Time of Day + Tights */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 3 }}>
            <select
              value={filmMode}
              onChange={(e) => setFilmMode(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid',
                borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: filmMode !== 'off' ? '#111' : '#f8f8f8',
                color: filmMode !== 'off' ? '#fff' : '#888',
                borderColor: filmMode !== 'off' ? '#111' : '#e0e0e0',
                appearance: 'none', WebkitAppearance: 'none',
              }}
            >
              <option value="off">Cinema: ARRI Alexa Mini LF + Summilux-C</option>
              <option value="still">Still Photo: Individual lenses per shot</option>
              <option value="leica">Leica M6 + Summicron 35mm + Portra 400</option>
              <option value="leicaApo">Leica M6 + APO-Summicron 50mm + Portra 400</option>
              <option value="leicaPortra800">Leica M6 + Summicron 35mm + Portra 800</option>
              <option value="contax">Contax T3 + Portra 400</option>
              <option value="nikon">Nikon FM2 + Nikkor 35mm + Tri-X pushed</option>
              <option value="nikon800">Nikon FM2 + Nikkor 35mm + Vision3 500T pushed</option>
              <option value="portra800">Nikon FM2 + Nikkor 35mm + Portra 800</option>
              <option value="superia">Nikon FM2 + Nikkor 35mm + Superia X-TRA 800</option>
              <option value="pentax">Pentax 67 + Takumar 105mm f/2.4 + Portra 400</option>
            </select>
          </div>
          <div style={{ flex: 1.5 }}>
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid',
                borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: timeOfDay !== 'day' ? '#111' : '#f8f8f8',
                color: timeOfDay !== 'day' ? '#fff' : '#888',
                borderColor: timeOfDay !== 'day' ? '#111' : '#e0e0e0',
                appearance: 'none', WebkitAppearance: 'none',
              }}
            >
              <option value="day">Day (bright natural)</option>
              <option value="golden">Golden Hour</option>
              <option value="dawn">Dawn (early morning)</option>
              <option value="overcast">Overcast</option>
              <option value="dusk">Dusk / Blue Hour</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <select
              value={tights}
              onChange={(e) => setTights(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid',
                borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: tights !== 'none' ? '#111' : '#f8f8f8',
                color: tights !== 'none' ? '#fff' : '#888',
                borderColor: tights !== 'none' ? '#111' : '#e0e0e0',
                appearance: 'none', WebkitAppearance: 'none',
              }}
            >
              <option value="none">No tights</option>
              <option value="black">Tights: Black</option>
              <option value="violet">Tights: Violet</option>
              <option value="peacock-green">Tights: Peacock Green</option>
              <option value="magenta">Tights: Magenta</option>
            </select>
          </div>
        </div>
        {/* Row 2: Mode toggles + Bag/Shoes */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Provocative', value: provocative, set: (v: boolean) => { setProvocative(v); if (v) { setSculptural(false); setSurveillance(false); } } },
            { label: 'Sculptural', value: sculptural, set: (v: boolean) => { setSculptural(v); if (v) { setProvocative(false); setSurveillance(false); setCyberNeon(false); } } },
            { label: 'Surveillance', value: surveillance, set: (v: boolean) => { setSurveillance(v); if (v) { setProvocative(false); setSculptural(false); setCyberNeon(false); } } },
            { label: 'Cyber Neon', value: cyberNeon, set: (v: boolean) => { setCyberNeon(v); if (v) { setSculptural(false); setSurveillance(false); } } },
            { label: 'Daily', value: dailyMode, set: setDailyMode },
            { label: 'B-Roll', value: cinematicMix, set: setCinematicMix },
            { label: 'Threads', value: threadsMode, set: setThreadsMode },
            { label: 'Bag', value: hasBag, set: setHasBag },
            { label: 'Shoes', value: hasShoes, set: setHasShoes },
            { label: 'OS Top', value: oversizeTop, set: setOversizeTop },
            { label: 'OS Bottom', value: oversizeBottom, set: setOversizeBottom },
          ].map(({ label, value, set }) => (
            <button
              key={label}
              onClick={() => set(!value)}
              style={{
                flex: '0 0 auto', minWidth: 100, padding: '10px', border: '1px solid', borderRadius: 6,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: value ? '#111' : '#f8f8f8',
                color: value ? '#fff' : '#aaa',
                borderColor: value ? '#111' : '#e0e0e0',
              }}
            >
              <span style={{
                width: 32, height: 18, borderRadius: 9, position: 'relative', display: 'inline-block',
                background: value ? '#2a8a4a' : '#ddd', transition: 'background 0.2s',
              }}>
                <span style={{
                  position: 'absolute', top: 2, left: value ? 16 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }} />
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Cyber Neon color selector — only visible when Cyber Neon is ON */}
        {cyberNeon && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[
              { value: 'mix', label: 'Mix (Random)' },
              { value: 'magenta-cyan', label: 'Magenta × Cyan' },
              { value: 'green-red', label: 'Green × Red' },
              { value: 'yellow-violet', label: 'Yellow × Violet' },
              { value: 'orange-cobalt', label: 'Orange × Cobalt' },
              { value: 'red-white', label: 'Blood × Ice' },
              { value: 'lime-pink', label: 'Lime × Pink' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setNeonColor(value)}
                style={{
                  flex: 1, padding: '8px 4px', border: '1px solid',
                  borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  background: neonColor === value ? '#111' : '#f8f8f8',
                  color: neonColor === value ? '#fff' : '#888',
                  borderColor: neonColor === value ? '#111' : '#e0e0e0',
                }}
              >
                {label}
              </button>
            ))}
            {/* Intensity toggle */}
            <button
              onClick={() => setNeonIntensity(neonIntensity === 'normal' ? 'strong' : 'normal')}
              style={{
                padding: '8px 12px', border: '1px solid',
                borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: neonIntensity === 'strong' ? '#ff3344' : '#f8f8f8',
                color: neonIntensity === 'strong' ? '#fff' : '#888',
                borderColor: neonIntensity === 'strong' ? '#ff3344' : '#e0e0e0',
                whiteSpace: 'nowrap',
              }}
            >
              {neonIntensity === 'strong' ? '⚡ STRONG' : 'Normal'}
            </button>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={loading || !story.trim()}
          style={{
            width: '100%', padding: '14px', background: loading ? '#f0f0f0' : '#fff',
            color: loading ? '#999' : '#000', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', cursor: loading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', opacity: !story.trim() ? 0.3 : 1,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              AI Planning...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate {shotCount} Prompts
            </>
          )}
        </button>

        {/* Results */}
        {shots.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' }}>
                Generated Shots
              </h2>
              <button
                onClick={copyAll}
                style={{
                  background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px',
                  color: copiedAll ? '#4a8' : '#888', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                }}
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                {copiedAll ? 'COPIED ALL' : 'COPY ALL'}
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#aaa', marginBottom: 16 }}>
              Shot plan: {shots.map(s => s.id).join(' → ')}
            </p>

            {shots.map((shot, i) => (
              <div
                key={i}
                style={{
                  background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 8,
                  padding: 16, marginBottom: 12, position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                      Shot {i + 1}
                    </span>
                    <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                      {shot.id} [{shot.templateCat}]
                    </span>
                  </div>
                  <button
                    onClick={() => copyOne(i)}
                    style={{
                      background: 'none', border: '1px solid #e0e0e0', borderRadius: 4,
                      padding: '4px 10px', color: copiedIdx === i ? '#4a8' : '#666',
                      fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                      borderColor: copiedIdx === i ? '#4a8' : '#2a2a2a',
                    }}
                  >
                    {copiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                    {copiedIdx === i ? 'COPIED' : 'COPY'}
                  </button>
                </div>

                <p style={{ fontSize: 11, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
                  {shot.templateDesc}
                </p>
                <p style={{ fontSize: 11, color: '#2a7a4a', marginBottom: 12, fontStyle: 'italic' }}>
                  Director: {shot.customNote}
                </p>

                <div
                  style={{
                    background: '#f0f0f0', border: '1px solid #e0e0e0', borderRadius: 6,
                    padding: '10px 12px', fontSize: 11, color: '#888', lineHeight: 1.6,
                    maxHeight: 120, overflow: 'auto', fontFamily: "'SF Mono', monospace",
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                >
                  {shot.prompt}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Template reference */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #eee' }}>
          <h2 style={{ fontSize: 11, letterSpacing: '0.15em', color: '#bbb', textTransform: 'uppercase', marginBottom: 12 }}>
            Template Library ({TEMPLATE_LIBRARY.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {TEMPLATE_LIBRARY.map((t) => (
              <div key={t.id} style={{ fontSize: 10, color: '#bbb', padding: '2px 0' }}>
                <span style={{ color: '#aaa' }}>{t.id}</span> {t.desc}
              </div>
            ))}
          </div>
        </div>

        </>}

        {/* ═══ OFFSHOT TAB ═══ */}
        {activeTab === 'offshot' && <>

        {/* Scene select */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Scene Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {OFFSHOT_SCENES.map((s) => (
              <button
                key={s.id}
                onClick={() => setOffScene(s.id)}
                style={{
                  padding: '10px 8px', border: '1px solid', borderRadius: 6,
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                  background: offScene === s.id ? '#111' : '#f8f8f8',
                  color: offScene === s.id ? '#fff' : '#666',
                  borderColor: offScene === s.id ? '#111' : '#e0e0e0',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Location input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Location
          </label>
          <textarea
            value={offLocation}
            onChange={(e) => setOffLocation(e.target.value)}
            placeholder="e.g. 中目黒 スペインバル / Shibuya, Tokyo / a cozy Italian trattoria in Rome"
            rows={2}
            style={{
              width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 8,
              padding: '12px 14px', color: '#333', fontSize: 14, lineHeight: 1.6, resize: 'vertical',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Height / Tuck / Outer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Height</label>
            <select value={height} onChange={(e) => setHeight(e.target.value)} style={{ width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="160">160cm</option><option value="165">165cm</option><option value="168">168cm</option><option value="170">170cm</option><option value="172">172cm</option><option value="175">175cm</option><option value="178">178cm</option><option value="180">180cm</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Tuck Style</label>
            <select value={tuck} onChange={(e) => setTuck(e.target.value)} style={{ width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="none">Auto</option><option value="tuck-in">Tuck In</option><option value="tuck-out">Tuck Out</option><option value="french-tuck">French Tuck</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Outer</label>
            <select value={outer} onChange={(e) => setOuter(e.target.value)} style={{ width: '100%', background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 6, padding: '8px 10px', color: '#333', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="none">Auto</option><option value="open">Open</option><option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Options row */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {/* Solo mode (no crew) */}
          <button
            onClick={() => setOffSolo(!offSolo)}
            style={{
              flex: 1, padding: '10px', border: '1px solid', borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: offSolo ? '#111' : '#f8f8f8',
              color: offSolo ? '#fff' : '#aaa',
              borderColor: offSolo ? '#111' : '#e0e0e0',
            }}
          >
            <span style={{
              width: 32, height: 18, borderRadius: 9, position: 'relative', display: 'inline-block',
              background: offSolo ? '#2a8a4a' : '#ddd', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: offSolo ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </span>
            Solo (no crew)
          </button>

          {/* POV mode */}
          <button
            onClick={() => setOffPov(!offPov)}
            style={{
              flex: 1, padding: '10px', border: '1px solid', borderRadius: 6,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: offPov ? '#111' : '#f8f8f8',
              color: offPov ? '#fff' : '#aaa',
              borderColor: offPov ? '#111' : '#e0e0e0',
            }}
          >
            <span style={{
              width: 32, height: 18, borderRadius: 9, position: 'relative', display: 'inline-block',
              background: offPov ? '#2a8a4a' : '#ddd', transition: 'background 0.2s',
            }}>
              <span style={{
                position: 'absolute', top: 2, left: offPov ? 16 : 2,
                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }} />
            </span>
            POV (1st Person)
          </button>

          {/* Shot count */}
          {[3, 4, 6].map((n) => (
            <button
              key={n}
              onClick={() => setOffShotCount(n)}
              style={{
                padding: '10px 16px', border: '1px solid', borderRadius: 6,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: offShotCount === n ? '#111' : '#f8f8f8',
                color: offShotCount === n ? '#fff' : '#888',
                borderColor: offShotCount === n ? '#111' : '#e0e0e0',
              }}
            >
              {n}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generateOffshot}
          disabled={offLoading || !offLocation.trim()}
          style={{
            width: '100%', padding: '14px', background: offLoading ? '#f0f0f0' : '#111',
            color: offLoading ? '#999' : '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 600, letterSpacing: '0.1em', cursor: offLoading ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', opacity: !offLocation.trim() ? 0.3 : 1,
          }}
        >
          {offLoading ? (
            <>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate {offPov ? '6 POV' : `${offShotCount} Offshot`} Prompts
            </>
          )}
        </button>

        {/* Offshot results */}
        {offShots.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 13, letterSpacing: '0.15em', color: '#888', textTransform: 'uppercase' }}>
                Generated Offshots
              </h2>
              <button
                onClick={copyOffAll}
                style={{
                  background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '6px 14px',
                  color: offCopiedAll ? '#2a8a4a' : '#888', fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                }}
              >
                {offCopiedAll ? <Check size={12} /> : <Copy size={12} />}
                {offCopiedAll ? 'COPIED ALL' : 'COPY ALL'}
              </button>
            </div>

            {offShots.map((shot, i) => (
              <div
                key={i}
                style={{
                  background: '#f8f8f8', border: '1px solid #e0e0e0', borderRadius: 8,
                  padding: 16, marginBottom: 12, position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                      Shot {i + 1}
                    </span>
                    {i === offShots.length - 1 && (offSolo || offJapan) && <span style={{ fontSize: 10, color: '#2a8a4a', marginLeft: 8, fontWeight: 500 }}>friend selfie</span>}
                    {shot.summary && (
                      <p style={{ fontSize: 11, color: '#888', marginTop: 4, lineHeight: 1.4 }}>
                        {shot.summary}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => copyOffOne(i)}
                    style={{
                      background: 'none', border: '1px solid #e0e0e0', borderRadius: 4,
                      padding: '4px 10px', color: offCopiedIdx === i ? '#2a8a4a' : '#888',
                      fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                    }}
                  >
                    {offCopiedIdx === i ? <Check size={10} /> : <Copy size={10} />}
                    {offCopiedIdx === i ? 'COPIED' : 'COPY'}
                  </button>
                </div>
                <div
                  style={{
                    background: '#f0f0f0', border: '1px solid #e0e0e0', borderRadius: 6,
                    padding: '10px 12px', fontSize: 11, color: '#666', lineHeight: 1.6,
                    maxHeight: 120, overflow: 'auto', fontFamily: "'SF Mono', monospace",
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                >
                  {shot.prompt}
                </div>
              </div>
            ))}
          </div>
        )}

        </>}

        <div style={{ height: 60 }} />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select { appearance: auto; -webkit-appearance: auto; }
        textarea::placeholder { color: #444; }
      `}</style>
    </div>
  );
}
