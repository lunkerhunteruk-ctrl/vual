'use client';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LAND_PATH, MAP_H, MAP_W, project } from '@/lib/latitude-map';
import { latAsset } from '@/lib/latitude-assets';

// 2026-10-30 LATITUDE の旅人の地図。6人が最後にいた所に点がまたたき、マウスを乗せると顔・名前・街と月が出る。
// 細い点線はその人の旅の跡（住む街 → 1日ずつ、号の順）。focus を渡すと、その人だけを濃くする（人のページ用）。
// 緯度の線を薄く引き、左に「60° N」などを置く（LATITUDE の題が緯度なので）。
// 2026-11-10 ユーザー：人を押すと、地図がその人の旅の範囲へなめらかに寄り（拡大と移動を一緒に）、旅の跡が1区間ずつ描かれ、
// 着いた街の印と名前・月・緯度が順に灯る。「全体へ」・空いた所・Esc・同じ人をもう一度、で引いて全体へ戻る。
// 地図ライブラリは使わず、見えている範囲（view）を毎コマ計算して、SVG の viewBox と点の位置を動かす。
// 寄った後の街の印・名前は、その号のページへのリンク（さらに寄っても、この縮尺の陸の形では見える物が増えないため）。
// 人のページ（focus）では、最初からその人の旅に寄った形で出し、地図が画面に入った時に跡を描く。

export type MapStop = { x: number; y: number; city: string; month?: string; slug?: string; lat?: string };
export type MapTraveller = {
  slug: string;
  name: string;
  home: MapStop; // 住む街
  stops: MapStop[]; // 公開ずみの1日（古い順）
};

const INK = '#1e1d1b';
const MUTE = '#78746c';
const LAND = '#e3ddd1';
const PAPER = '#f2eee7';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const PARALLELS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]; // 5° おきの線は、寄った時だけ出す
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 見えている範囲（地図の単位。高さは、見えている枠の縦横比から決まる）
type View = { x: number; y: number; w: number };
// cw = 地図の中身の幅、vw = 見えている幅（px）。狭い画面では中身が 760px あり、横に流れる
type Layout = { cw: number; vw: number };
type Target = { kind: 'fit'; slug: string } | { kind: 'over'; scroll: number };
type Anim = { from: View | null; to: Target; t0: number; dur: number };
type Trail = { slug: string; t0: number | null; delay: number; seg: number; out?: number };

const DEFAULT_LAYOUT: Layout = { cw: 1100, vw: 1100 };
const LONG_AGO = -1e12; // 「とうに描き終わった」跡（人のページの最初・動きを減らす設定）
const FADE_OUT = 350;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const ratio = (L: Layout) => (L.cw * MAP_H) / (MAP_W * L.vw); // 見えている範囲の 高さ ÷ 幅
const overview = (L: Layout, scroll: number): View => ({ x: (scroll / L.cw) * MAP_W, y: 0, w: (L.vw / L.cw) * MAP_W });

// その人の旅（住む街と、公開ずみの街すべて）が、街の名前の余白ごと収まる範囲
function fitView(t: MapTraveller, L: Layout): View {
  const pts = [t.home, ...t.stops];
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const H = (L.cw * MAP_H) / MAP_W;
  // 余白（px）。上は、左上の札と右上の「全体へ」の下から使う
  const wide = L.vw >= 768;
  const mx = Math.min(170, L.vw * 0.2);
  const mt = wide ? 100 : 56;
  const mb = wide ? 44 : 28;
  const w = Math.max(
    ((x1 - x0) * L.vw) / Math.max(L.vw - 2 * mx, 40),
    ((y1 - y0) * L.vw) / Math.max(H - mt - mb, 40),
    (L.vw / L.cw) * (MAP_W / 8), // 寄りは全体の8倍まで
    L.vw / 9, // 1単位が 9px を超えるほどは寄らない（陸の形が粗く見える）
  );
  const k = L.vw / w;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - (mt + (H - mt - mb) / 2) / k, w };
}

function resolve(to: Target, L: Layout, travellers: MapTraveller[]): View {
  if (to.kind === 'over') return overview(L, to.scroll);
  const t = travellers.find((p) => p.slug === to.slug);
  return t ? fitView(t, L) : overview(L, 0);
}

// 拡大と移動を一緒に：中心は加減速しながら進み、幅は対数で変える。遠い所へ移る時は、途中で少し引いて両方が見えるようにする
function viewAt(a: Anim, now: number, L: Layout, travellers: MapTraveller[]): View {
  const to = resolve(a.to, L, travellers);
  const from = a.from ?? to;
  const t = a.dur > 0 ? clamp((now - a.t0) / a.dur) : 1;
  if (t >= 1) return to;
  const e = ease(t);
  const r = ratio(L);
  const c0 = { x: from.x + from.w / 2, y: from.y + (from.w * r) / 2 };
  const c1 = { x: to.x + to.w / 2, y: to.y + (to.w * r) / 2 };
  let w = from.w * Math.pow(to.w / from.w, e);
  const mid = Math.sqrt(from.w * to.w);
  const need = Math.min((L.vw / L.cw) * MAP_W, Math.max(Math.abs(c1.x - c0.x), Math.abs(c1.y - c0.y) / r) + Math.max(from.w, to.w) * 0.5);
  if (need > mid) w *= Math.pow(need / mid, Math.sin(Math.PI * e));
  const cx = c0.x + (c1.x - c0.x) * e;
  const cy = c0.y + (c1.y - c0.y) * e;
  return { x: cx - w / 2, y: cy - (w * r) / 2, w };
}

function duration(a: View, b: View, L: Layout) {
  const r = ratio(L);
  const zoom = Math.abs(Math.log2(b.w / a.w));
  const d = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), (a.y + (a.w * r) / 2 - (b.y + (b.w * r) / 2)) / r) / Math.max(a.w, b.w);
  return clamp(800 + 130 * zoom + 220 * Math.min(d, 2), 800, 1400);
}

// 見えている範囲 → 地図の中身全体に当てる viewBox（狭い画面では、横に流れる中身のまん中に見えている範囲を置く）
function camFor(v: View, L: Layout) {
  const w = (v.w * L.cw) / L.vw;
  return { x: v.x - ((L.cw - L.vw) / 2 / L.cw) * w, y: v.y, w, h: (w * MAP_H) / MAP_W };
}

const trailFor = (t: MapTraveller, t0: number | null, dur: number): Trail => ({
  slug: t.slug,
  t0,
  delay: Math.min(420, dur * 0.4), // 寄り始めてから少しして描き始める
  seg: t.stops.length ? Math.min(520, 1500 / t.stops.length) : 0,
});
const trailEnd = (tr: Trail | null, n: number) =>
  !tr || tr.t0 === null ? -Infinity : tr.out !== undefined ? tr.out + FADE_OUT : tr.t0 + tr.delay + n * tr.seg + 500;

export default function TravellerMap({ travellers, locale, focus }: { travellers: MapTraveller[]; locale: string; focus?: string }) {
  const ja = locale === 'ja';
  const focusT = travellers.find((p) => p.slug === focus) ?? null;
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);
  const [sel, setSel] = useState<string | null>(focusT?.slug ?? null);
  const [anim, setAnim] = useState<Anim | null>(focusT ? { from: null, to: { kind: 'fit', slug: focusT.slug }, t0: 0, dur: 0 } : null);
  const [trail, setTrail] = useState<Trail | null>(focusT ? trailFor(focusT, LONG_AGO, 0) : null);
  const [fading, setFading] = useState<Trail | null>(null); // 前の人の跡（薄れて消える）
  const [now, setNow] = useState(0);
  const [active, setActive] = useState<string | null>(null); // マウスを乗せている人
  const [flip, setFlip] = useState(false); // 見えている範囲の右寄りの点は、札を左に出す
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const wasEngaged = useRef(false);

  const stopsOf = (slug: string | undefined) => travellers.find((p) => p.slug === slug)?.stops.length ?? 0;
  const animating = !!anim && now < anim.t0 + anim.dur;
  const engaged = sel !== null || animating; // 寄っている、または動いている間は、地図の見え方をこちらで決める
  const running = animating || now < trailEnd(trail, stopsOf(trail?.slug)) || now < trailEnd(fading, stopsOf(fading?.slug));
  const view = engaged && anim ? viewAt(anim, now, layout, travellers) : null;
  const cam = view ? camFor(view, layout) : { x: 0, y: 0, w: MAP_W, h: MAP_H };
  const u = cam.w / MAP_W; // 地図の単位 → 画面で同じ大きさに見せるための倍率
  const zoom = 1 / u;
  const at = (x: number, y: number) => ({ left: `${((x - cam.x) / cam.w) * 100}%`, top: `${((y - cam.y) / cam.h) * 100}%` });

  const show = (slug: string, el: HTMLElement) => {
    const box = scroller.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setFlip(!!box && r.right + 360 > box.right); // 札の幅はおよそ 250〜340px（日本語の札は長い）
    setActive(slug);
  };

  // 押した時に、いまの見え方（動いている途中ならその途中）から次へ移る。ガクッとしないように、始まりは必ずいま見えている範囲
  const goTo = (slug: string | null) => {
    const t = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = anim && (sel !== null || t < anim.t0 + anim.dur) ? viewAt(anim, t, layout, travellers) : overview(layout, scroller.current?.scrollLeft ?? 0);
    const leaving = trail && trail.t0 !== null ? { ...trail, out: t } : null;
    if (slug) {
      const T = travellers.find((p) => p.slug === slug);
      if (!T) return;
      const dur = still ? 0 : duration(from, fitView(T, layout), layout);
      setAnim({ from, to: { kind: 'fit', slug }, t0: t, dur });
      setTrail(trailFor(T, still ? LONG_AGO : t, dur));
    } else {
      const c = ((from.x + from.w / 2) / MAP_W) * layout.cw;
      const scroll = clamp(c - layout.vw / 2, 0, Math.max(0, layout.cw - layout.vw));
      const to = overview(layout, scroll);
      setAnim({ from, to: { kind: 'over', scroll }, t0: t, dur: still ? 0 : duration(from, to, layout) });
      setTrail(null);
    }
    setFading(still ? null : leaving);
    setSel(slug);
    setActive(null);
    setNow(t);
  };
  const goToRef = useRef(goTo);
  useEffect(() => {
    goToRef.current = goTo;
  });

  // 大きさを測る（狭い画面では中身 760px・見えているのは画面の幅）。寄った先は大きさから毎回計算するので、回転しても合う
  useLayoutEffect(() => {
    const s = scroller.current;
    const c = content.current;
    if (!s || !c) return;
    const ro = new ResizeObserver(() => {
      if (!c.offsetWidth) return;
      setLayout((prev) => (prev.cw === c.offsetWidth && prev.vw === s.clientWidth ? prev : { cw: c.offsetWidth, vw: s.clientWidth }));
    });
    ro.observe(s);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // 寄っている間は横の流れを止め、中身のまん中を見せる（見えている範囲は viewBox の方で動かす）。全体へ戻り終えたら、戻った所に合わせて流れを戻す
  useLayoutEffect(() => {
    const s = scroller.current;
    if (!s) return;
    if (engaged) {
      const sc = (layout.cw - layout.vw) / 2;
      if (Math.abs(s.scrollLeft - sc) > 0.5) s.scrollLeft = sc;
    } else if (wasEngaged.current && anim?.to.kind === 'over') {
      s.scrollLeft = anim.to.scroll;
    }
    wasEngaged.current = engaged;
  });

  // 狭い画面では地図を横に流し、最初はヨーロッパを真ん中に置く（人のページは最初から寄っているので、ここでは動かさない）
  useEffect(() => {
    const el = scroller.current;
    if (!el || focusT || el.scrollWidth <= el.clientWidth) return;
    el.scrollLeft = (project(52, 8).x / MAP_W) * el.scrollWidth - el.clientWidth / 2;
  }, [focusT]);

  // 動いている間だけ、毎コマ描き直す
  useEffect(() => {
    if (!running) return;
    let id = requestAnimationFrame(function tick() {
      setNow(performance.now());
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);

  // Esc で全体へ
  useEffect(() => {
    if (sel === null) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && goToRef.current(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel]);

  // 人のページ：地図が最初は画面の外なら、跡を隠しておき、画面に入った時に描く（最初から見えている時は描いたまま）
  useEffect(() => {
    const el = wrap.current;
    if (!el || !focus || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let first = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (first) {
          first = false;
          if (e.intersectionRatio > 0) return io.disconnect();
          setTrail((tr) => (tr && tr.slug === focus && tr.t0 === LONG_AGO ? { ...tr, t0: null, delay: 150 } : tr));
          return;
        }
        if (e.intersectionRatio >= 0.35) {
          const t = performance.now();
          setTrail((tr) => (tr && tr.t0 === null ? { ...tr, t0: t } : tr));
          setNow(t);
          io.disconnect();
        }
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [focus]);

  const chosen = travellers.find((p) => p.slug === sel) ?? null;
  const lit = active ?? sel ?? focus ?? null;
  const visLeft = view ? view.x : 0;
  const edge = Math.min(1, u * 1.2);
  const dots = travellers.map((p) => ({ ...(p.stops.at(-1) ?? p.home), name: p.slug === sel ? '' : p.name })); // 街の名前を、ほかの人の点と名前に重ねない

  return (
    <div onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
      <div
        ref={wrap}
        className="relative"
        onClick={(e) => {
          // 寄っている時に、地図の空いた所を押すと全体へ
          if (sel !== null && !(e.target as Element).closest('a,button')) goTo(null);
        }}
      >
        <div ref={scroller} style={{ scrollbarWidth: 'none', overflowX: engaged ? 'hidden' : 'auto', overflowY: 'hidden' }}>
          <div ref={content} className="relative min-w-[760px] overflow-hidden" style={{ aspectRatio: `${MAP_W} / ${MAP_H}` }}>
            <svg viewBox={`${cam.x} ${cam.y} ${cam.w} ${cam.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
              {PARALLELS.map((lat) => {
                const y = project(lat, 0).y;
                const minor = lat % 10 !== 0;
                const o = minor ? clamp((zoom - 2) / 1.5) : 1;
                if (o <= 0) return null;
                return (
                  <g key={lat} opacity={o}>
                    <line x1={-MAP_W} x2={2 * MAP_W} y1={y} y2={y} stroke={INK} strokeOpacity={minor ? 0.08 : 0.12} strokeWidth={0.5} strokeDasharray="1 4" vectorEffect="non-scaling-stroke" />
                    <text x={visLeft + 4 * u} y={y - 3 * u} fontSize={7 * u} letterSpacing={1.2 * u} fill={MUTE} style={{ fontFamily: SERIF }}>{`${lat}° N`}</text>
                  </g>
                );
              })}
              {/* 陸は地図の端で四角く切れるので、四方の端を紙の色へ溶かす（寄った時は、溶かす幅を画面の上で同じくらいに細める。日本は地図の右端に近い） */}
              <defs>
                <linearGradient id="tm-fade-x" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset={0.07 * edge} stopColor="#fff" stopOpacity="1" />
                  <stop offset={1 - 0.07 * edge} stopColor="#fff" stopOpacity="1" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="tm-fade-y" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset={0.12 * edge} stopColor="#fff" stopOpacity="1" />
                  <stop offset={1 - 0.14 * edge} stopColor="#fff" stopOpacity="1" />
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
                const drawing = trail?.slug === p.slug; // 描いている跡と重ねない（描く前の隠れている間も出さない）
                return (
                  <polyline key={p.slug} points={pts.map((s) => `${s.x},${s.y}`).join(' ')} fill="none" stroke={INK}
                    strokeOpacity={drawing ? 0 : lit ? (on ? 0.85 : 0.07) : 0.28} strokeWidth={on ? 1.1 : 0.8} strokeDasharray="2 3"
                    vectorEffect="non-scaling-stroke" style={{ transition: 'stroke-opacity 300ms' }} />
                );
              })}
              {travellers.flatMap((p) =>
                [p.home, ...p.stops.slice(0, -1)].map((s, k) => (
                  <circle key={`${p.slug}-${k}`} cx={s.x} cy={s.y} r={1.8 * u} fill={k === 0 ? 'none' : INK} stroke={INK} strokeWidth={0.7}
                    opacity={trail?.slug === p.slug ? 0 : lit && lit !== p.slug ? 0.12 : 0.55} vectorEffect="non-scaling-stroke" />
                )),
              )}
              {[fading, trail].map((tr) => tr && <TrailLines key={`${tr.slug}-${tr.out ?? 'on'}`} tr={tr} t={travellers.find((p) => p.slug === tr.slug)} now={now} u={u} />)}
            </svg>

            {/* 旅の跡の街の印と名前（寄った時）。号の街は、その号のページへのリンク */}
            {[fading, trail].map((tr) => {
              const T = tr && travellers.find((p) => p.slug === tr.slug);
              if (!tr || !T || tr.t0 === null) return null;
              const pts = [T.home, ...T.stops];
              const p = (now - tr.t0 - tr.delay) / (tr.seg || 1);
              const out = tr.out !== undefined ? 1 - clamp((now - tr.out) / FADE_OUT) : 1;
              if (out <= 0) return null;
              const months = pts.map((s) => (s.month ? (ja ? `${MONTHS.indexOf(s.month) + 1}月` : s.month) : ''));
              const subs = pts.map((s, j) => [j === 0 ? (ja ? '家' : 'Home') : months[j], s.lat].filter(Boolean).join(' · '));
              const sides = labelSides(pts, subs, dots, fitView(T, layout), layout);
              return pts.map((s, j) => {
                const a = clamp((p - j + 0.3) / 0.35) * out;
                if (a <= 0) return null;
                const isLast = j === pts.length - 1;
                const month = months[j];
                const href = s.slug ? `/${locale}/latitude/${s.slug}` : undefined;
                const side = sides[j];
                const label = (
                  <>
                    <span className="block text-[13px] leading-none md:text-[15px]" style={{ fontFamily: SERIF }}>{s.city}</span>
                    <span className="mt-1 block text-[8px] uppercase tracking-[0.25em] md:text-[9px]" style={{ color: MUTE }}>{subs[j]}</span>
                  </>
                );
                const labelStyle = { color: INK, opacity: a, textShadow: `0 0 4px ${PAPER}, 0 0 2px ${PAPER}`, transform: `translateY(${(1 - a) * 4}px)` };
                const labelClass = `absolute whitespace-nowrap ${side.x === 'right' ? 'left-[10px]' : 'right-[10px] text-right'} ${side.y === 'mid' ? 'top-[-13px]' : side.y === 'below' ? 'top-[6px]' : 'bottom-[6px]'}`;
                return (
                  <div key={`${tr.slug}-${tr.out ?? 'on'}-${j}`} className="absolute" style={{ ...at(s.x, s.y), zIndex: 15, pointerEvents: tr.out !== undefined ? 'none' : undefined }}>
                    {/* 最後の街には、その人の点（またたく）がある。それ以外に印を置く */}
                    {!isLast &&
                      (href ? (
                        <Link href={href} aria-label={`${s.city}${month ? `, ${month}` : ''}`} className="absolute -left-3 -top-3 flex h-6 w-6 items-center justify-center" style={{ opacity: a }}>
                          <span className="h-[6px] w-[6px] rounded-full" style={{ background: INK }} />
                        </Link>
                      ) : (
                        <span className="absolute -left-[4px] -top-[4px] h-2 w-2 rounded-full border" style={{ borderColor: INK, opacity: a }} />
                      ))}
                    {href ? (
                      <Link href={href} className={`${labelClass} underline-offset-4 hover:underline`} style={labelStyle}>{label}</Link>
                    ) : (
                      <span className={`pointer-events-none ${labelClass}`} style={labelStyle}>{label}</span>
                    )}
                  </div>
                );
              });
            })}

            {travellers.map((p, k) => {
              const last = p.stops.at(-1);
              const pos = last ?? p.home;
              const on = lit === p.slug;
              const open = active === p.slug && !engaged; // 札は、全体で止まっている時に乗せた時だけ。動いている途中で点がマウスの下を通っても出さない（人のページで最初から開くと、狭い画面で端からはみ出す）
              const dim = !!lit && !on;
              const where = last ? [last.city, last.month].filter(Boolean).join(' · ') : p.home.city;
              const picked = sel === p.slug;
              return (
                <div key={p.slug} className="absolute" style={{ ...at(pos.x, pos.y), zIndex: on ? 20 : 16 }}>
                  <button
                    type="button"
                    data-traveller={p.slug}
                    aria-pressed={picked}
                    aria-label={`${p.name} — ${last ? `last seen in ${where}` : `at home in ${where}`}. ${picked ? (ja ? '全体へ戻る' : 'Back to the whole map') : ja ? '旅の跡に寄る' : 'Follow her journey'}`}
                    className="group absolute -left-3 -top-3 flex h-6 w-6 cursor-pointer items-center justify-center"
                    onPointerEnter={(e) => e.pointerType === 'mouse' && show(p.slug, e.currentTarget)}
                    onFocus={(e) => show(p.slug, e.currentTarget)}
                    onBlur={() => setActive((a) => (a === p.slug ? null : a))}
                    onClick={() => goTo(picked ? null : p.slug)}
                    style={{ opacity: dim ? 0.25 : 1, transition: 'opacity 300ms' }}
                  >
                    <span className="absolute h-3 w-3 rounded-full motion-safe:animate-ping" style={{ background: INK, opacity: 0.35, animationDuration: '2.4s', animationDelay: `${k * 0.4}s` }} />
                    <span className="relative h-[7px] w-[7px] rounded-full" style={{ background: INK }} />
                  </button>
                  {/* 名前。寄った人は、街の名前と札で分かるので隠す */}
                  <span
                    className={`pointer-events-none absolute top-[-6px] whitespace-nowrap text-[9px] uppercase tracking-[0.3em] transition-opacity duration-300 ${(pos.x - cam.x) / cam.w > 0.7 ? 'right-3' : 'left-3'} ${open ? 'md:invisible' : ''}`}
                    style={{ color: INK, opacity: trail?.slug === p.slug && sel === p.slug ? 0 : dim ? 0.2 : 0.8 }}
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

        {/* 寄っている時：左上にその人の札（広い画面）、右上に「全体へ」 */}
        {chosen && chosen.slug !== focus && (
          <div className="absolute left-4 top-4 z-30 hidden md:block">
            <Card p={chosen} locale={locale} />
          </div>
        )}
        {sel !== null && (
          <button
            type="button"
            onClick={() => goTo(null)}
            className="absolute right-3 top-3 z-30 cursor-pointer border px-3 py-2 text-[10px] uppercase tracking-[0.3em] md:right-4 md:top-4"
            style={{ background: `${PAPER}e6`, borderColor: 'rgba(30,29,27,0.25)', color: INK }}
          >
            {ja ? '全体へ' : 'Whole map'}
          </button>
        )}
      </div>
      {/* 狭い画面では、札を地図の上に浮かべず、地図の下に出す（左右どちらに出しても端で切れるため） */}
      <div className="mt-4 min-h-[60px] px-4 md:hidden">
        {chosen && chosen.slug !== focus ? (
          <Card p={chosen} locale={locale} />
        ) : sel === null ? (
          <p className="pt-3 text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
            {ja ? '点を押すと、その人の旅をたどります' : 'Tap a name to follow her journey'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// 跡の点線を1区間ずつ伸ばす（点線は始まりに揃うので、伸ばしても点が流れない）。描いている先にペン先の点
function TrailLines({ tr, t, now, u }: { tr: Trail; t?: MapTraveller; now: number; u: number }) {
  if (!t || tr.t0 === null) return null;
  const pts = [t.home, ...t.stops];
  const p = (now - tr.t0 - tr.delay) / (tr.seg || 1);
  const out = tr.out !== undefined ? 1 - clamp((now - tr.out) / FADE_OUT) : 1;
  if (out <= 0) return null;
  const n = pts.length - 1;
  const k = Math.floor(clamp(p, 0, n - 1e-6));
  const f = clamp(p - k);
  const tip = n > 0 && p > 0 && p < n ? { x: pts[k].x + (pts[k + 1].x - pts[k].x) * f, y: pts[k].y + (pts[k + 1].y - pts[k].y) * f } : null;
  return (
    <g opacity={out}>
      {pts.slice(0, -1).map((a, i) => {
        const b = pts[i + 1];
        const g = clamp(p - i);
        if (g <= 0) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * g} y2={a.y + (b.y - a.y) * g} stroke={INK} strokeOpacity={0.85} strokeWidth={1.2} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />;
      })}
      {tip && <circle cx={tip.x} cy={tip.y} r={2.2 * u} fill={INK} />}
    </g>
  );
}

// 街の名前を置く側を、寄り終えた時の画面の位置で決める（近い街どうしで重ならないように。動きの途中で入れ替わらない）
type Side = { x: 'right' | 'left'; y: 'mid' | 'below' | 'above' };
function labelSides(pts: MapStop[], subs: string[], others: { x: number; y: number; name: string }[], v: View, L: Layout): Side[] {
  const k = L.vw / v.w;
  const px = (s: { x: number; y: number }) => ({ x: (s.x - v.x) * k, y: (s.y - v.y) * k });
  const P = pts.map(px);
  // よける物：旅の街・ほかの人の点・跡の線（線は細かく点に分けて）
  const avoid = [...P, ...others.map(px)];
  for (let i = 0; i + 1 < P.length; i++)
    for (let q = 1; q < 16; q++) avoid.push({ x: P[i].x + ((P[i + 1].x - P[i].x) * q) / 16, y: P[i].y + ((P[i + 1].y - P[i].y) * q) / 16 });
  // 左上の札（広い画面）と右上の「全体へ」の場所は、はじめから埋まっている物として扱う
  const boxes: { x0: number; y0: number; x1: number; y1: number }[] = [
    { x0: L.vw - 150, y0: 0, x1: L.vw, y1: 64 },
    ...(L.vw >= 768 ? [{ x0: 0, y0: 0, x1: 380, y1: 92 }] : []),
    ...others.filter((o) => o.name).map((o) => { const q = px(o); return { x0: q.x + 10, y0: q.y - 8, x1: q.x + 14 + o.name.length * 10, y1: q.y + 6 }; }),
  ];
  // 重なりの数（ほかの名前・札と重なるのは重く数える）。どこも空いていない時は、いちばん少ない所に置く
  const hits = (b: (typeof boxes)[number]) =>
    boxes.filter((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0).length * 8 +
    avoid.filter((q) => q.x > b.x0 - 4 && q.x < b.x1 + 4 && q.y > b.y0 - 4 && q.y < b.y1 + 4).length;
  const cands: Side[] = [
    { x: 'right', y: 'mid' },
    { x: 'left', y: 'mid' },
    { x: 'right', y: 'below' },
    { x: 'right', y: 'above' },
    { x: 'left', y: 'below' },
    { x: 'left', y: 'above' },
  ];
  return pts.map((s, j) => {
    const w = Math.max(s.city.length * 8.5, subs[j].length * 8.5) + 4; // 下の小さな字は字間が広い
    const h = 28;
    const box = (c: Side) => {
      const x0 = c.x === 'right' ? P[j].x + 10 : P[j].x - 10 - w;
      const y0 = c.y === 'mid' ? P[j].y - 13 : c.y === 'below' ? P[j].y + 6 : P[j].y - 6 - h;
      return { x0, y0, x1: x0 + w, y1: y0 + h };
    };
    const inside = (b: ReturnType<typeof box>) => b.x0 > 4 && b.x1 < L.vw - 4 && b.y0 > 4 && b.y1 < (L.cw * MAP_H) / MAP_W - 4;
    const ok = cands.filter((c) => inside(box(c)));
    const pick = ok.length ? ok.reduce((best, c) => (hits(box(c)) < hits(box(best)) ? c : best)) : cands[0];
    boxes.push(box(pick));
    return pick;
  });
}

function Card({ p, locale }: { p: MapTraveller; locale: string }) {
  const last = p.stops.at(-1);
  const where = last ? [last.city, last.month].filter(Boolean).join(' · ') : p.home.city;
  return (
    <Link href={`/${locale}/latitude/people/${p.slug}`} className="inline-flex w-max items-center gap-3 whitespace-nowrap py-2 pl-2 pr-5 shadow-[0_6px_24px_rgba(30,29,27,0.12)]"
      style={{ background: '#faf8f4', color: INK }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={latAsset(`people/${p.slug}.jpg`)} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover" />
      <span className="flex flex-col">
        <span className="text-[20px] leading-none" style={{ fontFamily: SERIF }}>{p.name}</span>
        <span className="mt-1.5 text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          {locale === 'ja' ? (last ? '最後にいた所' : '家') : last ? 'Last seen' : 'At home'}&nbsp;&nbsp;·&nbsp;&nbsp;{where}
        </span>
      </span>
    </Link>
  );
}
