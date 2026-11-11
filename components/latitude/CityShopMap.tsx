'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import TrackLink from '@/components/latitude/TrackLink';
import { CATEGORY_COLOR } from '@/lib/latitude-category-colors';
import { markStyle, isSightKind, type MarkKind } from '@/lib/latitude-markers';
import { MAX_STOPS, makePairLookup, type PairsFile } from '@/lib/latitude-routes/pairs';
import RouteBuilderPanel, { type BuildPoint } from '@/components/latitude/RouteBuilderPanel';

// 2026-11-11 試作：LATITUDE の街のページの「店の地図」。ユーザーの案：
// 号の「動く地図」と同じ紙の地図の上に、店を小さな丸で並べる。丸を押すとその店へなめらかに寄り、店のカードが出る。
// 小さな丸の状態で街の全体が見える。下の文字のリスト（種類ごと・地区ごと）はそのまま残し、カードから「リストで見る」で飛べる。
//
// 地図の土台は OpenStreetMap のデータを自分で描いた線（public/latitude/citymaps/<街>.json。scripts/latitude-citymap.py）。
// 外部の地図サービス・API キーは使わない。描き方は号のカルーセルの動く地図と同じ：紙の地・灰の道・青灰の川・黒い線路。
// 寄る動きは TravellerMap と同じ考え（見えている範囲を毎コマ計算して viewBox を動かす。幅は対数で、中心は加減速で）。
// 店の写真は、店からもらった物（photo）だけ。号の場面の写真は使わない（その店の写真に見えるため）。
// Instagram の埋めこみは、店のカードを開いた時だけ読みこむ（ページを重くしない）。
//
// 2026-11-11 試作（金沢）「自分でルートを組む」：凛のおすすめのルート（上の段）とは別に、見る人が自分の道を組める。
//  ・種類のスイッチ（凡例を押す）：オフの種類の丸は地図と「名前から選ぶ」から消える（どちらのモードでも）。組んだ道に入っている店は残す
//  ・「自分でルートを組む」にすると、丸を押した順に 1・2・3… と番号が付き、歩く道の点線でつながる。もう一度押すと外れる（番号は詰める）
//  ・道は scripts/latitude-route-pairs.py が先に計算した全部の組み合わせ（public/latitude/routes/<街>-pairs.json）をつなぐ。外の計算は呼ばない
//  ・並べ替え・合計・Google マップは RouteBuilderPanel

export type ShopPin = {
  id: string; // リストの店の id（#place-…）
  key: string; // 記録用の店の名前（日本語の正式名）
  name: string;
  area: string;
  category: string;
  catLabel: string;
  lat: number;
  lon: number;
  approx?: boolean;
  what: string;
  note: string;
  site?: string; // 公式サイト（Instagram でない物）
  instagram?: string;
  photo?: string; // 店からもらった写真の URL
  mapUrl: string;
  gq?: string; // Google マップの道案内に渡す言葉（店の名前＋住所）
  // 2026-11-11 見る所（アート・名所）。category は 'art' か 'sight'。店ではなく目印（凛の一言なし・カードに「目印」）
  kind?: 'shop' | 'art' | 'sight';
  notice?: string; // 休館の予定など
};
const kindOf = (p: ShopPin): MarkKind => p.kind ?? 'shop';

// 「自分でルートを組む」で選べる、凛の1日の地点（上の段の番号と同じ n）
export type RinStop = { id: string; n: number; name: string; lat: number; lon: number; gq: string };

export type BaseMap = {
  center: [number, number];
  k: [number, number];
  home: [number, number, number, number]; // x, y, w, h（メートル）
  labels: { x: number; y: number; ja: string; en: string; kind?: string }[];
  layers: Record<'water' | 'park' | 'river' | 'stream' | 'path' | 'minor' | 'major' | 'rail', string>;
};

const INK = '#1e1d1b';
const MUTE = '#78746c';
const PAPER = '#f2eee7';
const LINE = 'rgba(30,29,27,0.14)';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
// 号の動く地図（vault routemap/reel_overlays2.py）の色を、サイトの紙の色に合わせた物
const ROAD = '#aca8a0';
const PATH = '#cbc6bd';
const WATER = '#a9b2b8';
const PARK = 'rgba(112,120,92,0.10)';

// 種類ごとの丸の色は lib/latitude-category-colors.ts（一覧の見出しの点と同じ）

type View = { x: number; y: number; w: number }; // 左上と幅（メートル）。高さは枠の縦横比から
type Anim = { from: View; to: View; t0: number; dur: number };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const WIDE = 768; // これより広い画面では、カードを地図の右に重ねる。狭い画面では下からせり上がる
const CARD_W = 360;
const TOP_GAP = 8; // 狭い画面で店を選んだ時、地図の上の端を置く画面の上からの位置（px）

function viewAt(a: Anim, now: number, r: number): View {
  const t = a.dur > 0 ? clamp((now - a.t0) / a.dur) : 1;
  if (t >= 1) return a.to;
  const e = ease(t);
  const { from, to } = a;
  const c0 = { x: from.x + from.w / 2, y: from.y + (from.w * r) / 2 };
  const c1 = { x: to.x + to.w / 2, y: to.y + (to.w * r) / 2 };
  let w = from.w * Math.pow(to.w / from.w, e);
  // 遠い所へ移る時は、途中で少し引いて、両方が見えるようにする
  const mid = Math.sqrt(from.w * to.w);
  const need = Math.max(Math.abs(c1.x - c0.x), Math.abs(c1.y - c0.y) / r) + Math.max(from.w, to.w) * 0.4;
  if (need > mid) w *= Math.pow(need / mid, Math.sin(Math.PI * e));
  const cx = c0.x + (c1.x - c0.x) * e;
  const cy = c0.y + (c1.y - c0.y) * e;
  return { x: cx - w / 2, y: cy - (w * r) / 2, w };
}
function duration(a: View, b: View, r: number) {
  const zoom = Math.abs(Math.log2(b.w / a.w));
  const d = Math.hypot(a.x + a.w / 2 - (b.x + b.w / 2), (a.y + (a.w * r) / 2 - (b.y + (b.w * r) / 2)) / r) / Math.max(a.w, b.w);
  return clamp(700 + 160 * zoom + 200 * Math.min(d, 2), 700, 1300);
}

const RED = '#7a241e'; // 凛のルートと同じ暗い赤の点線
const RIN = 'rin'; // 種類のスイッチの「凛の1日の場所」

export default function CityShopMap({ src, pins, ja, who, person, cats, pairsSrc, rinStops = [] }: {
  src: string; // 土台の JSON の URL
  pins: ShopPin[];
  ja: boolean;
  who: string;
  person: string;
  cats: { key: string; label: string }[]; // 凡例（並べる順）
  pairsSrc?: string; // あれば「自分でルートを組む」を出す（組み合わせの歩く道の JSON）
  rinStops?: RinStop[];
}) {
  const [mode, setMode] = useState<'look' | 'build'>('look');
  const build = mode === 'build';
  const [off, setOff] = useState<Set<string>>(() => new Set());
  const [route, setRoute] = useState<string[]>([]);
  const [pairs, setPairs] = useState<PairsFile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [base, setBase] = useState<BaseMap | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [anim, setAnim] = useState<Anim | null>(null);
  const [now, setNow] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null); // カードに出している店（閉じる動きの間も中身を残す）
  const box = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLElement>(null);
  // 下から出たカードの高さ（px）。狭い画面では、選んだ丸をカードの上に見えている地図のまん中へ寄せるのに使う
  const [sheetH, setSheetH] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(src).then((r) => (r.ok ? r.json() : null)).then((d) => { if (live && d) setBase(d); }).catch(() => {});
    return () => { live = false; };
  }, [src]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize((p) => (p.w === el.clientWidth && p.h === el.clientHeight ? p : { w: el.clientWidth, h: el.clientHeight })));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wide = size.w >= WIDE;
  const r = size.w ? size.h / size.w : 1; // 見えている範囲の 高さ ÷ 幅

  // 店の位置（メートル。y は南が正）
  const toM = useCallback((lat: number, lon: number) => {
    if (!base) return { x: 0, y: 0 };
    return { x: (lon - base.center[1]) * base.k[0], y: (base.center[0] - lat) * base.k[1] };
  }, [base]);
  const pos = useCallback((p: { lat: number; lon: number }) => toM(p.lat, p.lon), [toM]);

  // 範囲（メートルの箱）が、余白ごと収まる範囲
  const boxView = useCallback((hx: number, hy: number, hw: number, hh: number): View => {
    if (!size.w) return { x: 0, y: 0, w: 1 };
    const pad = Math.min(48, size.w * 0.06);
    const w = Math.max((hw * size.w) / Math.max(size.w - 2 * pad, 40), (hh * size.w) / Math.max(size.h - 2 * pad, 40));
    return { x: hx + hw / 2 - w / 2, y: hy + hh / 2 - (w * r) / 2, w };
  }, [size.w, size.h, r]);
  // 最初の範囲：店の多い真ん中（home）が、余白ごと収まる範囲
  const homeView = useCallback((): View => {
    if (!base || !size.w) return { x: 0, y: 0, w: 1 };
    const [hx, hy, hw, hh] = base.home;
    return boxView(hx, hy, hw, hh);
  }, [base, size.w, boxView]);

  // 「自分でルートを組む」で選べる地点（店＋凛の1日の地点）と、地点どうしの歩く道
  const points: BuildPoint[] = useMemo(() => [
    ...pins.map((p) => ({ id: p.id, key: p.key, name: p.name, sub: p.catLabel, lat: p.lat, lon: p.lon, gq: p.gq ?? p.name, color: CATEGORY_COLOR[p.category] ?? INK, cat: p.category, kind: kindOf(p) })),
    ...rinStops.map((x) => ({ id: x.id, key: x.id, name: x.name, sub: ja ? `${who}の1日 ${x.n}` : `${who}'s day ${x.n}`, lat: x.lat, lon: x.lon, gq: x.gq, color: INK, cat: RIN, kind: 'stop' as const })),
  ], [pins, rinStops, ja, who]);
  const pointById = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);
  const [pairsState, setPairsState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle');
  const leg = useMemo(() => makePairLookup(pairs, points), [pairs, points]);
  // 組み合わせの道は、「自分でルートを組む」を開いた時に初めて読む
  useEffect(() => {
    if (!build || !pairsSrc || pairsState !== 'idle') return;
    setPairsState('loading');
    fetch(pairsSrc).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.pairs) { setPairs(d); setPairsState('ok'); } else setPairsState('fail'); })
      .catch(() => setPairsState('fail'));
  }, [build, pairsSrc, pairsState]);
  // 組んだ地点が見えている範囲の外に出たら、真ん中（home）と組んだ地点の全部が入る所まで引く
  const fitView = useCallback((ids: string[]): View => {
    if (!base) return homeView();
    const [hx, hy, hw, hh] = base.home;
    let x0 = hx, y0 = hy, x1 = hx + hw, y1 = hy + hh;
    ids.forEach((id) => {
      const q = pointById.get(id);
      if (!q) return;
      const m = toM(q.lat, q.lon);
      x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x); y1 = Math.max(y1, m.y);
    });
    return boxView(x0, y0, x1 - x0, y1 - y0);
  }, [base, homeView, pointById, toM, boxView]);

  // 店へ寄った範囲：広い画面は店をカードの左の空きのまん中に、狭い画面は上から4割の所に置く
  const shopView = useCallback((id: string): View => {
    const p = pins.find((q) => q.id === id);
    if (!p || !size.w) return homeView();
    const { x, y } = pos(p);
    // 2026-11-11 ユーザー：寄りすぎで街の様子が分からない → 寄る強さを半分に（周りの通り数本と、近くの店の丸がいくつか見える程度）
    const mpp = wide ? 1.6 : 2.0; // 1px あたりのメートル
    const w = size.w * mpp;
    const sx = wide ? (size.w - CARD_W - 32) / 2 : size.w / 2;
    // 狭い画面：地図の上の端を画面の上（TOP_GAP）へ流してから、カードの上に見えている地図のまん中へ置く
    const sheetPx = sheetH > 100 ? sheetH : window.innerHeight * 0.5; // まだ測れていない時（最初に開く時）は画面の半分と見こむ
    const visible = Math.max(80, Math.min(size.h, window.innerHeight - sheetPx - TOP_GAP));
    const sy = wide ? size.h / 2 : visible / 2;
    return { x: x - sx * mpp, y: y - sy * mpp, w };
  }, [pins, size.w, size.h, wide, pos, homeView, sheetH]);

  const target = useCallback((id: string | null) => (id ? shopView(id) : homeView()), [shopView, homeView]);
  const animating = !!anim && now < anim.t0 + anim.dur;
  const view = anim ? viewAt(anim, now, r) : homeView();
  // 土台が届いた時・大きさが変わった時（回転・幅の変化）は、いま選んでいる所へ合わせ直す（動きなし）
  const targetRef = useRef(target);
  useEffect(() => { targetRef.current = target; });
  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; });
  useEffect(() => {
    if (!base || !size.w) return;
    const to = targetRef.current(selRef.current);
    setAnim({ from: to, to, t0: 0, dur: 0 });
  }, [base, size.w, size.h]);

  const goTo = (id: string | null) => {
    const t = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = anim ? viewAt(anim, t, r) : homeView();
    const to = target(id);
    setAnim({ from, to, t0: t, dur: still ? 0 : duration(from, to, r) });
    setSel(id);
    if (id) setShown(id);
    setNow(t);
    // 狭い画面：下から出るカードに隠れないよう、地図の上の端を画面の上へ流す
    if (id && !wide && box.current) {
      const top = box.current.getBoundingClientRect().top - TOP_GAP;
      if (Math.abs(top) > 2) window.scrollBy({ top, behavior: still ? 'auto' : 'smooth' });
    }
  };
  const goRef = useRef(goTo);
  useEffect(() => { goRef.current = goTo; });
  // 店を選ばずに、見えている範囲だけ動かす（自分でルートを組む時）
  const flyView = (to: View) => {
    const t = performance.now();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = anim ? viewAt(anim, t, r) : homeView();
    if (Math.abs(from.x - to.x) < 1 && Math.abs(from.y - to.y) < 1 && Math.abs(from.w - to.w) < 1) return;
    setAnim({ from, to, t0: t, dur: still ? 0 : duration(from, to, r) });
    setNow(t);
  };
  const flyRef = useRef(flyView);
  useEffect(() => { flyRef.current = flyView; });
  const fitRef = useRef(fitView);
  useEffect(() => { fitRef.current = fitView; });

  // 押した順に足す・もう一度押すと外す（番号は詰まる）。11軒目は足さずに、ひとことお知らせ
  const toggle = (id: string) => {
    if (route.includes(id)) { setRoute(route.filter((x) => x !== id)); setNotice(null); return; }
    if (route.length >= MAX_STOPS) {
      setNotice(ja ? `選べるのは${MAX_STOPS}か所までです（Google マップの道案内の上限）。どれかを外すと足せます。` : `Up to ${MAX_STOPS} stops (the Google Maps limit). Remove one to add another.`);
      return;
    }
    setRoute([...route, id]);
    setNotice(null);
  };
  // 組んだ地点が今の範囲の外なら、全部が入る所まで引く（押すたびに動かさない）
  useEffect(() => {
    if (!build || !base || !size.w || !route.length) return;
    const t = performance.now();
    const v = anim ? viewAt(anim, t, r) : homeView();
    const vh = v.w * r, m = (v.w / size.w) * 16;
    const out = route.some((id) => {
      const q = pointById.get(id);
      if (!q) return false;
      const p = toM(q.lat, q.lon);
      return p.x < v.x + m || p.x > v.x + v.w - m || p.y < v.y + m || p.y > v.y + vh - m;
    });
    if (out) flyRef.current(fitRef.current(route));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, build]);
  const setModeTo = (m: 'look' | 'build') => {
    if (m === mode) return;
    if (sel) goTo(null);
    setMode(m);
    setNotice(null);
    if (m === 'look') flyView(homeView());
    else if (route.length) flyView(fitView(route));
  };
  // お知らせは5秒で消す
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);
  const toggleCat = (k: string) => {
    const next = new Set(off);
    if (next.has(k)) next.delete(k); else next.add(k);
    setOff(next);
    // 見ている店の種類を消した時は、カードを閉じる
    const cur = pins.find((p) => p.id === sel);
    if (cur && next.has(cur.category)) goTo(null);
  };
  const catKeys = [...cats.map((c) => c.key), ...(build && rinStops.length ? [RIN] : [])];
  const allOn = catKeys.every((k) => !off.has(k));
  const setAll = () => {
    if (allOn) { setOff(new Set(catKeys)); if (sel) goTo(null); } else setOff(new Set());
  };

  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const tick = () => { setNow(performance.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating, anim]);

  // カードの高さを測る。選んでいる間に高さが変わったら（中身の長さは店ごとに違う）、狙いを合わせ直す
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetH((v) => (Math.abs(v - el.offsetHeight) < 1 ? v : el.offsetHeight)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!sel || wide || sheetH <= 100) return;
    const t = performance.now();
    setAnim((a) => {
      if (!a) return a;
      const from = viewAt(a, t, r);
      const to = shopView(sel);
      const left = Math.max(0, a.t0 + a.dur - t);
      return { from, to, t0: t, dur: Math.max(left, 250) };
    });
    setNow(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetH]);

  // Esc で全体へ。狭い画面で地図が見えなくなったら、カードを閉じる（下から出たカードが、ほかの所の上に残らないように）
  // 2026-11-11 下の一覧のカードの「地図で見る」（ShowOnMap）：地図までスクロールして、その店に寄る
  useEffect(() => {
    const onShow = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!pins.some((p) => p.id === id)) return;
      setMode('look');
      setOff((o) => { const p = pins.find((q) => q.id === id); if (!p || !o.has(p.category)) return o; const n = new Set(o); n.delete(p.category); return n; });
      if (window.innerWidth >= WIDE) box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      goRef.current(id); // 狭い画面では goTo が地図の上の端まで流す
    };
    window.addEventListener('latitude:shop-map', onShow);
    return () => window.removeEventListener('latitude:shop-map', onShow);
  }, [pins]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') goRef.current(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el || !sel) return;
    // 一度見えてから外れた時だけ閉じる（下の一覧の「地図で見る」で、地図まで流れていく途中に閉じないように）
    let seen = false;
    const io = new IntersectionObserver(([en]) => {
      if (en.isIntersecting) seen = true;
      else if (seen && window.innerWidth < WIDE) goRef.current(null);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [sel]);

  const h = view.w * r;
  const mpp = size.w ? view.w / size.w : 4; // いまの 1px あたりのメートル
  const toScreen = (x: number, y: number) => ({ sx: ((x - view.x) / view.w) * size.w, sy: ((y - view.y) / h) * size.h });

  // 丸の大きさ：写真のある店は、寄った時だけ写真の丸になる
  const big = (p: ShopPin) => !!p.photo && mpp < 1.6;
  const dia = (p: ShopPin) => (big(p) ? 32 : p.id === sel ? 22 : 12);

  // 画面の上で丸が重ならないように、少しずつ押し合わせる（位置は数メートルしか違わない店があるため）
  // 種類のスイッチで消した店は出さない（組んだ道に入っている店は残す）
  const placed = pins.filter((p) => !off.has(p.category) || (build && route.includes(p.id))).map((p) => {
    const m = pos(p);
    const s = toScreen(m.x, m.y);
    return { p, x: s.sx, y: s.sy, d: build ? (route.includes(p.id) ? 22 : 12) : dia(p) };
  });
  // 組む時だけ、凛の1日の地点も選べる（ひし形）
  const placedStops = build ? rinStops.filter((x) => !off.has(RIN) || route.includes(x.id)).map((x) => {
    const m = pos(x);
    const sc = toScreen(m.x, m.y);
    return { x: sc.sx, y: sc.sy, d: route.includes(x.id) ? 22 : 11, q: pointById.get(x.id)! };
  }) : [];
  const buildPlaced = build ? [...placed.map(({ p, x, y, d }) => ({ x, y, d, q: pointById.get(p.id)! })), ...placedStops] : [];
  const spread: { x: number; y: number; d: number }[] = build ? buildPlaced : placed;
  for (let it = 0; it < 6; it++) {
    for (let i = 0; i < spread.length; i++) for (let j = i + 1; j < spread.length; j++) {
      const a = spread[i], b = spread[j];
      const need = (a.d + b.d) / 2 + 2;
      let dx = b.x - a.x, dy = b.y - a.y;
      let dd = Math.hypot(dx, dy);
      if (dd >= need) continue;
      if (dd < 0.01) { dx = 1; dy = 0; dd = 1; }
      const push = (need - dd) / 2;
      const ux = dx / dd, uy = dy / dd;
      a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push;
    }
  }

  const shop = pins.find((p) => p.id === shown) ?? null;
  const open = !!sel && !!shop;
  const ready = !!base && size.w > 0;
  const routeLines = build && route.length >= 2 && (pairsState === 'ok' || pairsState === 'fail' || !pairsSrc)
    ? route.slice(1).map((id, k) => {
      const L = leg(route[k], id);
      return { est: L.estimate, d: L.line.map(([la, lo]) => { const m = toM(la, lo); const sc = toScreen(m.x, m.y); return `${sc.sx.toFixed(1)},${sc.sy.toFixed(1)}`; }).join(' ') };
    })
    : [];
  const full = route.length >= MAX_STOPS;
  const chip = (on: boolean) => ({ border: `1px solid ${on ? 'rgba(30,29,27,0.32)' : LINE}`, color: on ? INK : MUTE, background: on ? 'rgba(255,255,255,0.35)' : 'transparent' });

  return (
    <div>
      {/* 2026-11-11 店を見る ／ 自分でルートを組む。組み合わせの道のある街だけ */}
      {pairsSrc && (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
          <div role="tablist" aria-label={ja ? '地図の使い方' : 'Map mode'} className="inline-flex self-start" style={{ border: `1px solid ${INK}` }}>
            {(['look', 'build'] as const).map((m) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setModeTo(m)}
                className="min-h-[40px] cursor-pointer px-4 text-[11px] uppercase tracking-[0.22em] transition-colors md:px-5"
                style={{ background: mode === m ? INK : 'transparent', color: mode === m ? PAPER : INK }}>
                {m === 'look' ? (ja ? '店を見る' : 'Browse') : (ja ? '自分でルートを組む' : 'Build your own route')}
              </button>
            ))}
          </div>
          <p className="max-w-md text-[13px] leading-relaxed" style={{ color: MUTE }}>
            {build
              ? (ja ? `行きたい店や場所を押した順に、1・2・3…と歩く道でつながります。もう一度押すと外れます。${who}の道をなぞるのは、上の地図です。` : `Tap places in the order you want; a walking line joins them. Tap again to remove. ${who}'s own day is the map above.`)
              : (ja ? `印を押すと、その店や場所へ寄ります。□は美術館や名所（目印）。「自分でルートを組む」で、行きたい所だけの道を作れます。` : `Tap a mark to see the place; squares are museums and sights (landmarks). Use “Build your own route” to make a walk of your own.`)}
          </p>
        </div>
      )}
      {/* 種類のスイッチ（押すと、その種類の丸を消す・出す） */}
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={ja ? '店の種類' : 'Kinds of place'}>
        {[...cats, ...(build && rinStops.length ? [{ key: RIN, label: ja ? `${who}の1日の場所` : `${who}'s day` }] : [])].map((c) => {
          const on = !off.has(c.key);
          return (
            <button key={c.key} type="button" aria-pressed={on} onClick={() => toggleCat(c.key)}
              className="flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full px-3 text-[10px] uppercase tracking-[0.2em] transition-colors"
              style={chip(on)}>
              <span className="block shrink-0" style={{ ...markStyle(c.key === RIN ? 'stop' : isSightKind(c.key) ? c.key : 'shop', 9, CATEGORY_COLOR[c.key] ?? INK), opacity: on ? 1 : 0.3 }} />
              {c.label}
            </button>
          );
        })}
        <button type="button" onClick={setAll} className="min-h-[34px] cursor-pointer px-2 text-[10px] uppercase tracking-[0.2em] underline underline-offset-4" style={{ color: INK }}>
          {allOn ? (ja ? 'すべて消す' : 'Hide all') : (ja ? 'すべて出す' : 'Show all')}
        </button>
      </div>
      <div
        ref={box}
        className="relative aspect-[4/5] w-full overflow-hidden md:aspect-[16/9]"
        style={{ background: PAPER, border: `1px solid ${LINE}`, maxHeight: '82vh', touchAction: 'pan-y' }}
        onClick={(e) => { if (sel && !(e.target as Element).closest('button, a, aside')) goTo(null); }}
      >
        {ready && (
          <svg viewBox={`${view.x} ${view.y} ${view.w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true"
>
            <PaperLayers base={base} mpp={mpp} />
          </svg>
        )}

        {/* 組んだ道の点線（px の座標）。道の計算が無い区間は、細かい点のまっすぐの線（目安） */}
        {ready && routeLines.length > 0 && (
          // 大きさは丸と同じ px で固定（枠の大きさが変わった直後に、線だけ伸び縮みして丸からずれないように）
          <svg className="pointer-events-none absolute left-0 top-0" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            {routeLines.map((l, k) => (
              <polyline key={k} points={l.d} fill="none" stroke={RED} strokeWidth={l.est ? 2 : 2.2}
                strokeDasharray={l.est ? '0.5 5' : '6 4'} strokeLinecap={l.est ? 'round' : 'butt'} strokeLinejoin="round" />
            ))}
          </svg>
        )}

        {/* 目印（駅・公園・川）。店の名前は置かない */}
        {ready && base.labels.map((l) => {
          const s = toScreen(l.x, l.y);
          if (s.sx < -80 || s.sx > size.w + 80 || s.sy < -20 || s.sy > size.h + 20) return null;
          return (
            <span key={l.en} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] uppercase tracking-[0.28em]"
              style={{ left: s.sx, top: s.sy, color: l.kind === 'water' ? '#5f6b74' : MUTE, fontStyle: l.kind === 'water' ? 'italic' : undefined, textShadow: `0 0 3px ${PAPER}, 0 0 3px ${PAPER}` }}>
              {ja ? l.ja : l.en}
            </span>
          );
        })}

        {/* 店の丸。見えている範囲の外の店は、枠のふちに小さな印と距離 */}
        {ready && !build && placed.map(({ p, x, y, d }) => {
          const color = CATEGORY_COLOR[p.category] ?? INK;
          const inside = x >= -d && x <= size.w + d && y >= -d && y <= size.h + d;
          const active = p.id === sel;
          if (!inside) {
            // 寄っている間・動いている間は出さない（寄るとほとんどの店が外になり、ふちが印だらけになるため）
            if (sel || animating) return null;
            const ex = clamp(x, 18, size.w - 18), ey = clamp(y, 18, size.h - 18);
            const m = pos(p);
            const km = Math.hypot(m.x - (view.x + view.w / 2), m.y - (view.y + h / 2)) / 1000;
            const below = ey > size.h / 2;
            return (
              <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); goTo(p.id); }}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap text-[9px] uppercase tracking-[0.22em]"
                style={{ left: ex, top: ey, color: MUTE, flexDirection: below ? 'column-reverse' : 'column' }}
                aria-label={ja ? `${p.name}（${p.area}・${km.toFixed(1)}km）` : `${p.name} (${p.area}, ${km.toFixed(1)} km)`}>
                <span className="block" style={markStyle(kindOf(p), 10, color, false, `0 0 0 2px ${PAPER}`)} />
                <span style={{ textShadow: `0 0 3px ${PAPER}, 0 0 3px ${PAPER}` }}>{p.area} · {km.toFixed(1)} km</span>
              </button>
            );
          }
          return (
            <button key={p.id} type="button"
              onClick={(e) => { e.stopPropagation(); goTo(active ? null : p.id); }}
              // 2026-11-11 ユーザー：マウスのある画面では、乗せた丸を 1.4倍に・前面へ・名前を横に・指のカーソル。
              // Tailwind v4 の hover: は @media (hover: hover) の中だけで効くので、スマホ（指で押す画面）では出ない
              className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 outline-offset-2 ${active ? 'z-[4]' : 'z-[1] hover:z-[3] focus-visible:z-[3]'}`}
              style={{ left: x, top: y }}
              aria-label={`${p.name} · ${p.catLabel}`} aria-pressed={active}>
              <span className="block overflow-hidden group-hover:scale-[1.4]"
                style={{ ...markStyle(kindOf(p), d, color, false, active ? `0 0 0 3px ${PAPER}, 0 0 0 5px ${INK}, 0 2px 10px 5px rgba(30,29,27,0.25)` : `0 0 0 2px ${PAPER}`), transition: 'width 300ms, height 300ms, scale 180ms ease-out' }}>
                {big(p) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo} alt="" loading="lazy" className="block h-full w-full object-cover" />
                )}
              </span>
              {/* 名前：選んだ店はいつも、ほかはマウスを乗せた時（とキーボードで選んだ時）だけ */}
              <span className={`pointer-events-none absolute left-full top-1/2 ml-1 -translate-y-1/2 whitespace-nowrap text-[13px] ${active ? 'block' : 'hidden group-hover:block group-focus-visible:block'}`}
                style={{ fontFamily: SERIF, color: INK, textShadow: `0 0 3px ${PAPER}, 0 0 3px ${PAPER}, 0 0 3px ${PAPER}` }}>
                {p.name}
              </span>
            </button>
          );
        })}

        {/* 自分でルートを組む：押した順の番号。外の店は、枠のふちの印（押すと足して、全部が入る所まで引く） */}
        {ready && build && buildPlaced.map(({ q, x, y, d }) => {
          const si = route.indexOf(q.id);
          const picked = si >= 0;
          const dim = full && !picked;
          const inside = x >= -d && x <= size.w + d && y >= -d && y <= size.h + d;
          const label = `${q.name} · ${q.sub}${picked ? (ja ? `（${si + 1}番目・押すと外す）` : ` (stop ${si + 1}, tap to remove)`) : (ja ? '（押すと道に足す）' : ' (tap to add)')}`;
          if (!inside) {
            if (animating) return null;
            const ex = clamp(x, 18, size.w - 18), ey = clamp(y, 18, size.h - 18);
            const m = pos(q);
            const kmA = Math.hypot(m.x - (view.x + view.w / 2), m.y - (view.y + h / 2)) / 1000;
            const below = ey > size.h / 2;
            return (
              <button key={q.id} type="button" onClick={(e) => { e.stopPropagation(); toggle(q.id); }} aria-label={label} aria-pressed={picked}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-1.5 whitespace-nowrap text-[9px] uppercase tracking-[0.22em]"
                style={{ left: ex, top: ey, color: MUTE, flexDirection: below ? 'column-reverse' : 'column', opacity: dim ? 0.35 : 1 }}>
                <span className="block" style={markStyle(q.kind, 10, q.color, false, `0 0 0 2px ${PAPER}`)} />
                <span style={{ textShadow: `0 0 3px ${PAPER}, 0 0 3px ${PAPER}` }}>{q.name} · {kmA.toFixed(1)} km</span>
              </button>
            );
          }
          return (
            <button key={q.id} type="button" onClick={(e) => { e.stopPropagation(); toggle(q.id); }} aria-label={label} aria-pressed={picked} aria-disabled={dim || undefined}
              className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-2 outline-offset-2 ${picked ? 'z-[4]' : 'z-[1] hover:z-[3] focus-visible:z-[3]'}`}
              style={{ left: x, top: y, opacity: dim ? 0.35 : 1 }}>
              <span className="flex items-center justify-center leading-none tabular-nums group-hover:scale-[1.3]"
                style={{ ...markStyle(q.kind, d, q.color, picked, picked ? `0 0 0 2px ${PAPER}, 0 0 0 3px ${INK}, 0 2px 8px 2px rgba(30,29,27,0.2)` : `0 0 0 2px ${PAPER}`),
                  transition: 'width 200ms, height 200ms, scale 180ms ease-out', color: PAPER, fontFamily: SERIF, fontSize: 13 }}>
                {picked ? si + 1 : null}
              </span>
              <span className={`pointer-events-none absolute left-full top-1/2 ml-1 -translate-y-1/2 whitespace-nowrap text-[13px] ${picked ? 'hidden md:block' : 'hidden group-hover:block group-focus-visible:block'}`}
                style={{ fontFamily: SERIF, color: INK, textShadow: `0 0 3px ${PAPER}, 0 0 3px ${PAPER}, 0 0 3px ${PAPER}` }}>
                {q.name}
              </span>
            </button>
          );
        })}
        {ready && build && notice && (
          <p role="status" className="absolute inset-x-3 bottom-3 z-[6] px-3 py-2 text-[12px] leading-snug" style={{ background: PAPER, border: `1px solid ${INK}`, color: INK }}>
            {notice}
          </p>
        )}

        {ready && sel && (
          <button type="button" onClick={() => goTo(null)} className="absolute left-3 top-3 z-[4] text-[10px] uppercase tracking-[0.3em]"
            style={{ color: INK, background: PAPER, padding: '6px 10px', border: `1px solid ${LINE}` }}>
            {ja ? '← 全体へ' : '← Whole map'}
          </button>
        )}
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
            {ja ? '地図を読みこんでいます' : 'Loading the map'}
          </p>
        )}

        {/* 店のカード。広い画面は地図の右に重ね、狭い画面は下からせり上がる */}
        <aside
          ref={sheet}
          aria-hidden={!open}
          className={`overflow-y-auto transition-[transform,opacity] duration-300 ${wide ? 'absolute right-4 top-4 z-[5]' : 'fixed inset-x-0 bottom-0 z-[45]'}`}
          style={{
            width: wide ? CARD_W : undefined,
            maxHeight: wide ? 'calc(100% - 32px)' : '64vh',
            background: PAPER,
            border: `1px solid ${LINE}`,
            boxShadow: '0 10px 40px rgba(30,29,27,0.12)',
            transform: open ? 'none' : wide ? 'translateX(12px)' : 'translateY(105%)',
            opacity: wide && !open ? 0 : 1,
            pointerEvents: open ? 'auto' : 'none',
            visibility: open || animating ? 'visible' : 'hidden',
          }}
        >
          {shop && <ShopCard key={shop.id} p={shop} ja={ja} who={who} person={person} onClose={() => goTo(null)} />}
        </aside>
      </div>

      {/* 自分でルートを組む：選んだ順・合計・並べ替え・リセット・Google マップ */}
      {build && (
        <RouteBuilderPanel points={points} visible={points.filter((q) => !off.has(q.cat))} route={route} setRoute={(r) => { setRoute(r); setNotice(null); }}
          leg={leg} ready={pairsState === 'ok' || pairsState === 'fail' || !pairsSrc} ja={ja} who={who}
          onToggle={toggle} rinIds={rinStops.map((x) => x.id)}
          onReset={() => { setRoute([]); setNotice(null); flyView(homeView()); }} />
      )}

      {/* 地図の出どころ */}
      <p className="mt-3 text-right text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
        {ja ? '地図データ ' : 'Map data '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: MUTE }}>© OpenStreetMap contributors</a>
        {build && (ja ? '（道の計算 FOSSGIS OSRM）' : ' (routes: FOSSGIS OSRM)')}
      </p>
    </div>
  );
}

// 紙の地図の線（川・公園・道・線路）。街のページの「凛の1日の道」（CityDayRoute）でも同じ描き方で使う
export function PaperLayers({ base, mpp }: { base: BaseMap; mpp: number }) {
  const pathOpacity = clamp((2.6 - mpp) / 1.2);
  const minorW = mpp > 3 ? 0.55 : mpp > 1.5 ? 0.8 : 1.1;
  return (
    <>
      <path d={base.layers.park} fill={PARK} stroke="none" />
      <path d={base.layers.water} fill={WATER} stroke="none" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={base.layers.stream} stroke={WATER} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        {/* 犀川・浅野川の幅は water の面（OSM の川の面）で出る。線は、面の切れ目を埋めるのと、引いた時に細く消えないためだけ */}
        <path d={base.layers.river} stroke={WATER} strokeWidth={mpp > 3 ? 4 : 2.5} vectorEffect="non-scaling-stroke" />
        {pathOpacity > 0 && <path d={base.layers.path} stroke={PATH} strokeWidth={0.8} opacity={pathOpacity} vectorEffect="non-scaling-stroke" />}
        <path d={base.layers.minor} stroke={ROAD} strokeWidth={minorW} opacity={0.85} vectorEffect="non-scaling-stroke" />
        <path d={base.layers.major} stroke={ROAD} strokeWidth={mpp > 3 ? 1.6 : 2.4} vectorEffect="non-scaling-stroke" />
        <path d={base.layers.rail} stroke={INK} strokeWidth={1.8} vectorEffect="non-scaling-stroke" />
      </g>
    </>
  );
}

function ShopCard({ p, ja, who, person, onClose }: { p: ShopPin; ja: boolean; who: string; person: string; onClose: () => void }) {
  const color = CATEGORY_COLOR[p.category] ?? INK;
  const sight = kindOf(p) !== 'shop';
  return (
    <div className="px-5 pb-6 pt-4">
      {/* 狭い画面の、下から出たカードのつまみ */}
      <div className="mx-auto mb-3 h-[3px] w-10 rounded-full md:hidden" style={{ background: LINE }} />
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          <span className="block shrink-0" style={markStyle(kindOf(p), 9, color)} />
          {p.catLabel}{sight && (ja ? '・目印' : ' · landmark')}&nbsp;&nbsp;·&nbsp;&nbsp;{p.area}
        </p>
        <button type="button" onClick={onClose} aria-label={ja ? '閉じる' : 'Close'} className="-mr-2 px-2 text-[20px] leading-none" style={{ color: MUTE }}>×</button>
      </div>
      <h3 className="mt-3 text-[22px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 400, color: INK }}>{p.name}</h3>
      {p.photo && (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photo} alt={p.name} className="block w-full object-cover" style={{ aspectRatio: '4 / 3' }} />
          <figcaption className="mt-1.5 text-[9px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{ja ? '写真：店から' : 'Photo: from the shop'}</figcaption>
        </figure>
      )}
      <p className="mt-3 text-[14px] leading-relaxed" style={{ color: INK }}>{p.what}</p>
      {/* 見る所は凛のおすすめの店ではないので、凛の一言は付けない。休館の予定などを出す */}
      {!sight && p.note && (
        <p className="mt-3 text-[15px] leading-relaxed" style={{ fontFamily: SERIF, color: INK }}>
          <span className="mr-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{who}</span>
          {p.note}
        </p>
      )}
      {p.notice && <p className="mt-3 text-[12px] leading-relaxed" style={{ color: '#7a241e' }}>{p.notice}</p>}
      {p.approx && <p className="mt-3 text-[11px]" style={{ color: MUTE }}>{ja ? '地図の位置はおおよそです。' : 'The position on the map is approximate.'}</p>}
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.3em]">
        {p.site && <TrackLink href={p.site} label={ja ? '公式サイト' : 'Website'} shop={p.key} kind="site" person={person} />}
        {p.instagram && <TrackLink href={p.instagram} label="Instagram" shop={p.key} kind="site" person={person} />}
        <TrackLink href={p.mapUrl} label={ja ? '地図' : 'Map'} shop={p.key} kind="map" person={person} />
        <a href={`#${p.id}`} className="underline-offset-4 hover:underline" style={{ color: INK }}
          onClick={() => { if (window.innerWidth < WIDE) onClose(); }}>
          {ja ? 'リストで見る ↓' : 'In the list ↓'}
        </a>
      </p>
      {p.instagram && <InstagramEmbed url={p.instagram} ja={ja} />}
    </div>
  );
}

// Instagram の正式な埋めこみ（blockquote.instagram-media ＋ www.instagram.com/embed.js）。カードを開いた時に初めて読みこむ。
// embed.js は blockquote を iframe に置きかえるので、React が持たない箱の中に作る。出ない時（読みこめない・消された投稿）はリンクだけ。
type Instgrm = { Embeds?: { process: () => void } };
function InstagramEmbed({ url, ja }: { url: string; ja: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const q = document.createElement('blockquote');
    q.className = 'instagram-media';
    q.setAttribute('data-instgrm-permalink', url);
    q.setAttribute('data-instgrm-version', '14');
    q.style.cssText = 'margin:0;max-width:100%;min-width:0;width:100%;border:0;background:transparent';
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Instagram';
    q.appendChild(a);
    el.replaceChildren(q);
    const w = window as unknown as { instgrm?: Instgrm };
    const run = () => { try { w.instgrm?.Embeds?.process(); } catch { setFailed(true); } };
    let s = document.getElementById('lat-ig-embed') as HTMLScriptElement | null;
    if (w.instgrm?.Embeds) run();
    else {
      if (!s) {
        s = document.createElement('script');
        s.id = 'lat-ig-embed'; s.async = true; s.src = 'https://www.instagram.com/embed.js';
        document.body.appendChild(s);
      }
      s.addEventListener('load', run);
      s.addEventListener('error', () => setFailed(true));
    }
    const t = window.setTimeout(() => { if (!el.querySelector('iframe')) setFailed(true); }, 8000);
    return () => { window.clearTimeout(t); s?.removeEventListener('load', run); };
  }, [url]);
  return (
    <div className="mt-5">
      <div ref={ref} style={{ display: failed ? 'none' : undefined }} />
      {failed && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[10px] uppercase tracking-[0.3em] underline underline-offset-4" style={{ color: INK }}>
          {ja ? 'Instagram で見る →' : 'See on Instagram →'}
        </a>
      )}
    </div>
  );
}
