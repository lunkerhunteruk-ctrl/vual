'use client';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PaperLayers, type BaseMap } from '@/components/latitude/CityShopMap';
import { km, mins, type RouteWalk } from '@/lib/latitude-routes/format';

// 2026-11-11 試作：街のページの「凛の1日の道」の地図。ユーザーの案：
// ほかのサイトのモデルコースは文字と写真だけ。LATITUDE は先に凛の映像でその1日を見て、同じ道を地図でたどれる。
// 描き方は号のカルーセルの「動く地図」（vault.vual.jp docs/LATITUDE-ROUTE-MAP.md）と同じ：
//  紙の地図（店の地図 CityShopMap と同じ土台）に、暗い赤の点線が時刻の順に伸びる → 着いた所の印がゆっくり点滅（1.6秒に1回、輪がうすく広がる）
//  → 点滅している間だけ、その場面の写真を丸く出す（字の反対側。細い線で印とつなぐ） → 次の線が伸び始めると丸は消える → 最後は丸なしで止まる。
//  区間を描くのに約1.2秒（長い区間は少し長く。1kmで約1.35秒・2kmで約1.7秒）、着いて止まるのに1.9秒（カルーセルと同じ）。
// 2026-11-11 ユーザー：点線は実際に歩く道に沿わせる。walk（lib/latitude-routes/<街>.json。scripts/latitude-route.py が
//  OpenStreetMap の歩行者ルート＝FOSSGIS の OSRM で一度だけ計算して保存した線）があればその線を、無ければ地点の間をゆるい曲線でつなぐ。
// 画面に入った時に始まり、「もう一度見る」で最初から。
// 下の1日の回り方のカードの「地図で見る」で、その地点を点滅させる。地図の印を押すと、カードの帯がその地点まで流れる。

export type RouteStop = {
  n: number; // 番号（1から）
  lat: number;
  lon: number;
  name: string; // 地図の上の短い名前
  place: string; // カードと同じ場所の名前
  time: string;
  what: string;
  photo?: string; // 号の場面の写真（丸く出す）
};


const INK = '#1e1d1b';
const MUTE = '#78746c';
const PAPER = '#f2eee7';
const LINE = 'rgba(30,29,27,0.14)';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const RED = '#7a241e'; // 号の動く地図の点線（reel_overlays2.py の RED = 122, 36, 30）

const FIRST = 0.5; // 画面に入ってから最初の印が出るまで
const LEG = 1.2; // 区間を描く秒（道の線が無い時。道の線がある時は legSec）
const legSec = (m?: number) => (m ? clamp(1.0 + (m / 1000) * 0.35, 1.0, 2.0) : LEG);
const HOLD = 1.9; // 着いて止まる秒（写真の丸を見る時間）
const PULSE = 1.6; // 輪が広がる周期

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (u: number) => { const t = clamp(u); return t * t * (3 - 2 * t); };

type View = { x: number; y: number; w: number };
type Box = { x: number; y: number; w: number; h: number };
// 重なる面積（px²）。字と写真の丸の置き場所は、重なりのいちばん小さい所を選ぶ（狭い画面では、まったくかからない所が無い事がある）
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

// 土台の線は重いので、見えている範囲が変わらない限り描き直さない
const Base = memo(function Base({ base, view, h, mpp }: { base: BaseMap; view: View; h: number; mpp: number }) {
  return (
    <svg viewBox={`${view.x} ${view.y} ${view.w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <PaperLayers base={base} mpp={mpp} />
    </svg>
  );
});

export default function CityRouteMap({ src, stops, ja, walk }: { src: string; stops: RouteStop[]; ja: boolean; walk?: RouteWalk | null }) {
  const [base, setBase] = useState<BaseMap | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const box = useRef<HTMLDivElement>(null);
  // t：動きの経過秒（null＝まだ始まっていない）。focus：カードや印で選んだ地点（その時は線を全部出したまま、その印だけ点滅）
  const [t, setT] = useState<number | null>(null);
  const [focus, setFocus] = useState<{ i: number; t0: number } | null>(null);
  const [clock, setClock] = useState(0);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [lw, setLw] = useState<number[]>([]);
  const t0 = useRef(0);
  const n = stops.length;
  const useWalk = !!walk && walk.legs.length === n - 1;
  const legDur = Array.from({ length: Math.max(0, n - 1) }, (_, k) => legSec(useWalk ? walk!.legs[k].distance : undefined));
  const onAt = [FIRST];
  for (let k = 0; k < n - 1; k++) onAt.push(onAt[k] + HOLD + legDur[k]);
  const on = (i: number) => onAt[i]; // i 番目の印が出る時刻
  const END = on(n - 1) + HOLD;
  const playing = t !== null && t < END;

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

  const still = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => {
    setFocus(null);
    if (still()) { setT(END); return; }
    t0.current = performance.now();
    setT(0);
  };
  const startRef = useRef(start);
  const focusRef = useRef(focus);
  useEffect(() => { focusRef.current = focus; });
  useEffect(() => { startRef.current = start; });

  // 画面に4割ほど入ったら、一度だけ始める
  useEffect(() => {
    const el = box.current;
    if (!el || !base) return;
    const io = new IntersectionObserver(([e]) => {
      // 先にカードで地点を選んでいた時は、自動では始めない（選んだ地点を消さないように）
      if (e.intersectionRatio >= 0.4) { if (!focusRef.current) startRef.current(); io.disconnect(); }
    }, { threshold: [0, 0.4] });
    io.observe(el);
    return () => io.disconnect();
  }, [base]);

  // 動いている間と、地点を選んで点滅している間だけ、毎コマ進める
  useEffect(() => {
    if (!playing && !focus) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      setClock(now);
      // 前の値を見て進める（カードで地点を選んで END にした直後に、古いコマが動きの途中へ戻さないように）
      if (playing) setT((p) => (p === null || p >= END ? p : Math.min(END, (now - t0.current) / 1000)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, focus, END]);

  // カードの「地図で見る」
  const choose = (i: number, fromMap: boolean) => {
    setT(END);
    const now = performance.now();
    setFocus({ i, t0: now });
    setClock(now);
    if (fromMap) {
      // カードの帯を、その地点のカードまで横に流す（ページは縦に動かさない）
      const li = document.getElementById(`route-stop-${stops[i].n}`);
      const ul = li?.parentElement;
      if (li && ul) {
        const pad = parseFloat(getComputedStyle(ul).scrollPaddingLeft || '0') || 0;
        ul.scrollBy({ left: li.getBoundingClientRect().left - ul.getBoundingClientRect().left - pad, behavior: still() ? 'auto' : 'smooth' });
        li.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
      }
    }
  };
  const chooseRef = useRef(choose);
  useEffect(() => { chooseRef.current = choose; });
  useEffect(() => {
    const onStop = (e: Event) => {
      const k = (e as CustomEvent<number>).detail;
      const i = stops.findIndex((s) => s.n === k);
      if (i < 0) return;
      const r = box.current?.getBoundingClientRect();
      if (r && (r.top < 0 || r.bottom > window.innerHeight)) box.current?.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' });
      chooseRef.current(i, false);
    };
    window.addEventListener('latitude:route-stop', onStop);
    return () => window.removeEventListener('latitude:route-stop', onStop);
  }, [stops]);

  // 字の幅を測る（字の置き場所を決めるため。字は見えない間も置いておき、透明にしている）
  // 字の形（Web フォント）が後から届くと幅が変わるので、字の箱の大きさの変化でも測り直す
  useLayoutEffect(() => {
    const els = labelRefs.current.slice(0, stops.length);
    const measure = () => {
      const ws = els.map((el) => (el ? Math.ceil(el.offsetWidth) : 0));
      setLw((p) => (p.length === ws.length && p.every((v, k) => v === ws[k]) ? p : ws));
    };
    measure();
    const ro = new ResizeObserver(measure);
    els.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [base, size.w, ja, stops]);

  // ---- 見えている範囲：全部の地点が、字と写真の丸の余白ごと収まる範囲
  const ready = !!base && size.w > 0;
  const narrow = size.w < 520;
  const R = narrow ? 34 : 48; // 写真の丸の半径
  const pad = narrow ? { l: 26, r: 26, t: 60, b: 92 } : { l: 70, r: 70, t: 70, b: 104 };
  const toM = (lat: number, lon: number) => (base ? { x: (lon - base.center[1]) * base.k[0], y: (base.center[0] - lat) * base.k[1] } : { x: 0, y: 0 });
  const meters = stops.map((s) => toM(s.lat, s.lon));
  const walkM = useWalk ? walk!.legs.map((l) => l.line.map(([la, lo]) => toM(la, lo))) : null;
  let view: View = { x: 0, y: 0, w: 1 };
  if (ready) {
    // 地点だけでなく、道の線もはみ出さないように
    const all = [...meters, ...(walkM ?? []).flat()];
    const xs = all.map((m) => m.x), ys = all.map((m) => m.y);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
    const iw = Math.max(40, size.w - pad.l - pad.r), ih = Math.max(40, size.h - pad.t - pad.b);
    const mpp = Math.max(bw / iw, bh / ih, 0.5);
    view = { x: bx - pad.l * mpp - (iw * mpp - bw) / 2, y: by - pad.t * mpp - (ih * mpp - bh) / 2, w: size.w * mpp };
  }
  const mpp = size.w ? view.w / size.w : 4;
  const vh = view.w * (size.w ? size.h / size.w : 1);
  const pts = meters.map((m) => ({ x: (m.x - view.x) / mpp, y: (m.y - view.y) / mpp }));

  // ---- 区間の線（歩く道。無ければゆるい曲線）。画面の px で作り、伸びた長さのところで切る
  const legs = walkM ? walkM.map((ms) => ms.map((m) => ({ x: (m.x - view.x) / mpp, y: (m.y - view.y) / mpp }))) : pts.slice(1).map((b, k) => {
    const a = pts[k];
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const c = { x: (a.x + b.x) / 2 - (dy / L) * L * 0.12, y: (a.y + b.y) / 2 + (dx / L) * L * 0.12 };
    const ps: { x: number; y: number }[] = [];
    for (let j = 0; j <= 24; j++) {
      const u = j / 24;
      ps.push({ x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * c.x + u * u * b.x, y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * c.y + u * u * b.y });
    }
    return ps;
  });
  const tt = t ?? -1;
  const drawn: string[] = [];
  legs.forEach((ps, k) => {
    const s0 = on(k) + HOLD, D = legDur[k];
    const u = tt >= s0 + D ? 1 : tt <= s0 ? 0 : ease((tt - s0) / D);
    if (u <= 0) return;
    let total = 0;
    const seg = ps.slice(1).map((p, j) => { const d = Math.hypot(p.x - ps[j].x, p.y - ps[j].y); total += d; return d; });
    let left = total * u;
    const out = [ps[0]];
    for (let j = 0; j < seg.length && left > 0; j++) {
      const f = Math.min(1, left / seg[j]);
      out.push({ x: ps[j].x + (ps[j + 1].x - ps[j].x) * f, y: ps[j].y + (ps[j + 1].y - ps[j].y) * f });
      left -= seg[j];
    }
    drawn.push(out.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '));
  });

  // ---- 印・字・写真の丸
  const visible = (i: number) => tt >= on(i);
  // 今の地点：動いている間は止まっている地点（次の線が伸び始めるまで）、選んだ時はその地点
  let cur: number | null = null;
  let since = 0;
  if (focus) { cur = focus.i; since = (clock - focus.t0) / 1000; }
  else if (playing) {
    for (let i = 0; i < n; i++) if (tt >= on(i)) cur = i;
    if (cur !== null) since = tt - on(cur);
  }
  // 丸を出す強さ：着いてから 0.35 秒で出て、次の線が伸び始める 0.3 秒前から消える（選んだ時は出たまま）
  const circleA = cur === null ? 0 : focus ? ease(since / 0.35) : ease(since / 0.35) * (1 - ease((since - (HOLD - 0.3)) / 0.3));

  // 字の置き場所：右・左・下・上の順に、枠に収まり、ほかの印や字にかからない所
  // 幅は描いた字を測った値（測る前は字数からの見こみ）
  const labelSize = (s: RouteStop, i: number) => ({ w: lw[i] || (ja ? s.name.length * 14 : s.name.length * 8.4) + 38, h: narrow ? 36 : 42 });
  const labels: (Box & { side: string })[] = [];
  const dots = pts.map((p) => ({ x: p.x - 7, y: p.y - 7, w: 14, h: 14 }));
  const replayBox: Box = { x: size.w - (ja ? 132 : 128), y: 6, w: ja ? 126 : 122, h: 36 }; // 右上の「もう一度見る」
  stops.forEach((s, i) => {
    const { w, h } = labelSize(s, i);
    const p = pts[i];
    const cand = [
      { side: 'R', x: p.x + 11, y: p.y - h / 2 },
      { side: 'L', x: p.x - 11 - w, y: p.y - h / 2 },
      { side: 'B', x: p.x - w / 2, y: p.y + 11 },
      { side: 'T', x: p.x - w / 2, y: p.y - 11 - h },
      { side: 'BR', x: p.x + 6, y: p.y + 6 },
      { side: 'TR', x: p.x + 6, y: p.y - 6 - h },
      { side: 'BL', x: p.x - 6 - w, y: p.y + 6 },
      { side: 'TL', x: p.x - 6 - w, y: p.y - 6 - h },
    ].map((c) => ({ ...c, w, h }));
    // 重なる面積がいちばん小さい所（同じなら R・L・B・T の順）。枠の外は使わない
    const cost = (b: Box, k: number) => {
      const out = b.x < 4 || b.y < 4 || b.x + b.w > size.w - 4 || b.y + b.h > size.h - 64;
      return (out ? 1e7 : 0) + dots.reduce((v, d, j) => v + (j === i ? 0 : overlap(b, d) * 5), 0)
        + labels.reduce((v, l) => v + overlap(b, l) * 5, 0) + overlap(b, replayBox) * 5 + k * 2;
    };
    const pick = cand.map((b, k) => ({ b, c: cost(b, k) })).sort((x, y) => x.c - y.c)[0].b;
    labels.push({ ...pick, x: clamp(pick.x, 4, Math.max(4, size.w - pick.w - 4)) });
  });

  // 写真の丸：16方向×4つの距離のうち、枠に収まり、字にかからず、ほかの印から離れる所
  const circleAt = (i: number) => {
    const p = pts[i];
    let best = { x: p.x, y: p.y - R - 22, score: -Infinity };
    for (const D of [R + 22, R + 44, R + 70, R + 100]) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const c = { x: p.x + Math.cos(a) * D, y: p.y + Math.sin(a) * D };
        const box: Box = { x: c.x - R - 4, y: c.y - R - 4, w: 2 * R + 8, h: 2 * R + 8 };
        const out = box.x < 2 || box.y < 2 || box.x + box.w > size.w - 2 || box.y + box.h > size.h - 66;
        // ほかの印からの近さ（遠いほどよい）。字・「もう一度見る」にかかる所と枠の外は大きく減らす
        let score = Math.min(120, ...pts.map((q, j) => (j === i || !visible(j) ? Infinity : Math.hypot(q.x - c.x, q.y - c.y) - R)));
        score -= (D - R - 22) * 1.2; // 遠い輪は少しずつ減らす（印から離れすぎないように）
        score -= overlap(box, labels[i]) * 5;
        labels.forEach((l, j) => { if (j !== i && visible(j)) score -= overlap(box, l) * 3; });
        score -= overlap(box, replayBox) * 3;
        if (out) score -= 5000;
        if (score > best.score) best = { ...c, score };
      }
    }
    return best;
  };

  const capStop = cur !== null ? stops[cur] : null;
  const done = t !== null && !playing;

  return (
    <div className="flex h-full flex-col">
      <div ref={box} className="relative aspect-[4/5] w-full overflow-hidden md:aspect-auto md:min-h-[460px] md:flex-1"
        style={{ background: PAPER, border: `1px solid ${LINE}`, maxHeight: '82vh' }}>
        {ready && <Base base={base} view={view} h={vh} mpp={mpp} />}

        {/* 点線と、印と写真の丸をつなぐ細い線・点滅の輪（px の座標） */}
        {ready && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            {drawn.map((d, k) => (
              <polyline key={k} points={d} fill="none" stroke={RED} strokeWidth={narrow ? 2 : 2.4} strokeDasharray={narrow ? '5 3.5' : '6 4'} strokeLinecap="butt" strokeLinejoin="round" />
            ))}
            {cur !== null && circleA > 0.01 && (() => {
              const c = circleAt(cur);
              const p = pts[cur];
              const L = Math.hypot(c.x - p.x, c.y - p.y) || 1;
              return <line x1={p.x} y1={p.y} x2={c.x - ((c.x - p.x) / L) * (R + 3)} y2={c.y - ((c.y - p.y) / L) * (R + 3)} stroke={INK} strokeWidth={1} opacity={0.8 * circleA} />;
            })()}
            {pts.map((p, i) => {
              if (!visible(i)) return null;
              const isCur = i === cur;
              const ph = isCur ? (since % PULSE) / PULSE : 0;
              const a = 0.6 * Math.pow(1 - ph, 1.6);
              return (
                <g key={i}>
                  {isCur && a > 0.01 && <circle cx={p.x} cy={p.y} r={5 + 13 * ph} fill="none" stroke={INK} strokeWidth={1} opacity={a} />}
                  <circle cx={p.x} cy={p.y} r={isCur ? 5.5 : 4.5} fill={INK} stroke={PAPER} strokeWidth={1.5} />
                </g>
              );
            })}
          </svg>
        )}

        {/* 写真の丸（その場面の号の静止画）。字より下に置く（重なった時に字が読めるように） */}
        {ready && cur !== null && circleA > 0.01 && stops[cur].photo && (() => {
          const c = circleAt(cur);
          const sc = 0.86 + 0.14 * ease(since / 0.35);
          return (
            <span className="pointer-events-none absolute block overflow-hidden rounded-full"
              style={{ left: c.x - R, top: c.y - R, width: 2 * R, height: 2 * R, opacity: circleA, transform: `scale(${sc})`,
                boxShadow: `0 0 0 1.5px ${INK}, 0 0 0 5px ${PAPER}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={stops[cur].photo} alt="" className="block h-full w-full object-cover" />
            </span>
          );
        })()}

        {/* 字：Didot の番号と、短い名前・時刻（カルーセルと同じ並び） */}
        {ready && stops.map((s, i) => {
          const b = labels[i];
          const shown = visible(i);
          const a = !shown ? 0 : focus || !playing ? 1 : ease((tt - on(i)) / 0.4);
          return (
            <button key={s.n} ref={(el) => { labelRefs.current[i] = el; }} type="button" onClick={() => choose(i, true)}
              className="absolute cursor-pointer whitespace-nowrap text-left leading-none"
              style={{ left: b.x, top: b.y, opacity: a, visibility: shown ? 'visible' : 'hidden', padding: '3px 6px', background: 'rgba(242,238,231,0.86)', color: INK }}
              tabIndex={shown ? 0 : -1}
              aria-label={`${s.n}. ${s.place} · ${s.time}`} aria-pressed={i === cur && !!focus}>
              <span className="flex items-baseline gap-1.5">
                <span className={narrow ? 'text-[16px]' : 'text-[20px]'} style={{ fontFamily: SERIF }}>{s.n}</span>
                <span className={ja ? (narrow ? 'text-[11px] tracking-[0.06em]' : 'text-[13px] tracking-[0.06em]') : (narrow ? 'text-[9px] uppercase tracking-[0.18em]' : 'text-[10px] uppercase tracking-[0.2em]')}>{s.name}</span>
              </span>
              <span className={`mt-[3px] block pl-[1px] tabular-nums tracking-[0.2em] ${narrow ? 'text-[9px]' : 'text-[10px]'}`} style={{ color: MUTE }}>{s.time}</span>
            </button>
          );
        })}
        {/* 印そのものも押せるように（指で押しやすい大きさ） */}
        {ready && stops.map((s, i) => visible(i) && (
          <button key={`dot-${s.n}`} type="button" onClick={() => choose(i, true)} tabIndex={-1} aria-hidden="true"
            className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full" style={{ left: pts[i].x, top: pts[i].y }} />
        ))}

        {/* 今の地点のひとこと（下の帯）。終わって止まった時は、全体の時刻 */}
        {ready && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3 pt-2.5 md:px-5" style={{ background: 'rgba(242,238,231,0.94)', borderTop: `1px solid ${LINE}` }}>
            {capStop ? (
              <p key={capStop.n} className="text-[13px] leading-snug md:text-[14px]" style={{ color: INK }}>
                <span className="mr-2 text-[10px] tabular-nums tracking-[0.25em]" style={{ color: MUTE }}>{capStop.n} · {capStop.time}</span>
                <span style={{ fontFamily: SERIF }}>{capStop.place}</span>
                {useWalk && cur !== null && cur > 0 && (
                  <span className="ml-2 text-[10px] tabular-nums tracking-[0.15em]" style={{ color: MUTE }}>
                    {ja ? `（前から ${km(walk!.legs[cur - 1].distance)}）` : `(${km(walk!.legs[cur - 1].distance)} from the last stop)`}
                  </span>
                )}
                <span className="mt-0.5 block text-[12px] md:text-[13px]" style={{ color: MUTE }}>{capStop.what}</span>
              </p>
            ) : (
              <p className="text-[10px] tracking-[0.3em]" style={{ color: MUTE }}>
                {done
                  ? (useWalk
                    ? (ja ? `${n}か所 · 歩いて約${km(walk!.distance)}・${mins(walk!.duration, true)} · 番号を押すと、その場面` : `${n} stops · about ${km(walk!.distance)} on foot, ${mins(walk!.duration, false)} · tap a number for the scene`)
                    : (ja ? `${n}か所 · ${stops[0].time}–${stops[n - 1].time} · 番号を押すと、その場面` : `${n} stops · ${stops[0].time}–${stops[n - 1].time} · tap a number for the scene`))
                  : (ja ? 'この1日の道' : 'The day, in order')}
              </p>
            )}
          </div>
        )}

        {ready && (
          <button type="button" onClick={start} className="absolute right-3 top-3 z-[2] cursor-pointer text-[10px] uppercase tracking-[0.3em]"
            style={{ color: INK, background: PAPER, padding: '6px 10px', border: `1px solid ${LINE}`, opacity: done || focus ? 1 : 0.55 }}>
            {ja ? 'もう一度見る ↻' : 'Play again ↻'}
          </button>
        )}
        {!ready && (
          <p className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
            {ja ? '地図を読みこんでいます' : 'Loading the map'}
          </p>
        )}
      </div>
    </div>
  );
}

// 下の1日の回り方のカードから、上の地図でその地点を点滅させる（CityRouteMap が受ける）
export function ShowRouteStop({ n, label, className, children }: { n: number; label: string; className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('latitude:route-stop', { detail: n }))}
      aria-label={children ? label : undefined} className={`cursor-pointer text-left ${className ?? ''}`} style={{ color: INK }}>
      {children ?? label}
    </button>
  );
}
