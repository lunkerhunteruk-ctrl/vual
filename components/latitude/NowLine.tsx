'use client';
import { useEffect, useState } from 'react';
import { INK, MUTE, SERIF } from './Latitude';
import {
  NIGHT_PHOTO_ALPHA, NIGHT_PHOTO_TINT, PHASE_WORD, chapterNow, clockIn, diffText, motionOf, nextSun, phaseAt, tempText, toneOf, weatherOf, windOf,
  type NowData, type Weather,
} from '@/lib/latitude-now';

// 2026-11-01 「その街のいま」の一行（ブラウザ側）。雑誌の一行のように控えめに：
//   NOW IN VIENNA ── 14:32 · 7° · light rain · sunset 16:36
// 時刻と気温は Didot 系で少し大きく。地の色と左の細い帯は、いまの時間帯と空模様でうすく変わる（lib/latitude-now.ts の toneOf）。
// 秒は出さない。分はブラウザで進む（最初の描画はサーバーの時刻で描き、読み込んだ後に今の時刻へ置きかえる）。
// 2026-11-01 追加：
//   ・時差の一言（見る人のブラウザのタイムゾーンだけ。位置は使わない。読み込んだ後に出す）
//   ・その街が夜の間だけ、ページの写真（data-lat-photo の付いた物）にごくうすい紺の膜（強さは lib/latitude-now.ts の NIGHT_PHOTO_*）
//   ・号の章の時刻にいまが重なる時、その章（data-lat-chapter="番号"）の中の小さな印（data-lat-now）を出す
//   ・雨・霧雨・雪の時だけ、この欄の中に細い線か小さな点がゆっくり落ちる（WX の数字で強さを変える。動きを減らす設定の時は出さない）
// どれも、この欄が出ている時だけ効く（<style> をこの欄が持つので、欄が出ないページ・欄が消えた時は何も変わらない）。

// 天気の動きの強さ：count＝線や点の数、alpha＝濃さ（墨の色の透明度）、dur＝1本が落ちる秒数、len＝線の長さ(px)
const WX: Record<Weather, { count: number; alpha: number; dur: number; len: number }> = {
  drizzle: { count: 6, alpha: 0.1, dur: 3.4, len: 7 },
  rain: { count: 9, alpha: 0.14, dur: 2.6, len: 13 },
  snow: { count: 10, alpha: 0.22, dur: 8, len: 2 },
};
// 並びは毎回同じ（サーバーとブラウザで描画がずれないよう、乱数は使わない）
const spot = (k: number) => ({ left: ((k * 37 + 11) % 94) + 3, delay: ((k * 53) % 100) / 100 });

const BASE_CSS = `
[data-lat-photo]{position:relative}
[data-lat-photo]::after{content:'';position:absolute;inset:0;pointer-events:none;background:rgba(${NIGHT_PHOTO_TINT},${NIGHT_PHOTO_ALPHA});mix-blend-mode:multiply;opacity:0;transition:opacity 2s ease}
.lat-wx{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.lat-wx i{position:absolute;top:0;display:block;will-change:transform}
.lat-wx-line{width:1px;animation:lat-rain linear infinite}
.lat-wx-dot{border-radius:50%;animation:lat-snow linear infinite}
@keyframes lat-rain{from{transform:translate(0,-24px) rotate(16deg)}to{transform:translate(-22px,84px) rotate(16deg)}}
@keyframes lat-snow{0%{transform:translate(0,-8px)}50%{transform:translate(6px,36px)}100%{transform:translate(-2px,84px)}}
@media (prefers-reduced-motion: reduce){.lat-wx{display:none}}
`;

function WeatherLayer({ kind }: { kind: Weather }) {
  const w = WX[kind];
  const line = kind !== 'snow';
  return (
    <span aria-hidden="true" className="lat-wx" data-weather={kind}>
      {Array.from({ length: w.count }, (_, k) => {
        const { left, delay } = spot(k);
        return (
          <i
            key={k}
            className={line ? 'lat-wx-line' : 'lat-wx-dot'}
            style={{
              left: `${left}%`,
              ...(line ? { height: w.len } : { width: w.len, height: w.len }),
              background: `rgba(30,29,27,${w.alpha})`,
              animationDuration: `${w.dur * (0.85 + (k % 3) * 0.12)}s`,
              animationDelay: `-${(delay * w.dur).toFixed(2)}s`,
            }}
          />
        );
      })}
    </span>
  );
}

const Dot = () => (
  <span aria-hidden="true" style={{ color: MUTE }}>
    ·
  </span>
);

export function NowLine({ data, name, ja, chapters, className = '' }: {
  data: NowData;
  name: string;
  ja: boolean;
  chapters?: { time: string }[]; // 号のページだけ渡す（章の印のため）
  className?: string;
}) {
  const [now, setNow] = useState(data.at);
  const [viewerTz, setViewerTz] = useState<string | null>(null); // 見る人のタイムゾーンは、読み込んだ後にだけ分かる
  useEffect(() => {
    try {
      setViewerTz(Intl.DateTimeFormat().resolvedOptions().timeZone || null);
    } catch {
      setViewerTz(null);
    }
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 15_000);
    const onVis = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const clock = clockIn(data.tz, now);
  if (!clock) return null;
  const w = weatherOf(data.code);
  const phase = phaseAt(now, data);
  const tone = toneOf(phase, w?.sky ?? 'clear');
  const sun = nextSun(now, data);
  const wind = windOf(data);
  const L = (en: string, jaText: string) => (ja ? jaText : en);
  const diff = viewerTz ? diffText(data.tz, viewerTz, now, ja) : null;
  const motion = motionOf(data.code);
  const chapter = chapters?.length ? chapterNow(chapters, clock) : null;
  const css =
    BASE_CSS +
    (phase === 'night' ? '[data-lat-photo]::after{opacity:1}' : '') +
    (chapter !== null ? `[data-lat-chapter="${chapter}"] [data-lat-now]{display:inline-flex !important;--lat-now-chip:${tone.chip}}` : '');

  const sunText = sun ? `${L(sun.kind, sun.kind === 'sunrise' ? '日の出' : '日の入り')} ${clockIn(data.tz, sun.t)}` : '';
  const label = [
    L(`Now in ${name}`, `いまの${name}`),
    clock,
    `${tempText(data.temp)}°C`,
    w ? L(w.en, w.ja) : '',
    L(PHASE_WORD[phase].en, PHASE_WORD[phase].ja),
    wind ? L(wind.en, wind.ja) : '',
    sunText,
    diff ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  const small = ja ? 'text-[12px] tracking-[0.12em]' : 'text-[12px] uppercase tracking-[0.2em]';
  const num = { fontFamily: SERIF, fontVariantNumeric: 'lining-nums tabular-nums' } as const;

  return (
    <div
      role="group"
      aria-label={label}
      title={L(`${PHASE_WORD[phase].en} in ${name}`, `${name}はいま${PHASE_WORD[phase].ja}`)}
      data-phase={phase}
      data-sky={w?.sky ?? 'clear'}
      className={`relative inline-flex max-w-full py-2.5 pl-4 pr-10 ${className}`}
      style={{ background: tone.wash, borderLeft: `2px solid ${tone.chip}`, transition: 'background 2s ease, border-color 2s ease' }}
    >
      <style>{css}</style>
      {motion && <WeatherLayer kind={motion} />}
      <p aria-hidden="true" className="relative flex flex-wrap items-baseline gap-x-3 gap-y-1" style={{ color: INK }}>
        <span className={small} style={{ color: MUTE }}>
          {L(`Now in ${name}`, `いまの${name}`)}
        </span>
        <span className="h-px w-7 self-center" style={{ background: 'rgba(30,29,27,0.35)' }} />
        <time dateTime={new Date(now).toISOString()} className="text-[22px] leading-none md:text-[24px]" style={num}>
          {clock}
        </time>
        <Dot />
        <span className="text-[22px] leading-none md:text-[24px]" style={num}>
          {tempText(data.temp)}
          <span style={{ marginLeft: '0.02em' }}>°</span>
        </span>
        {w && (
          <>
            <Dot />
            <span className={small}>{L(w.en, w.ja)}</span>
          </>
        )}
        {wind && (
          <>
            <Dot />
            <span className={small}>{L(wind.en, wind.ja)}</span>
          </>
        )}
        {sun && (
          <>
            <Dot />
            <span className={small} style={{ color: MUTE }}>
              {L(sun.kind, sun.kind === 'sunrise' ? '日の出' : '日の入り')}&nbsp;
              <span className="text-[15px] tracking-normal" style={{ ...num, color: INK, textTransform: 'none' }}>
                {clockIn(data.tz, sun.t)}
              </span>
            </span>
          </>
        )}
        {diff && (
          <>
            <Dot />
            <span className={small} style={{ color: MUTE }}>
              {diff}
            </span>
          </>
        )}
      </p>
    </div>
  );
}
