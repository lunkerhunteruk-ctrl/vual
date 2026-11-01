'use client';
import { useEffect, useState } from 'react';
import { INK, MUTE, SERIF } from './Latitude';
import { PHASE_WORD, clockIn, nextSun, phaseAt, tempText, toneOf, weatherOf, windOf, type NowData } from '@/lib/latitude-now';

// 2026-11-01 「その街のいま」の一行（ブラウザ側）。雑誌の一行のように控えめに：
//   NOW IN VIENNA ── 14:32 · 7° · light rain · sunset 16:36
// 時刻と気温は Didot 系で少し大きく。地の色と左の細い帯は、いまの時間帯と空模様でうすく変わる（lib/latitude-now.ts の toneOf）。
// 秒は出さない。分はブラウザで進む（最初の描画はサーバーの時刻で描き、読み込んだ後に今の時刻へ置きかえる）。

const Dot = () => (
  <span aria-hidden="true" style={{ color: MUTE }}>
    ·
  </span>
);

export function NowLine({ data, name, ja, className = '' }: { data: NowData; name: string; ja: boolean; className?: string }) {
  const [now, setNow] = useState(data.at);
  useEffect(() => {
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

  const sunText = sun ? `${L(sun.kind, sun.kind === 'sunrise' ? '日の出' : '日の入り')} ${clockIn(data.tz, sun.t)}` : '';
  const label = [
    L(`Now in ${name}`, `いまの${name}`),
    clock,
    `${tempText(data.temp)}°C`,
    w ? L(w.en, w.ja) : '',
    L(PHASE_WORD[phase].en, PHASE_WORD[phase].ja),
    wind ? L(wind.en, wind.ja) : '',
    sunText,
  ]
    .filter(Boolean)
    .join(', ');

  const small = ja ? 'text-[12px] tracking-[0.12em]' : 'text-[10px] uppercase tracking-[0.3em]';
  const num = { fontFamily: SERIF, fontVariantNumeric: 'lining-nums tabular-nums' } as const;

  return (
    <div
      role="group"
      aria-label={label}
      title={L(`${PHASE_WORD[phase].en} in ${name}`, `${name}はいま${PHASE_WORD[phase].ja}`)}
      data-phase={phase}
      data-sky={w?.sky ?? 'clear'}
      className={`inline-flex max-w-full py-2.5 pl-4 pr-10 ${className}`}
      style={{ background: tone.wash, borderLeft: `2px solid ${tone.chip}`, transition: 'background 2s ease, border-color 2s ease' }}
    >
      <p aria-hidden="true" className="flex flex-wrap items-baseline gap-x-3 gap-y-1" style={{ color: INK }}>
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
      </p>
    </div>
  );
}
