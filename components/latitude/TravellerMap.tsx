'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LAND_PATH, MAP_H, MAP_W, project } from '@/lib/latitude-map';

// 2026-10-30 LATITUDE の旅人の地図。6人が最後にいた所に点がまたたき、マウスを乗せると顔・名前・街と月が出る。押すとその人のページへ。
// 細い点線はその人の旅の跡（住む街 → 1日ずつ、号の順）。focus を渡すと、その人だけを濃くする（人のページ用）。
// 緯度の線を薄く引き、左に「60° N」などを置く（LATITUDE の題が緯度なので）。

export type MapStop = { x: number; y: number; city: string; month?: string; slug?: string };
export type MapTraveller = {
  slug: string;
  name: string;
  home: MapStop; // 住む街
  stops: MapStop[]; // 公開ずみの1日（古い順）
};

const INK = '#1e1d1b';
const MUTE = '#78746c';
const LAND = '#e3ddd1';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const PARALLELS = [20, 30, 40, 50, 60, 70];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

export default function TravellerMap({ travellers, locale, focus }: { travellers: MapTraveller[]; locale: string; focus?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [flip, setFlip] = useState(false); // 見えている範囲の右寄りの点は、札を左に出す
  const show = (slug: string, el: HTMLElement) => {
    const box = scroller.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setFlip(!!box && r.right + 360 > box.right); // 札の幅はおよそ 250〜340px（日本語の札は長い）
    setActive(slug);
  };
  const scroller = useRef<HTMLDivElement>(null);
  const lit = active ?? focus ?? null;

  // 狭い画面では地図を横に流し、最初はヨーロッパ（または focus の人の最後の場所）を真ん中に置く
  useEffect(() => {
    const el = scroller.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const t = travellers.find((p) => p.slug === focus);
    const at = t ? (t.stops.at(-1) ?? t.home) : project(52, 8);
    el.scrollLeft = (at.x / MAP_W) * el.scrollWidth - el.clientWidth / 2;
  }, [focus, travellers]);

  const chosen = travellers.find((p) => p.slug === active);

  return (
    <div onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
    <div ref={scroller} className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <div className="relative min-w-[760px]" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
          {PARALLELS.map((lat) => {
            const y = project(lat, 0).y;
            return (
              <g key={lat}>
                <line x1={0} x2={MAP_W} y1={y} y2={y} stroke={INK} strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="1 4" vectorEffect="non-scaling-stroke" />
                <text x={4} y={y - 3} fontSize={7} letterSpacing={1.2} fill={MUTE} style={{ fontFamily: SERIF }}>{`${lat}° N`}</text>
              </g>
            );
          })}
          {/* 陸は地図の端で四角く切れるので、四方の端を紙の色へ溶かす */}
          <defs>
            <linearGradient id="tm-fade-x" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.07" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.93" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="tm-fade-y" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.12" stopColor="#fff" stopOpacity="1" />
              <stop offset="0.86" stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <mask id="tm-mask-x"><rect width={MAP_W} height={MAP_H} fill="url(#tm-fade-x)" /></mask>
            <mask id="tm-mask-y"><rect width={MAP_W} height={MAP_H} fill="url(#tm-fade-y)" /></mask>
          </defs>
          <g mask="url(#tm-mask-y)">
            <g mask="url(#tm-mask-x)">
              <path d={LAND_PATH} fill={LAND} />
            </g>
          </g>
          {travellers.map((p) => {
            const pts = [p.home, ...p.stops];
            if (pts.length < 2) return null;
            const on = lit === p.slug;
            return (
              <polyline key={p.slug} points={pts.map((s) => `${s.x},${s.y}`).join(' ')} fill="none" stroke={INK}
                strokeOpacity={lit ? (on ? 0.85 : 0.07) : 0.28} strokeWidth={on ? 1.1 : 0.8} strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke" style={{ transition: 'stroke-opacity 300ms' }} />
            );
          })}
          {travellers.flatMap((p) =>
            [p.home, ...p.stops.slice(0, -1)].map((s, k) => (
              <circle key={`${p.slug}-${k}`} cx={s.x} cy={s.y} r={1.8} fill={k === 0 ? 'none' : INK} stroke={INK} strokeWidth={0.7}
                opacity={lit && lit !== p.slug ? 0.12 : 0.55} vectorEffect="non-scaling-stroke" />
            )),
          )}
        </svg>

        {travellers.map((p, k) => {
          const last = p.stops.at(-1);
          const at = last ?? p.home;
          const on = lit === p.slug;
          const open = active === p.slug; // 札は、乗せた・触った時だけ（人のページで最初から開くと、狭い画面で端からはみ出す）
          const dim = !!lit && !on;
          const where = last ? [last.city, last.month].filter(Boolean).join(' · ') : p.home.city;
          const href = `/${locale}/latitude/people/${p.slug}`;
          return (
            <div key={p.slug} className="absolute" style={{ left: pct(at.x, MAP_W), top: pct(at.y, MAP_H), zIndex: on ? 20 : 10 }}>
              <Link
                href={href}
                aria-label={`${p.name} — ${last ? `last seen in ${where}` : `at home in ${where}`}`}
                className="group absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center"
                onPointerEnter={(e) => e.pointerType === 'mouse' && show(p.slug, e.currentTarget)}
                onFocus={(e) => show(p.slug, e.currentTarget)}
                onClick={(e) => {
                  // 指で触った時は、1回目で札を出し、2回目でページへ
                  if (active !== p.slug && !window.matchMedia('(hover: hover)').matches) {
                    e.preventDefault();
                    show(p.slug, e.currentTarget);
                  }
                }}
                style={{ opacity: dim ? 0.25 : 1, transition: 'opacity 300ms' }}
              >
                <span className="absolute h-3 w-3 rounded-full motion-safe:animate-ping" style={{ background: INK, opacity: 0.35, animationDuration: '2.4s', animationDelay: `${k * 0.4}s` }} />
                <span className="relative h-[7px] w-[7px] rounded-full" style={{ background: INK }} />
              </Link>
              <span
                className={`pointer-events-none absolute top-[-6px] whitespace-nowrap text-[9px] uppercase tracking-[0.3em] transition-opacity duration-300 ${at.x / MAP_W > 0.7 ? 'right-3' : 'left-3'} ${open ? 'md:invisible' : ''}`}
                style={{ color: INK, opacity: dim ? 0.2 : 0.8 }}
              >
                {p.name}
              </span>
              {open && (
                <div className={`absolute top-[-30px] hidden w-max md:block ${flip ? 'right-4' : 'left-4'}`}>
                  <Card p={p} locale={locale} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {/* 狭い画面では、札を地図の上に浮かべず、地図の下に出す（左右どちらに出しても端で切れるため） */}
    <div className="mt-4 min-h-[60px] px-4 md:hidden">{chosen && <Card p={chosen} locale={locale} />}</div>
    </div>
  );
}

function Card({ p, locale }: { p: MapTraveller; locale: string }) {
  const last = p.stops.at(-1);
  const where = last ? [last.city, last.month].filter(Boolean).join(' · ') : p.home.city;
  return (
    <Link href={`/${locale}/latitude/people/${p.slug}`} className="inline-flex w-max items-center gap-3 whitespace-nowrap py-2 pl-2 pr-5 shadow-[0_6px_24px_rgba(30,29,27,0.12)]"
      style={{ background: '#faf8f4', color: INK }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/latitude/people/${p.slug}.jpg`} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
      <span className="flex flex-col">
        <span className="text-[20px] leading-none" style={{ fontFamily: SERIF }}>{p.name}</span>
        <span className="mt-1.5 text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          {locale === 'ja' ? (last ? '最後にいた所' : '家') : last ? 'Last seen' : 'At home'}&nbsp;&nbsp;·&nbsp;&nbsp;{where}
        </span>
      </span>
    </Link>
  );
}
