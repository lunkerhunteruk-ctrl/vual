'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LAND_PATH, MAP_H, MAP_W } from '@/lib/latitude-map';
import type { PlaceCountry } from '@/lib/latitude-places-index';

// 2026-11-11 試作：「場所から探す」の地図（/latitude/places）。
// 世界の地図（一覧ページの「Where they are」＝TravellerMap と同じ図法・同じ色）に国の点。国を押すと、その国へなめらかに寄り、
// 街の点・街の名前・緯度・その街の号の表紙の小さな丸が出る。街を押すと街の案内（/latitude/places/<街>）へ。
// 寄った時の細かい国の形は public/latitude/placesmap.json（Natural Earth 50m。scripts/latitude-places-map.py）を、開いてから読む。
// マウスのある画面では、点に乗せると少し大きくなり名前が出る（金沢の店の地図と同じ）。スマホは押して寄る。
// 号がまだ無い街（upcoming）は白抜きの点と「これから」。いまは lib/latitude-places-index.ts の SHOW_UPCOMING で出していない。

type Geo = {
  countries: Record<string, { view: [number, number, number, number]; d: string; inset?: { box: [number, number, number, number]; d: string } }>;
  context: string;
};
type View = { x: number; y: number; w: number };
type Anim = { from: View; to: View; t0: number; dur: number };

const INK = '#1e1d1b';
const MUTE = '#78746c';
const PAPER = '#f2eee7';
const LAND = '#e3ddd1';
const LAND_ON = '#d8cfbf'; // 街の案内がある国
const EDGE = '#aca8a0';
const RED = '#7a241e'; // 号の動く地図の道すじの赤
const LINE = 'rgba(30,29,27,0.14)';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const SC = 8.087396; // lib/latitude-map.ts と同じ（緯度1度の高さ）
const PARALLELS = [20, 30, 40, 50, 60, 70];
const HALO = `0 0 3px ${PAPER}, 0 0 3px ${PAPER}, 0 0 3px ${PAPER}`;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function viewAt(a: Anim, now: number, r: number): View {
  const t = a.dur > 0 ? clamp((now - a.t0) / a.dur) : 1;
  if (t >= 1) return a.to;
  const e = ease(t);
  const { from, to } = a;
  const c0 = { x: from.x + from.w / 2, y: from.y + (from.w * r) / 2 };
  const c1 = { x: to.x + to.w / 2, y: to.y + (to.w * r) / 2 };
  let w = from.w * Math.pow(to.w / from.w, e);
  const mid = Math.sqrt(from.w * to.w);
  const need = Math.max(Math.abs(c1.x - c0.x), Math.abs(c1.y - c0.y) / r) + Math.max(from.w, to.w) * 0.4;
  if (need > mid) w *= Math.pow(need / mid, Math.sin(Math.PI * e));
  return { x: c0.x + (c1.x - c0.x) * e - w / 2, y: c0.y + (c1.y - c0.y) * e - (w * r) / 2, w };
}
function duration(a: View, b: View, r: number) {
  const zoom = Math.abs(Math.log2(b.w / a.w));
  const d = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), (a.y + (a.w * r) / 2 - (b.y + (b.w * r) / 2)) / r) / Math.max(a.w, b.w);
  return clamp(800 + 140 * zoom + 220 * Math.min(d, 2), 800, 1500);
}
// 箱（地図の単位）を、余白（px）を取って枠に収める
function fit(box: [number, number, number, number], W: number, H: number, pad: { t: number; r: number; b: number; l: number }): View {
  const [bx, by, bw, bh] = box;
  const w = Math.max((bw * W) / Math.max(W - pad.l - pad.r, 40), (bh * W) / Math.max(H - pad.t - pad.b, 40));
  const k = W / w; // px / 単位
  const cx = bx + bw / 2 - ((pad.l - pad.r) / 2) / k;
  const cy = by + bh / 2 - ((pad.t - pad.b) / 2) / k;
  return { x: cx - w / 2, y: cy - (w * (H / W)) / 2, w };
}

export default function PlacesMap({ countries, locale, src }: { countries: PlaceCountry[]; locale: string; src: string }) {
  const ja = locale === 'ja';
  const [geo, setGeo] = useState<Geo | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anim, setAnim] = useState<Anim | null>(null);
  const [now, setNow] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(src).then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d) setGeo(d); }).catch(() => {});
    return () => { live = false; };
  }, [src]);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize((p) => (p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const r = size.w ? size.h / size.w : MAP_H / MAP_W;
  const wide = size.w >= 640;

  // 国の点：その国の街の位置のまん中
  const centre = (c: PlaceCountry) => ({
    x: c.cities.reduce((s, q) => s + q.x, 0) / c.cities.length,
    y: c.cities.reduce((s, q) => s + q.y, 0) / c.cities.length,
  });

  // 世界の範囲：街のある所がみな入る範囲（狭い画面では、それより広く引かない）
  const worldView = useCallback((): View => {
    if (!size.w) return { x: 0, y: 0, w: MAP_W };
    const xs = countries.flatMap((c) => c.cities.map((q) => q.x));
    const ys = countries.flatMap((c) => c.cities.map((q) => q.y));
    if (!xs.length) return { x: 0, y: 0, w: MAP_W };
    const x0 = Math.min(...xs) - 40, x1 = Math.max(...xs) + 40, y0 = Math.min(...ys) - 40, y1 = Math.max(...ys) + 40;
    const v = fit([x0, y0, x1 - x0, y1 - y0], size.w, size.h, { t: 24, r: 24, b: 24, l: 24 });
    if (v.w <= MAP_W) return v;
    return { x: 0, y: (MAP_H - MAP_W * r) / 2, w: MAP_W };
  }, [countries, size.w, size.h, r]);

  const countryView = useCallback((code: string): View => {
    const c = countries.find((q) => q.code === code);
    if (!c || !size.w) return worldView();
    const g = geo?.countries[code];
    let b: [number, number, number, number];
    if (g) {
      b = g.view;
    } else {
      const xs = c.cities.map((q) => q.x), ys = c.cities.map((q) => q.y);
      b = [Math.min(...xs) - 30, Math.min(...ys) - 30, Math.max(...xs) - Math.min(...xs) + 60, Math.max(...ys) - Math.min(...ys) + 60];
    }
    // 上は「← 世界」、右は街の名前の分を空ける
    return fit(b, size.w, size.h, { t: 52, r: wide ? 120 : 40, b: 20, l: 20 });
  }, [countries, geo, size.w, size.h, wide, worldView]);

  const target = useCallback((code: string | null) => (code ? countryView(code) : worldView()), [countryView, worldView]);
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; });
  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; });
  // 形が届いた時・大きさが変わった時は、いまの所へ合わせ直す（動きなし）
  useEffect(() => {
    if (!size.w) return;
    const to = targetRef.current(selRef.current);
    setAnim({ from: to, to, t0: 0, dur: 0 });
  }, [geo, size.w, size.h]);

  const animating = !!anim && now < anim.t0 + anim.dur;
  const view = anim ? viewAt(anim, now, r) : worldView();

  const goTo = (code: string | null) => {
    const t = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = anim ? viewAt(anim, t, r) : worldView();
    const to = target(code);
    setAnim({ from, to, t0: t, dur: still ? 0 : duration(from, to, r) });
    setSel(code);
    setNow(t);
  };
  const goRef = useRef(goTo);
  useEffect(() => { goRef.current = goTo; });
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating, anim]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goRef.current(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const h = view.w * r;
  const zoom = MAP_W / view.w;
  const detail = clamp((zoom - 2.2) / 2); // 寄るほど、細かい国の形に入れ替える
  const ready = size.w > 0;
  const toScreen = (x: number, y: number) => ({ sx: ((x - view.x) / view.w) * size.w, sy: ((y - view.y) / h) * size.h });
  const showCities = !!sel && (!animating || (anim ? (now - anim.t0) / anim.dur > 0.55 : true));

  // 国の点（世界の範囲の時だけ）。近い国は、画面の上で重ならないよう少し押し合わせる
  const cdots = countries.map((c) => {
    const m = centre(c);
    const s = toScreen(m.x, m.y);
    return { c, x: s.sx, y: s.sy };
  });
  for (let it = 0; it < 6; it++) {
    for (let i = 0; i < cdots.length; i++) for (let j = i + 1; j < cdots.length; j++) {
      const a = cdots[i], b = cdots[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let dd = Math.hypot(dx, dy);
      if (dd >= 22) continue;
      if (dd < 0.01) { dx = 1; dy = 0; dd = 1; }
      const push = (22 - dd) / 2;
      a.x -= (dx / dd) * push; a.y -= (dy / dd) * push; b.x += (dx / dd) * push; b.y += (dy / dd) * push;
    }
  }
  const selC = countries.find((c) => c.code === sel);

  return (
    <div>
      {/* 国の名前の並び（押すとその国へ。狭い画面で点を押しにくい時のため） */}
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.28em]">
        {countries.map((c) => (
          <li key={c.code}>
            <button type="button" onClick={() => goTo(sel === c.code ? null : c.code)} aria-pressed={sel === c.code}
              className="cursor-pointer underline-offset-4 hover:underline" style={{ color: sel === c.code ? INK : MUTE, borderBottom: sel === c.code ? `1px solid ${INK}` : '1px solid transparent' }}>
              {ja ? c.name.ja : c.name.en}
            </button>
          </li>
        ))}
      </ul>
      <div ref={box} className="relative aspect-square w-full overflow-hidden md:aspect-[2/1]"
        style={{ background: PAPER, border: `1px solid ${LINE}`, maxHeight: '80vh', touchAction: 'pan-y' }}
        onClick={(e) => { if (sel && !(e.target as Element).closest('button, a')) goTo(null); }}>
        {ready && (
          <svg viewBox={`${view.x} ${view.y} ${view.w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {PARALLELS.map((lat) => (
              <line key={lat} x1={-200} x2={MAP_W + 200} y1={(73 - lat) * SC} y2={(73 - lat) * SC} stroke="rgba(30,29,27,0.09)" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={LAND_PATH} fill={LAND} opacity={1 - detail} />
            {geo && detail > 0 && (
              <g opacity={detail}>
                <path d={geo.context} fill={LAND} stroke={EDGE} strokeWidth={0.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {countries.map((c) => geo.countries[c.code] && (
                  <path key={c.code} d={geo.countries[c.code].d} fill={c.code === sel ? LAND_ON : LAND} stroke={EDGE} strokeWidth={c.code === sel ? 0.9 : 0.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                ))}
                {sel === 'JP' && geo.countries.JP?.inset && (
                  <g>
                    <rect x={geo.countries.JP.inset.box[0]} y={geo.countries.JP.inset.box[1]} width={geo.countries.JP.inset.box[2]} height={geo.countries.JP.inset.box[3]}
                      fill={PAPER} stroke={EDGE} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
                    <path d={geo.countries.JP.inset.d} fill={LAND_ON} stroke={EDGE} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
                  </g>
                )}
              </g>
            )}
          </svg>
        )}

        {/* 緯度の線の数字（左の端） */}
        {ready && PARALLELS.map((lat) => {
          const { sy } = toScreen(0, (73 - lat) * SC);
          if (sy < 14 || sy > size.h - 8) return null;
          return (
            <span key={lat} className="pointer-events-none absolute left-2 -translate-y-full pb-0.5 text-[9px] tracking-[0.2em]" style={{ top: sy, color: MUTE }}>
              {lat}° N
            </span>
          );
        })}

        {/* 国の点（世界の範囲の時） */}
        {ready && !sel && cdots.map(({ c, x, y }) => (
          <button key={c.code} type="button" onClick={(e) => { e.stopPropagation(); goTo(c.code); }}
            className="group absolute z-[1] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 hover:z-[3] focus-visible:z-[3]"
            style={{ left: x, top: y, opacity: animating ? 0 : 1, transition: 'opacity 200ms' }}
            aria-label={`${ja ? c.name.ja : c.name.en} · ${c.cities.map((q) => (ja ? q.nameJa : q.name)).join(', ')}`}>
            <span className="block h-3 w-3 rounded-full group-hover:scale-[1.4]" style={{ background: RED, boxShadow: `0 0 0 2px ${PAPER}`, transition: 'scale 180ms ease-out' }} />
            <span className="pointer-events-none absolute left-full top-1/2 ml-1 hidden -translate-y-1/2 whitespace-nowrap text-[13px] group-hover:block group-focus-visible:block"
              style={{ fontFamily: SERIF, color: INK, textShadow: HALO }}>
              {ja ? c.name.ja : c.name.en}
              <span className="ml-2 text-[9px] uppercase tracking-[0.25em]" style={{ fontFamily: 'inherit', color: MUTE }}>
                {c.cities.map((q) => (ja ? q.nameJa : q.name)).join(' · ')}
              </span>
            </span>
          </button>
        ))}

        {/* 街の点（国に寄った時）。押すと街の案内へ */}
        {ready && selC && showCities && selC.cities.map((q) => {
          const { sx, sy } = toScreen(q.x, q.y);
          const left = sx > size.w - 170;
          return (
            <Link key={q.slug} href={`/${locale}/latitude/places/${q.slug}`}
              className="group absolute z-[2] flex cursor-pointer items-center gap-2 hover:z-[3]"
              style={{ left: sx, top: sy, transform: `translate(${left ? 'calc(-100% + 7px)' : '-7px'}, -50%)`, flexDirection: left ? 'row-reverse' : 'row', animation: 'lat-fade 400ms ease-out' }}
              aria-label={ja ? `${q.nameJa}の案内（${q.latitude}）` : `${q.name} city guide (${q.latitude})`}>
              <span className="block h-[14px] w-[14px] shrink-0 rounded-full group-hover:scale-[1.4]"
                style={{ background: q.upcoming ? PAPER : RED, border: q.upcoming ? `1.5px solid ${RED}` : undefined, boxShadow: `0 0 0 2px ${PAPER}`, transition: 'scale 180ms ease-out' }} />
              {q.issue && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.issue.cover} alt="" loading="lazy" className="block h-8 w-8 shrink-0 rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${PAPER}` }} />
              )}
              <span className="flex flex-col" style={{ textAlign: left ? 'right' : 'left' }}>
                <span className="whitespace-nowrap text-[15px] leading-tight group-hover:underline underline-offset-4" style={{ fontFamily: SERIF, color: INK, textShadow: HALO }}>
                  {ja ? q.nameJa : q.name}
                </span>
                <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE, textShadow: HALO }}>
                  {q.latitude}{q.upcoming ? (ja ? '・これから' : ' · Next') : ''}
                </span>
              </span>
            </Link>
          );
        })}

        {ready && sel && (
          <button type="button" onClick={() => goTo(null)} className="absolute left-3 top-3 z-[4] cursor-pointer text-[10px] uppercase tracking-[0.3em]"
            style={{ color: INK, background: PAPER, padding: '6px 10px', border: `1px solid ${LINE}` }}>
            {ja ? '← 世界' : '← World'}
          </button>
        )}
        <style>{'@keyframes lat-fade{from{opacity:0}to{opacity:1}}'}</style>
      </div>
      <p className="mt-3 text-right text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
        {ja ? '地図データ ' : 'Map data '}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: MUTE }}>Natural Earth</a>
      </p>
    </div>
  );
}
