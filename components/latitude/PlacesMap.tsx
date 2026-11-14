'use client';
import Link from 'next/link';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LAND_PATH, MAP_H, MAP_W, project } from '@/lib/latitude-map';
import type { PlaceCity, PlaceCountry } from '@/lib/latitude-places-index';
import { REGIONS, type PlaceRegion } from '@/lib/latitude-regions';
import HScroller from '@/components/latitude/HScroller';
import type { HiddenDot } from '@/lib/latitude-hidden';
import { Dots, Strip } from '@/components/latitude/HiddenBits';

// 2026-11-11 試作：「場所から探す」の地図（/latitude/places）。
// 世界の地図（一覧ページの「Where they are」＝TravellerMap と同じ図法・同じ色）に国の点。国を押すと、その国へなめらかに寄る。
// 寄った時の細かい国の形は public/latitude/placesmap.json（Natural Earth 50m。scripts/latitude-places-map.py）を、開いてから読む。
// マウスのある画面では、点に乗せると少し大きくなり名前が出る（金沢の店の地図と同じ）。スマホは押して寄る。
// 号がまだ無い街（upcoming）は白抜きの点と「これから」。いまは lib/latitude-places-index.ts の SHOW_UPCOMING で出していない。
//
// 2026-11-11 町が40〜50に増えても見やすいように、地方のある国（lib/latitude-regions.ts。いまは日本）は2段にする：
//  1. 国の段階：地方ごとの数字の丸（「九州 8」）。号のある町（旅人が1日を過ごした町）だけは、写真の丸＋名前のまま。
//     案内だけの町は数字の中。地方の町がみな号の町なら、その地方の数字の丸は出さない（本番の2町では今までどおりの見た目）。
//  2. 地方の段階：数字の丸を押すと、その地方へ寄り、町が小さな点と名前で全部出る。写真はマウスを重ねた時・押した時だけ。「← 日本」で戻る。
//  3段目（町の中）は作らない。町のページの店の地図がその役。
//  スマホは地図の下に、地方ごとの横に流れる一覧（地方の見出し＋町のカード）。
// 2026-11-11 世界の段階の国の点：マウスを重ねる（スマホは1回押す）と、点が少し大きくなり、その国の号の写真が丸く出る（国旗は使わない）。
//  写真はリールの途中の字の無いコマ（lib/latitude-places-index.ts の ISSUE_PHOTO_FRAME。丸はパソコン80px・スマホ64px）。
//  最初はいちばん新しい号（lib/latitude-places-index.ts の COUNTRY_PHOTO_PIN で国ごとに固定できる）。重ねたままなら1.5秒ごとに
//  ほかの号へふわっと切り替わる（号が1つの国は切り替えない）。横に「イギリス · 3つの号」。スマホはもう1回押すとその国へ寄る。
// 2026-11-14 穴場（lib/latitude-hidden.ts）：日本に寄った時、町とは色の違う点（苔の緑）で出す。地図の上の「訪ねる月」を選ぶと、
//  その月のおすすめ度（0〜5）で点が大きく・濃くなり、0 の月（行けない月）は消える。月を選んでいない時は、いちばん良い月の点で描く。
//  点を押すと、地図の下の端にカード（写真・その月のおすすめ度と理由・12か月の帯・1日のコースへ）。地方に寄った時は名前も出す。
// 試しの町：URL に ?preview=50 を付けた時だけ public/latitude/placesmap-preview-cities.json を読み、日本に足す（本番には出さない。ページは無い）。

type Inset = {
  box: [number, number, number, number];
  d: string;
  src?: [number, number, number, number]; // 元の範囲（西・南・東・北）。この中の町は枠の中へ移して描く
  move?: { from: [number, number]; o: [number, number]; k: number };
};
type Geo = {
  countries: Record<string, { view: [number, number, number, number]; d: string; inset?: Inset }>;
  context: string;
};
type View = { x: number; y: number; w: number };
type Anim = { from: View; to: View; t0: number; dur: number };
type Rect = { x: number; y: number; w: number; h: number };
type PreviewTown = { slug: string; name: string; nameJa: string; prefecture: string; prefectureJa: string; region: string; lat: number; lon: number };

const PREVIEW_SRC = '/latitude/placesmap-preview-cities.json';
const INK = '#1e1d1b';
const MUTE = '#78746c';
const PAPER = '#f2eee7';
const LAND = '#e3ddd1';
const LAND_ON = '#d8cfbf'; // 街の案内がある国
const EDGE = '#aca8a0';
const RED = '#7a241e'; // 号の動く地図の道すじの赤
const MOSS = '#4f6b3a'; // 2026-11-14 穴場の点（町の赤と見分ける）
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; // lib/latitude-hidden.ts と同じ（データごと読み込まないよう、ここにも置く）
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
// 字の幅の見当（px）。かな・漢字は字の大きさと同じ、英字はその半分強
const textW = (s: string, px: number) => [...s].reduce((w, ch) => w + (/[　-鿿＀-￯]/.test(ch) ? px : px * 0.56), 0);
const hit = (a: Rect, b: Rect, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

// 2026-11-13 ユーザー：号の町の印（写真の丸＋名前）が重ならないように（エディンバラとホーリー島、金沢と鳥取）。
// 点は動かさず、写真と名前の札だけを、決めた向き → 反対の向き → 上下にずらした所の順に、ほかの札・点とぶつからない所へ置く
type PinIn = { q: PlaceCity; sx: number; sy: number; prefLeft: boolean };
type PinOut = PinIn & { left: boolean; dy: number; rect: Rect };
function placePins(list: PinIn[], W: number, H: number, nameOf: (q: PlaceCity) => string, avoid: Rect[] = []): PinOut[] {
  const taken: Rect[] = [{ x: 0, y: 0, w: 130, h: 46 }, ...avoid, ...list.map((d) => ({ x: d.sx - 7, y: d.sy - 7, w: 14, h: 14 }))];
  const out: PinOut[] = [];
  for (const d of [...list].sort((a, b) => a.sy - b.sy)) {
    const w = 14 + 8 + (d.q.issue ? 40 : 0) + Math.max(textW(nameOf(d.q), 15), 64);
    const rectAt = (left: boolean, dy: number): Rect => ({ x: left ? d.sx + 7 - w : d.sx - 7, y: d.sy - 18 + dy, w, h: 36 });
    const sides = [d.prefLeft, !d.prefLeft];
    const cands: { left: boolean; dy: number }[] = [];
    for (const dy of [0, 26, -26, 42, -42, 60, -60]) for (const left of sides) cands.push({ left, dy });
    const ok = (c: { left: boolean; dy: number }) => {
      const r = rectAt(c.left, c.dy);
      if (r.x < 2 || r.x + r.w > W - 2 || r.y < 2 || r.y + r.h > H - 2) return false;
      return !taken.some((t) => !(t.x === d.sx - 7 && t.y === d.sy - 7) && hit(r, t, 2));
    };
    const pick = cands.find(ok) ?? { left: d.prefLeft, dy: 0 };
    const rect = rectAt(pick.left, pick.dy);
    taken.push(rect); out.push({ ...d, left: pick.left, dy: pick.dy, rect });
  }
  return out;
}

// initial：最初から寄っておく国（国のページ。世界地図を通らない）。worldHref があれば「← 世界」はそのページへのリンク。
// syncUrl：国へ寄った時に、アドレスを国のページ（/latitude/places/<国>）に合わせる（場所のページ）
export default function PlacesMap({ countries: given, locale, src, initial, worldHref, syncUrl, hidden, month: month0 }: {
  countries: PlaceCountry[]; locale: string; src: string; initial?: string; worldHref?: string; syncUrl?: boolean;
  hidden?: HiddenDot[]; month?: number;
}) {
  const ja = locale === 'ja';
  const [month, setMonth] = useState<number | null>(month0 ?? null); // 訪ねる月（null＝決めていない）
  const [card, setCard] = useState<string | null>(null); // カードを出している穴場
  const [geo, setGeo] = useState<Geo | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anim, setAnim] = useState<Anim | null>(null);
  const [now, setNow] = useState(0);
  const [sel, setSel] = useState<string | null>(initial ?? null);
  const [reg, setReg] = useState<string | null>(null); // 寄っている地方
  const [picked, setPicked] = useState<string | null>(null); // 押した町（試しの町はページが無いので、名前を強める）
  const [extra, setExtra] = useState<PlaceCity[]>([]);
  // 世界の段階で写真を出している国（hov）と、いま見せている号の番号（hovI）。seen は一度でも出した国（写真を読み込み始めた国）
  const [hov, setHov] = useState<string | null>(null);
  const [hovI, setHovI] = useState(0);
  const [lastHov, setLastHov] = useState<string | null>(null); // 離れた後も、消えていく間は同じ写真のまま

  const [seen, setSeen] = useState<string[]>([]);
  const loaded = useRef(new Set<string>());
  const lastPointer = useRef('mouse');
  const [hovTouch, setHovTouch] = useState(false); // 指で押して出した時だけ、写真の丸と名前も押せる（もう1回でその国へ）
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(src).then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d) setGeo(d); }).catch(() => {});
    return () => { live = false; };
  }, [src]);
  // 試しの町（?preview=50 の時だけ）
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '50') return;
    let live = true;
    fetch(PREVIEW_SRC).then((r) => (r.ok ? r.json() : null)).then((d: { cities: PreviewTown[] } | null) => {
      if (!live || !d) return;
      setExtra(d.cities.map((t) => ({
        slug: t.slug, name: t.name, nameJa: t.nameJa, latitude: `${t.lat.toFixed(1)}° N`, lat: t.lat, lon: t.lon,
        ...project(t.lat, t.lon), upcoming: false, region: t.region, preview: true,
      })));
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  const countries = useMemo(() => (extra.length ? given.map((c) => (c.code !== 'JP' ? c : {
    ...c,
    cities: [...c.cities, ...extra.filter((e) => !c.cities.some((q) => q.slug === e.slug))].sort((a, b) => b.lat - a.lat),
  })) : given), [given, extra]);

  const showCountry = (code: string | null) => {
    setHov(code);
    if (code) setHovI(0);
    if (code) setLastHov(code);
    if (code) setSeen((p) => (p.includes(code) ? p : [...p, code]));
  };
  // 写真は、地図が出てから少し後に先読みしておく（Stream のコマは初めて頼むと作るのに時間がかかり、重ねた時に丸が空になるため）
  useEffect(() => {
    const t = window.setTimeout(() => {
      for (const c of given) for (const q of c.issues) {
        const im = new Image();
        im.onload = () => loaded.current.add(q.src);
        im.src = q.src;
      }
    }, 1200);
    return () => window.clearTimeout(t);
  }, [given]);
  // 重ねている間、1.5秒ごとに次の号の写真へ。次の写真がまだ読み込めていなければ、読み込めるまで待つ
  useEffect(() => {
    const list = hov ? countries.find((c) => c.code === hov)?.issues ?? [] : [];
    if (list.length < 2) return;
    const t = window.setInterval(() => {
      setHovI((i) => (loaded.current.has(list[(i + 1) % list.length].src) ? (i + 1) % list.length : i));
    }, 1500);
    return () => window.clearInterval(t);
  }, [hov, countries]);

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
  // 寄った時の町の位置：小さな枠（日本の沖縄）の範囲の町は、枠の中へ移す
  const pos = useCallback((code: string, q: PlaceCity) => {
    const ins = geo?.countries[code]?.inset;
    if (!ins?.move || !ins.src) return { x: q.x, y: q.y };
    const [w, s, e, n] = ins.src;
    if (q.lon < w || q.lon > e || q.lat < s || q.lat > n) return { x: q.x, y: q.y };
    const { from, o, k } = ins.move;
    return { x: o[0] + (q.x - from[0]) * k, y: o[1] + (q.y - from[1]) * k };
  }, [geo]);
  const regionAt = useCallback((code: string, g: PlaceRegion) => {
    const p = project(g.at[0], g.at[1]);
    return g.inset ? pos(code, { ...p, lat: g.at[0], lon: g.at[1] } as PlaceCity) : p;
  }, [pos]);

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

  // 地方の範囲：決めてある範囲（沖縄は小さな枠）に、その地方の町がみな入るように
  const regionView = useCallback((code: string, key: string): View => {
    const g = REGIONS[code]?.find((x) => x.key === key);
    const c = countries.find((q) => q.code === code);
    if (!g || !c || !size.w) return countryView(code);
    let x0: number, y0: number, x1: number, y1: number;
    const ins = geo?.countries[code]?.inset;
    if (g.inset && ins) {
      [x0, y0] = ins.box; x1 = x0 + ins.box[2]; y1 = y0 + ins.box[3];
    } else {
      const a = project(g.box[3], g.box[0]), b = project(g.box[1], g.box[2]);
      x0 = a.x; y0 = a.y; x1 = b.x; y1 = b.y;
    }
    for (const q of c.cities) {
      if (q.region !== key) continue;
      const p = pos(code, q);
      x0 = Math.min(x0, p.x - 3); y0 = Math.min(y0, p.y - 3); x1 = Math.max(x1, p.x + 3); y1 = Math.max(y1, p.y + 3);
    }
    return fit([x0, y0, x1 - x0, y1 - y0], size.w, size.h, { t: 56, r: wide ? 70 : 24, b: 24, l: wide ? 70 : 24 });
  }, [countries, countryView, geo, pos, size.w, size.h, wide]);

  const target = useCallback((code: string | null, key: string | null) => (code ? (key ? regionView(code, key) : countryView(code)) : worldView()), [countryView, regionView, worldView]);
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; });
  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; });
  const regRef = useRef(reg);
  useEffect(() => { regRef.current = reg; });
  // 形が届いた時・大きさが変わった時は、いまの所へ合わせ直す（動きなし）
  useEffect(() => {
    if (!size.w) return;
    const to = targetRef.current(selRef.current, regRef.current);
    setAnim({ from: to, to, t0: 0, dur: 0 });
  }, [geo, size.w, size.h]);

  const animating = !!anim && now < anim.t0 + anim.dur;
  const view = anim ? viewAt(anim, now, r) : target(sel, reg);

  const base = `/${locale}/latitude/places`;
  // 国（code）と地方（key）へ、なめらかに寄る
  const fly = (code: string | null, key: string | null) => {
    const t = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = anim ? viewAt(anim, t, r) : worldView();
    const to = target(code, key);
    setAnim({ from, to, t0: t, dur: still ? 0 : duration(from, to, r) });
    setSel(code);
    setReg(key);
    setNow(t);
  };
  const goTo = (code: string | null, push = true) => {
    if (worldHref && code === null) return; // 国のページでは、世界へは「← 世界」のリンクで移る
    if (syncUrl && push && code !== sel) {
      const slug = countries.find((c) => c.code === code)?.slug;
      window.history.pushState(null, '', code && slug ? `${base}/${slug}` : base);
    }
    setPicked(null);
    setHov(null);
    fly(code, null);
  };
  const goRegion = (key: string | null, pick: string | null = null) => {
    if (!sel) return;
    setPicked(pick);
    if (key === reg) return;
    fly(sel, key);
  };
  const goRef = useRef(goTo);
  useEffect(() => { goRef.current = goTo; });
  const backRef = useRef(() => {});
  useEffect(() => { backRef.current = () => (regRef.current ? goRegion(null) : goTo(null)); });
  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating, anim]);
  // 戻る・進むで、アドレスに合わせて寄り直す（場所のページで国へ寄った後）
  useEffect(() => {
    if (!syncUrl) return;
    const onPop = () => {
      const last = window.location.pathname.replace(/\/$/, '').split('/').pop();
      goRef.current(countries.find((c) => c.slug === last)?.code ?? null, false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [syncUrl, countries]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') backRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const h = view.w * r;
  const zoom = MAP_W / view.w;
  const detail = clamp((zoom - 2.2) / 2); // 寄るほど、細かい国の形に入れ替える
  const ready = size.w > 0;
  const toScreen = (x: number, y: number) => ({ sx: ((x - view.x) / view.w) * size.w, sy: ((y - view.y) / h) * size.h });
  const settled = !animating || (anim ? (now - anim.t0) / anim.dur > 0.55 : true);
  const showCities = !!sel && settled;

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
  const regs = sel ? REGIONS[sel] : undefined;
  const regionMode = !!(selC && regs && selC.cities.some((q) => q.region));
  const regG = regionMode && reg ? regs!.find((g) => g.key === reg) : undefined;
  const cityName = (q: PlaceCity) => (ja ? q.nameJa : q.name);
  // 国のまん中：寄った時の国の範囲のまん中（形が届く前は町の位置のまん中）
  const gv = sel ? geo?.countries[sel]?.view : undefined;
  const countryMid = gv ? { x: gv[0] + gv[2] / 2, y: gv[1] + gv[3] / 2 } : selC ? centre(selC) : { x: 0, y: 0 };

  // ── 国の段階（地方のある国）：号の町の写真の丸と、地方の数字の丸 ──
  // 数字の丸が出るか（地方に、号の町でない町がある時）。出ない時（本番の2町）は、号の町の名前の向きも今までどおり
  const anyBubble = regionMode && !reg && selC!.cities.some((q) => q.region && !(q.issue || q.upcoming));
  const pins = regionMode && !reg ? placePins(selC!.cities.filter((q) => q.issue || q.upcoming).map((q) => {
    const p = pos(selC!.code, q);
    const { sx, sy } = toScreen(p.x, p.y);
    // 数字の丸がある時は、名前は国のまん中から外へ（金沢は日本海、盛岡は太平洋の側）。丸とぶつかりにくい
    return { q, sx, sy, prefLeft: anyBubble ? p.x < countryMid.x : sx > size.w - 170 };
  }), size.w, size.h, cityName, regionMode && !reg ? regs!.filter((g) => {
    // 地方の数字の丸が最初に来る所（丸と名前）も避ける。札が丸を押しのけて、丸が別の地方の所まで動かないように
    const list = selC!.cities.filter((q) => q.region === g.key);
    return list.length && !list.every((q) => q.issue || q.upcoming);
  }).map((g) => {
    const at = regionAt(selC!.code, g); const { sx, sy } = toScreen(at.x, at.y); const d = wide ? 34 : 30;
    const w = Math.max(d, textW(ja ? g.ja : g.en, wide ? 13 : 12) * 1.08 + 4);
    return { x: sx - w / 2, y: sy - d / 2, w, h: d + 16 };
  }) : []) : [];
  // 地方の無い国（イギリスなど）の町の印も、重ならない所へ
  const plainPins = selC && !regionMode ? placePins(selC.cities.map((q) => {
    const { sx, sy } = toScreen(q.x, q.y);
    return { q, sx, sy, prefLeft: sx > size.w - 170 };
  }), size.w, size.h, cityName) : [];
  const bubbles = regionMode && !reg ? regs!.map((g) => {
    const list = selC!.cities.filter((q) => q.region === g.key);
    if (!list.length || list.every((q) => q.issue || q.upcoming)) return null; // 号の町だけの地方は、写真の丸で足りる
    const n = list.length;
    const d = Math.round((wide ? 30 : 26) + Math.min(n, 16) * (wide ? 0.9 : 0.6));
    const name = ja ? g.ja : g.en;
    const nw = textW(name, wide ? 13 : 12) * 1.08 + 4; // 2026-11-13 名前の幅は見当より広め（Chugoku が九州の丸にかかった）
    const at = regionAt(selC!.code, g);
    const { sx, sy } = toScreen(at.x, at.y);
    return { g, list, n, d, name, x: sx, y: sy, w: Math.max(d, nw), h: d + 16 };
  }).filter((b): b is NonNullable<typeof b> => !!b) : [];
  // 数字の丸（丸の下に地方の名前）を、ほかの丸・号の町の丸と重ならないよう押し合わせる。号の町は動かさない
  {
    const rectOf = (b: (typeof bubbles)[number]): Rect => ({ x: b.x - b.w / 2, y: b.y - b.d / 2, w: b.w, h: b.h });
    for (let it = 0; it < 60; it++) {
      let moved = false;
      for (let i = 0; i < bubbles.length; i++) {
        const a = bubbles[i];
        const others: { rect: Rect; fixed: boolean; j: number }[] = [
          ...bubbles.map((b, j) => ({ rect: rectOf(b), fixed: false, j })).filter((o) => o.j !== i),
          ...pins.map((p) => ({ rect: p.rect, fixed: true, j: -1 })),
        ];
        for (const o of others) {
          const ra = rectOf(a);
          if (!hit(ra, o.rect, 6)) continue;
          const ox = Math.min(ra.x + ra.w, o.rect.x + o.rect.w) - Math.max(ra.x, o.rect.x) + 6;
          const oy = Math.min(ra.y + ra.h, o.rect.y + o.rect.h) - Math.max(ra.y, o.rect.y) + 6;
          const ca = { x: ra.x + ra.w / 2, y: ra.y + ra.h / 2 }, cb = { x: o.rect.x + o.rect.w / 2, y: o.rect.y + o.rect.h / 2 };
          const share = o.fixed ? 1 : 0.5;
          if (ox < oy) {
            const s = (ca.x <= cb.x ? -1 : 1) * ox * share;
            a.x += s; if (!o.fixed) bubbles[o.j].x -= s;
          } else {
            const s = (ca.y <= cb.y ? -1 : 1) * oy * share;
            a.y += s; if (!o.fixed) bubbles[o.j].y -= s;
          }
          moved = true;
        }
      }
      for (const b of bubbles) {
        b.x = clamp(b.x, b.w / 2 + 4, size.w - b.w / 2 - 4);
        b.y = clamp(b.y, 48 + b.d / 2, size.h - b.h + b.d / 2 - 4);
      }
      if (!moved) break;
    }
  }

  // ── 地方の段階：町の点と名前。名前は右 → 左 → 上 → 下 → ななめの順に、重ならない所へ。どこにも置けない名前は、点に乗せた時だけ出す ──
  const marks = regG ? (() => {
    const list = selC!.cities.filter((q) => q.region === regG.key);
    const dots = list.map((q) => {
      const p = pos(selC!.code, q);
      const { sx, sy } = toScreen(p.x, p.y);
      return { q, sx, sy };
    });
    const taken: Rect[] = [{ x: 0, y: 0, w: 120, h: 44 }, ...dots.map((d) => ({ x: d.sx - 4, y: d.sy - 4, w: 8, h: 8 }))];
    const order = [...dots].sort((a, b) => Number(b.q.slug === picked) - Number(a.q.slug === picked) || Number(!!b.q.issue) - Number(!!a.q.issue) || b.q.lat - a.q.lat);
    const fs = wide ? 14 : 13;
    const place = new Map<string, { dx: number; dy: number } | null>();
    for (const d of order) {
      const w = textW(cityName(d.q), fs) + 2, hh = fs + 4;
      const cands = [
        { dx: 8, dy: -hh / 2 }, { dx: -8 - w, dy: -hh / 2 },
        { dx: -w / 2, dy: -8 - hh }, { dx: -w / 2, dy: 8 },
        { dx: 5, dy: -5 - hh }, { dx: 5, dy: 5 }, { dx: -5 - w, dy: -5 - hh }, { dx: -5 - w, dy: 5 },
      ];
      let got: { dx: number; dy: number } | null = null;
      for (const c of cands) {
        const rr = { x: d.sx + c.dx, y: d.sy + c.dy, w, h: hh };
        if (rr.x < 2 || rr.y < 2 || rr.x + rr.w > size.w - 2 || rr.y + rr.h > size.h - 2) continue;
        if (taken.some((t) => !(t.x === d.sx - 4 && t.y === d.sy - 4) && hit(rr, t))) continue;
        got = c; taken.push(rr); break;
      }
      place.set(d.q.slug, got);
    }
    return dots.map((d) => ({ ...d, label: place.get(d.q.slug) ?? null, fs }));
  })() : [];

  // ── 穴場の点（日本に寄った時）。点の大きさと濃さは、選んだ月のおすすめ度（月を決めていない時は、いちばん良い月の点）──
  const scoreOf = (d: HiddenDot) => (month ? d.score[month - 1] : Math.max(...d.score));
  const hdots = sel === 'JP' && hidden && showCities ? hidden.filter((d) => (!reg || d.region === reg) && scoreOf(d) > 0).map((d) => {
    const p = project(d.lat, d.lon);
    const q = pos('JP', { ...p, lat: d.lat, lon: d.lon } as PlaceCity);
    const { sx, sy } = toScreen(q.x, q.y);
    const sc = scoreOf(d);
    return { d, sx, sy, sc, dia: Math.round(reg ? 4 + sc * 1.1 : wide ? 3 + sc * 0.8 : 3 + sc * 0.6) }; // 2026-11-14 ユーザー：町の赤い点が主、穴場の緑は小さめ（国の段階はさらに小さく）
  }).sort((a, b) => a.sc - b.sc) : [];
  const cardD = card ? hidden?.find((d) => d.slug === card) : undefined;

  // スマホの地図の下の一覧（地方のある国）
  const listC = countries.find((c) => REGIONS[c.code] && c.cities.some((q) => q.region));
  const showOnMap = (code: string, key: string, slug: string | null) => {
    box.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    if (sel !== code) {
      if (syncUrl) {
        const slugC = countries.find((c) => c.code === code)?.slug;
        if (slugC) window.history.pushState(null, '', `${base}/${slugC}`);
      }
      setPicked(slug);
      fly(code, key);
      return;
    }
    goRegion(key, slug);
  };

  const backBtn = 'absolute left-3 top-3 z-[4] cursor-pointer text-[10px] uppercase tracking-[0.3em]';
  const backStyle = { color: INK, background: PAPER, padding: '6px 10px', border: `1px solid ${LINE}` };

  return (
    <div>
      {/* 国の名前の並び（押すとその国へ。狭い画面で点を押しにくい時のため）。国のページ（1国だけ）では出さない */}
      {countries.length > 1 && <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.28em]">
        {countries.map((c) => (
          <li key={c.code}>
            <button type="button" onClick={() => goTo(sel === c.code && !reg ? null : c.code)} aria-pressed={sel === c.code}
              className="cursor-pointer underline-offset-4 hover:underline" style={{ color: sel === c.code ? INK : MUTE, borderBottom: sel === c.code ? `1px solid ${INK}` : '1px solid transparent' }}>
              {ja ? c.name.ja : c.name.en}
            </button>
          </li>
        ))}
      </ul>}
      {hidden && sel === 'JP' && <MonthBar month={month} setMonth={(m) => { setMonth(m); }} ja={ja} n={hidden.length} />}
      <div ref={box} className="relative aspect-square w-full overflow-hidden md:aspect-[2/1]"
        style={{ background: PAPER, border: `1px solid ${LINE}`, maxHeight: '80vh', touchAction: 'pan-y' }}
        onClick={(e) => {
          if ((e.target as Element).closest('button, a')) return;
          if (sel) backRef.current();
          else if (hov) setHov(null); // スマホで写真を出した国を、地図の空いた所を押してしまう
        }}>
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

        {/* 緯度の線の数字（左の端）。地方に寄った時は、地方の名前と重なるので左上を空ける */}
        {ready && PARALLELS.map((lat) => {
          const { sy } = toScreen(0, (73 - lat) * SC);
          if (sy < (reg ? 52 : 14) || sy > size.h - 8) return null;
          return (
            <span key={lat} className="pointer-events-none absolute left-2 -translate-y-full pb-0.5 text-[9px] tracking-[0.2em]" style={{ top: sy, color: MUTE }}>
              {lat}° N
            </span>
          );
        })}

        {/* 国の点（世界の範囲の時）。重ねる（スマホは1回押す）と、点が大きくなり、号の写真の丸と「国の名前 · 号の数」が出る */}
        {ready && !sel && cdots.map(({ c, x, y }) => {
          const on = hov === c.code;
          const n = c.issues.length;
          const name = ja ? c.name.ja : c.name.en;
          const count = n ? (ja ? `${n}${n < 10 ? 'つ' : ''}の号` : `${n} ${n === 1 ? 'issue' : 'issues'}`)
            : c.cities.length > 6 ? (ja ? `${c.cities.length}の街` : `${c.cities.length} cities`) : c.cities.map((q) => cityName(q)).join(' · ');
          const left = x > size.w - (wide ? 300 : 240); // 右の端に近い点は、写真と名前を左へ（写真の丸＋名前の幅）
          const ms = 300;
          return (
            <button key={c.code} type="button"
              onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
              onPointerEnter={(e) => { if (e.pointerType === 'mouse') { setHovTouch(false); showCountry(c.code); } }}
              onPointerLeave={(e) => { if (e.pointerType === 'mouse' && hov === c.code) setHov(null); }}
              onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) showCountry(c.code); }}
              onBlur={() => { if (hov === c.code) setHov(null); }}
              onClick={(e) => {
                e.stopPropagation();
                // スマホ（指・ペン）：1回目は写真と名前だけ。もう1回押すとその国へ
                if (lastPointer.current !== 'mouse' && e.detail > 0 && !on) { setHovTouch(true); showCountry(c.code); return; }
                goTo(c.code);
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 ${on ? 'z-[3]' : 'z-[1] focus-visible:z-[3]'}`}
              style={{ left: x, top: y, opacity: animating ? 0 : 1, transition: 'opacity 200ms' }}
              aria-label={`${name} · ${count}`}>
              <span className="block h-3 w-3 rounded-full" style={{ background: RED, boxShadow: `0 0 0 2px ${PAPER}`, scale: on ? '1.5' : '1', transition: `scale ${ms}ms ease-out` }} />
              {/* 写真の丸と名前。マウスの時は押せない（大きな丸が近くの国の点を覆っても、その点に重ねられるように）。指で出した時は押すとその国へ */}
              <span className={`absolute top-1/2 flex items-center gap-2 ${left ? 'right-full mr-1 flex-row-reverse' : 'left-full ml-1'}`}
                style={{ transform: 'translateY(-50%)', pointerEvents: on && hovTouch ? 'auto' : 'none', opacity: on ? 1 : 0, transition: `opacity ${ms}ms ease-out` }}>
                {n > 0 && (
                  <span className="relative block shrink-0 overflow-hidden rounded-full"
                    style={{ width: wide ? 80 : 64, height: wide ? 80 : 64, background: LAND, boxShadow: `0 0 0 2px ${PAPER}`, scale: on ? '1' : '0.5', transition: `scale ${ms}ms ease-out` }}>
                    {seen.includes(c.code) && c.issues.map((q, k) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={q.slug} src={q.src} alt="" onLoad={() => loaded.current.add(q.src)}
                        className="lat-cf absolute inset-0 block h-full w-full object-cover"
                        style={{ maxWidth: 'none', objectPosition: `50% ${q.y}%`, opacity: (lastHov === c.code ? hovI : 0) === k ? 1 : 0, transition: 'opacity 700ms ease-in-out' }} />
                    ))}
                  </span>
                )}
                <span className="whitespace-nowrap text-[16px] md:text-[18px]" style={{ fontFamily: SERIF, color: INK, textShadow: HALO, textAlign: left ? 'right' : 'left' }}>
                  {name}
                  <span className="ml-2 text-[11px] uppercase tracking-[0.22em]" style={{ fontFamily: 'inherit', color: MUTE }}>
                    · {count}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {/* 街の点（地方の無い国に寄った時）。押すと街の案内へ */}
        {ready && selC && !regionMode && showCities && plainPins.map(({ q, sx, sy, left, dy }) => (
          <CityPin key={q.slug} q={q} sx={sx} sy={sy} left={left} dy={dy} locale={locale} ja={ja} />
        ))}

        {/* 国の段階（地方のある国）：号の町の写真の丸 */}
        {ready && showCities && pins.map(({ q, sx, sy, left, dy }) => (
          <CityPin key={q.slug} q={q} sx={sx} sy={sy} left={left} dy={dy} locale={locale} ja={ja} />
        ))}

        {/* 国の段階：地方の数字の丸。押すとその地方へ */}
        {ready && showCities && bubbles.map((b) => (
          <button key={b.g.key} type="button" onClick={(e) => { e.stopPropagation(); goRegion(b.g.key); }}
            className="group absolute z-[2] flex -translate-x-1/2 cursor-pointer flex-col items-center hover:z-[3] focus-visible:z-[3]"
            style={{ left: b.x, top: b.y - b.d / 2, animation: 'lat-fade 400ms ease-out' }}
            title={b.list.map((q) => cityName(q)).join(ja ? '・' : ', ')}
            aria-label={ja ? `${b.name}（${b.n}の町）` : `${b.name} (${b.n} towns)`}>
            <span className="flex items-center justify-center rounded-full tabular-nums transition-transform duration-200 group-hover:scale-110"
              style={{ width: b.d, height: b.d, background: RED, color: PAPER, boxShadow: `0 0 0 2px ${PAPER}`, fontFamily: SERIF, fontSize: wide ? 16 : 14, lineHeight: 1 }}>
              {b.n}
            </span>
            <span className="mt-1 whitespace-nowrap leading-none group-hover:underline underline-offset-4"
              style={{ fontFamily: SERIF, fontSize: wide ? 13 : 12, color: INK, textShadow: HALO }}>
              {b.name}
            </span>
          </button>
        ))}

        {/* 地方の段階：町の点と名前。押すと町のページへ（試しの町は名前を強めるだけ）。写真は乗せた時・押した時だけ */}
        {ready && regG && settled && marks.map(({ q, sx, sy, label, fs }) => {
          const on = picked === q.slug;
          const inner = (
            <>
              <span className="absolute block rounded-full transition-transform duration-150 group-hover:scale-[1.5]"
                style={{ width: q.issue ? 14 : 11, height: q.issue ? 14 : 11, left: q.issue ? -7 : -5.5, top: q.issue ? -7 : -5.5, background: q.upcoming ? PAPER : RED, border: q.upcoming ? `1.5px solid ${RED}` : undefined, boxShadow: `0 0 0 2px ${PAPER}`, scale: on ? '1.5' : undefined }} />
              {q.issue && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.issue.cover} alt="" loading="lazy"
                  className={`pointer-events-none absolute rounded-full object-cover ${on ? 'block' : 'hidden group-hover:block group-focus-visible:block'}`}
                  style={{ width: 44, height: 44, maxWidth: 'none', left: -22, top: -58, boxShadow: `0 0 0 2px ${PAPER}` }} />
              )}
              <span className={`absolute whitespace-nowrap leading-none underline-offset-4 group-hover:underline ${label || on ? '' : 'hidden group-hover:block group-focus-visible:block'}`}
                style={{
                  left: label ? label.dx : 8, top: label ? label.dy + 2 : -fs / 2,
                  fontFamily: SERIF, fontSize: fs, color: on ? RED : INK, textShadow: HALO,
                  textDecoration: on ? 'underline' : undefined, textDecorationThickness: on ? 1 : undefined,
                }}>
                {cityName(q)}
              </span>
            </>
          );
          const cls = `group absolute block h-0 w-0 cursor-pointer outline-none ${on ? 'z-[3]' : 'z-[2] hover:z-[3] focus-visible:z-[3]'}`;
          const st = { left: sx, top: sy, animation: 'lat-fade 400ms ease-out' };
          return q.preview ? (
            <button key={q.slug} type="button" className={cls} style={st} aria-pressed={on}
              onClick={(e) => { e.stopPropagation(); setPicked(on ? null : q.slug); }}
              aria-label={ja ? `${q.nameJa}（${q.latitude}・試しの町）` : `${q.name} (${q.latitude}, preview)`}>
              <span className="absolute -left-3 -top-3 block h-6 w-6" />
              {inner}
            </button>
          ) : (
            <Link key={q.slug} href={`/${locale}/latitude/places/${q.slug}`} className={cls} style={st}
              aria-label={ja ? `${q.nameJa}の案内（${q.latitude}）` : `${q.name} city guide (${q.latitude})`}>
              <span className="absolute -left-3 -top-3 block h-6 w-6" />
              {inner}
            </Link>
          );
        })}

        {/* 穴場の点（苔の緑）。押すとカード。地方に寄った時は、おすすめ度4以上の所の名前も出す */}
        {ready && hdots.map(({ d, sx, sy, sc, dia }) => {
          const on = card === d.slug;
          const nm = ja ? d.name : d.nameEn;
          return (
            <button key={d.slug} type="button" onClick={(e) => { e.stopPropagation(); setCard(on ? null : d.slug); }}
              className={`group absolute block h-0 w-0 cursor-pointer ${on ? 'z-[3]' : 'z-[1] hover:z-[3] focus-visible:z-[3]'}`}
              style={{ left: sx, top: sy, animation: 'lat-fade 400ms ease-out' }} aria-pressed={on}
              aria-label={`${nm}（${ja ? d.prefectureJa : d.prefecture}）${month ? ` ${ja ? `${month}月のおすすめ度` : `${MONTH_EN[month - 1]}`} ${sc}/5` : ''}`}>
              <span className="absolute -left-3 -top-3 block h-6 w-6" />
              {month && sc >= 4 && (
                // 2026-11-14 ユーザー：月を選んでいる時、その月のおすすめ（4以上）はポワンポワンとゆっくり点滅（輪が広がって消える）
                <span className="lat-pulse pointer-events-none absolute block rounded-full"
                  style={{ width: dia, height: dia, left: -dia / 2, top: -dia / 2, background: MOSS, animationDelay: `${(d.slug.length % 7) * 0.35}s` }} />
              )}
              <span className="absolute block rounded-full transition-all duration-300 group-hover:scale-[1.4]"
                style={{ width: dia, height: dia, left: -dia / 2, top: -dia / 2, background: MOSS, opacity: month ? 0.35 + sc * 0.13 : 0.85, boxShadow: `0 0 0 ${on ? 3 : 1.5}px ${PAPER}` }} />
              {/* 2026-11-14 ユーザー：穴場の名前は、乗せた時・押した時だけ（町の名前と重なるので） */}
              <span className={`pointer-events-none absolute whitespace-nowrap leading-none ${on ? '' : 'hidden group-hover:block group-focus-visible:block'}`}
                style={{ left: dia / 2 + 4, top: -6, fontFamily: SERIF, fontSize: reg ? 12 : 11, color: MOSS, textShadow: HALO }}>{nm}</span>
            </button>
          );
        })}
        {ready && cardD && sel === 'JP' && <HiddenCard d={cardD} month={month} ja={ja} locale={locale} onClose={() => setCard(null)} />}

        {/* 地方の段階：右上に地方の名前と町の数 */}
        {ready && regG && settled && (
          <p className="pointer-events-none absolute right-3 top-3 z-[4] text-right" style={{ animation: 'lat-fade 400ms ease-out' }}>
            <span className="block text-[20px] leading-none md:text-[26px]" style={{ fontFamily: SERIF, color: INK, textShadow: HALO }}>{ja ? regG.ja : regG.en}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE, textShadow: HALO }}>
              {(() => { const n = marks.length; return ja ? `${n}の町` : `${n} ${n === 1 ? 'town' : 'towns'}`; })()}
            </span>
          </p>
        )}

        {ready && sel && (reg ? (
          <button type="button" onClick={() => goRegion(null)} className={backBtn} style={backStyle}>
            ← {ja ? selC?.name.ja : selC?.name.en}
          </button>
        ) : worldHref ? (
          <Link href={worldHref} className={backBtn} style={backStyle}>
            {ja ? '← 世界' : '← World'}
          </Link>
        ) : (
          <button type="button" onClick={() => goTo(null)} className={backBtn} style={backStyle}>
            {ja ? '← 世界' : '← World'}
          </button>
        ))}
        <style>{'@keyframes lat-fade{from{opacity:0}to{opacity:1}}@keyframes lat-pulse{0%{transform:scale(1);opacity:.55}70%{transform:scale(3.2);opacity:0}100%{transform:scale(3.2);opacity:0}}.lat-pulse{animation:lat-pulse 2.8s ease-out infinite}@media (prefers-reduced-motion: reduce){.lat-cf{transition:none!important}.lat-pulse{animation:none;display:none}}'}</style>
      </div>
      <p className="mt-3 text-right text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
        {ja ? '地図データ ' : 'Map data '}
        <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: MUTE }}>Natural Earth</a>
      </p>

      {/* スマホ：地図の下に、地方ごとの横に流れる一覧（街のページの横スクロールと同じ作り） */}
      {listC && (
        <div className="mt-10 flex flex-col gap-10 md:hidden">
          <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>{ja ? `${listC.name.ja}の地方から` : `${listC.name.en}, by region`}</p>
          {REGIONS[listC.code].map((g) => {
            const list = listC.cities.filter((q) => q.region === g.key);
            if (!list.length) return null;
            const name = ja ? g.ja : g.en;
            return (
              <HScroller key={g.key} count={list.length} label={ja ? `${name}の町` : `Towns in ${name}`} ja={ja}
                head={
                  <div className="flex items-baseline gap-3">
                    <h3 className="text-[24px] leading-none" style={{ fontFamily: SERIF, fontWeight: 400 }}>{name}</h3>
                    <button type="button" onClick={() => showOnMap(listC.code, g.key, null)}
                      className="cursor-pointer text-[10px] uppercase tracking-[0.3em] underline underline-offset-4" style={{ color: INK }}>
                      {ja ? '地図' : 'Map'}
                    </button>
                  </div>
                }>
                {list.map((q) => (
                  <li key={q.slug} className="w-[36vw] max-w-[160px] shrink-0 snap-start">
                    <TownCard q={q} locale={locale} ja={ja} on={picked === q.slug}
                      onPick={() => showOnMap(listC.code, g.key, q.slug)} />
                  </li>
                ))}
              </HScroller>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 号の町の印（点＋号の表紙の小さな丸＋名前と緯度）。押すと街の案内へ
function CityPin({ q, sx, sy, left, dy = 0, locale, ja }: { q: PlaceCity; sx: number; sy: number; left: boolean; dy?: number; locale: string; ja: boolean }) {
  return (
    <Link href={`/${locale}/latitude/places/${q.slug}`}
      className="group absolute z-[2] flex cursor-pointer items-center gap-2 hover:z-[3]"
      style={{ left: sx, top: sy, transform: `translate(${left ? 'calc(-100% + 7px)' : '-7px'}, -50%)`, flexDirection: left ? 'row-reverse' : 'row', animation: 'lat-fade 400ms ease-out' }}
      aria-label={ja ? `${q.nameJa}の案内（${q.latitude}）` : `${q.name} city guide (${q.latitude})`}>
      <span className="block h-[14px] w-[14px] shrink-0 rounded-full group-hover:scale-[1.4]"
        style={{ background: q.upcoming ? PAPER : RED, border: q.upcoming ? `1.5px solid ${RED}` : undefined, boxShadow: `0 0 0 2px ${PAPER}`, transition: 'scale 180ms ease-out' }} />
      {dy !== 0 && (
        // 札を上下にずらした時：点から札の写真へ細い線
        <svg className="pointer-events-none absolute overflow-visible" style={{ left: left ? 'auto' : 7, right: left ? 7 : 'auto', top: '50%', width: 1, height: 1 }} aria-hidden="true">
          <line x1={0} y1={0} x2={left ? -14 : 14} y2={dy} stroke={MUTE} strokeWidth={0.8} />
        </svg>
      )}
      <span className="flex items-center gap-2" style={{ position: 'relative', top: dy, flexDirection: left ? 'row-reverse' : 'row' }}>
      {q.issue && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={q.issue.cover} alt="" loading="lazy" className="block shrink-0 rounded-full object-cover" style={{ width: 32, height: 32, boxShadow: `0 0 0 2px ${PAPER}` }} />
      )}
      <span className="flex flex-col" style={{ textAlign: left ? 'right' : 'left' }}>
        <span className="whitespace-nowrap text-[15px] leading-tight group-hover:underline underline-offset-4" style={{ fontFamily: SERIF, color: INK, textShadow: HALO }}>
          {ja ? q.nameJa : q.name}
        </span>
        <span className="whitespace-nowrap text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE, textShadow: HALO }}>
          {q.latitude}{q.upcoming ? (ja ? '・これから' : ' · Next') : ''}
        </span>
      </span>
      </span>
    </Link>
  );
}

// スマホの一覧の町のカード。号の町は表紙、ほかは紙に緯度だけ（街のページの「1日の回り方」の写真の無い時刻と同じ形）。
// 街のページのある町は押すとそのページへ。試しの町は、地図でその町に寄って名前を強める
function TownCard({ q, locale, ja, on, onPick }: { q: PlaceCity; locale: string; ja: boolean; on: boolean; onPick: () => void }) {
  const face = q.issue ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={q.issue.cover} alt="" loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '4 / 3' }} />
  ) : (
    <div className="flex w-full items-end p-3" style={{ aspectRatio: '4 / 3', border: `1px solid ${on ? RED : LINE}` }}>
      <span className="text-[26px] leading-none tabular-nums" style={{ fontFamily: SERIF, color: MUTE }}>{q.latitude.replace(' N', '')}</span>
    </div>
  );
  const text = (
    <>
      <p className="mt-3 text-[18px] leading-snug" style={{ fontFamily: SERIF, color: on ? RED : INK }}>{ja ? q.nameJa : q.name}</p>
      <p className="mt-1 text-[9px] uppercase tabular-nums tracking-[0.25em]" style={{ color: MUTE }}>
        {q.latitude}{q.issue ? (ja ? '・号' : ' · Issue') : ''}
      </p>
    </>
  );
  return q.preview ? (
    <button type="button" onClick={onPick} aria-pressed={on} className="block w-full cursor-pointer text-left">{face}{text}</button>
  ) : (
    <Link href={`/${locale}/latitude/places/${q.slug}`} className="block">{face}{text}</Link>
  );
}


// 2026-11-14 訪ねる月のボタン（地図の上）。月を選ぶと、穴場の点がその月のおすすめ度で大きく・濃くなる
function MonthBar({ month, setMonth, ja, n }: { month: number | null; setMonth: (m: number | null) => void; ja: boolean; n: number }) {
  return (
    <div className="mb-3 flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
        <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: MOSS }} />
        {ja ? `穴場 ${n}か所 · 訪ねる月を選ぶと、その月に良い所ほど大きく` : `${n} hidden spots · pick the month you visit; the bigger the dot, the better that month`}
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={ja ? '訪ねる月' : 'Month of your visit'}>
        {[null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
          const on = month === m;
          return (
            <button key={m ?? 0} type="button" aria-pressed={on} onClick={() => setMonth(m)}
              className="cursor-pointer px-2 py-1 text-[10px] uppercase tracking-[0.15em] tabular-nums"
              style={{ color: on ? PAPER : INK, background: on ? MOSS : 'transparent', border: `1px solid ${on ? MOSS : LINE}` }}>
              {m === null ? (ja ? 'いつでも' : 'Any') : ja ? `${m}月` : MONTH_EN[m - 1].slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 2026-11-14 穴場のカード（地図の下の端）。その月のおすすめ度（●の数）と理由・12か月の帯・1日のコースのページへ
function HiddenCard({ d, month, ja, locale, onClose }: { d: HiddenDot; month: number | null; ja: boolean; locale: string; onClose: () => void }) {
  const m = month ?? d.score.indexOf(Math.max(...d.score)) + 1;
  const sc = d.score[m - 1];
  const note = d.note[String(m)];
  return (
    <div className="absolute bottom-3 left-3 right-3 z-[5] flex gap-3 p-3 md:right-auto md:w-[420px]" onClick={(e) => e.stopPropagation()}
      style={{ background: '#faf8f4', boxShadow: '0 6px 24px rgba(30,29,27,0.14)', animation: 'lat-fade 250ms ease-out' }}>
      {d.banner && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.banner} alt="" className="h-[92px] w-[92px] shrink-0 object-cover" style={{ objectPosition: `50% ${d.bannerY ?? 50}%` }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{ja ? d.prefectureJa : d.prefecture}{d.seasonal ? (ja ? ' · 季節の穴場' : ' · seasonal') : ''}</p>
        <p className="mt-1 text-[18px] leading-tight" style={{ fontFamily: SERIF, color: INK }}>{ja ? d.name : d.nameEn}</p>
        <p className="mt-1.5 flex items-center gap-2 text-[11px]" style={{ color: INK }}>
          <span className="tabular-nums" style={{ color: MUTE }}>{ja ? `${m}月` : MONTH_EN[m - 1]}{month ? '' : ja ? '（いちばん良い月）' : ' (best month)'}</span>
          <Dots n={sc} />
        </p>
        <p className="mt-1 text-[12px] leading-snug" style={{ color: INK }}>{note ? (ja ? note.ja : note.en) : ja ? d.peakNoteJa : d.peakNote}</p>
        <Strip score={d.score} at={m} />
        <Link href={`/${locale}/latitude/places/japan/spot/${d.slug}`} className="mt-2 inline-block text-[10px] uppercase tracking-[0.25em] underline underline-offset-4" style={{ color: MOSS }}>
          {ja ? '1日のコースを見る →' : 'A day there →'}
        </Link>
      </div>
      <button type="button" onClick={onClose} aria-label={ja ? '閉じる' : 'Close'} className="-mr-1 -mt-1 h-6 w-6 shrink-0 cursor-pointer text-[14px] leading-none" style={{ color: MUTE }}>×</button>
    </div>
  );
}

