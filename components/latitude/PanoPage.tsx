'use client';
import { useEffect, useRef, useState } from 'react';

// 2026-11-03 見回すページ（試作・ウィーンの3ページ）。下に横長（16:9）の写真、上に止まった層：
// すりガラス（その場で下の写真をぼかす）と、文字・ページ番号・下の暗がりを抜いた透明の画像。
// 横にずらすのではなく、立っている位置はそのままで首を左右に振る見え方にする（写真を見る人の位置を軸に回す）。
// スマホ：スマホを左右に回した量（ジャイロ）で向きが変わる。持ち方（立てる・寝かせる）によらず、世界の上下の軸まわりの回転だけを使う。
// iPhone は最初に1回だけ押して動きの使用を許す（許したかはこの端末に覚えておく）。
// パソコン：ページの上でマウスを左右に動かす。動きを減らす設定の人には、まん中で止めたまま見せる。
export type Pano = {
  src: string;      // 横長の写真（16:9）
  overlay: string;  // 上に止まる層（1080×1440 の透明 PNG／WebP）
  frost: [number, number, number, number]; // すりガラスの位置と大きさ（1080×1440 の中の x, y, 幅, 高さ）
  tint: string;     // すりガラスの色（例 'rgba(54,31,22,0.5)'）
  hfov?: number;    // 写真の横の画角（度）。見回した時のゆがみ方が決まる
};

const TILT_KEY = 'lat-tilt';
const MAX_YAW = 18;    // 左右に何度まで向くか
const GAIN = 0.7;      // スマホを1度回すと、何度向くか（小さいほど落ち着く）
const DEAD = 1.2;      // これより遅い回転（度／秒）は手ぶれとして無視
const SMOOTH = 0.32;   // ついてくる遅さ（秒）
const D2R = Math.PI / 180;

type Motion = 'off' | 'ask' | 'on';
type Geo = { yawMax: number };

// 写真の大きさ・見る人までの距離・向ける角度を、ページの大きさから決める（回しても上下左右にすき間が出ない最小の拡大）
function layout(boxW: number, boxH: number, hfov: number) {
  const hf = (hfov / 2) * D2R;
  let yaw = MAX_YAW * D2R;
  for (;;) {
    for (let s = 1; s <= 1.8; s += 0.01) {
      const wd = boxH * (16 / 9) * s;
      const p = wd / 2 / Math.tan(hf);
      const a = Math.atan(boxW / 2 / p);
      if (a + yaw <= hf - 0.5 * D2R && s * Math.cos(a + yaw) >= Math.cos(a))
        return { wd, hd: boxH * s, p, yawMax: yaw / D2R };
    }
    yaw -= 1 * D2R;
    if (yaw <= 2 * D2R) {
      const wd = boxH * (16 / 9);
      return { wd, hd: boxH, p: wd / 2 / Math.tan(hf), yawMax: 0 };
    }
  }
}

export function PanoPage({ pano, label, eager }: { pano: Pano; label: string; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const geo = useRef<Geo>({ yawMax: 0 });
  const target = useRef(0);   // -1.6〜1.6（端はゆるく止まる）
  const yaw = useRef(0);      // いま向いている角度（度）
  const vel = useRef(0);
  const [w, setW] = useState(0);
  const [motion, setMotion] = useState<Motion>('off');
  const [inView, setInView] = useState(false);
  const [hintDone, setHintDone] = useState(false); // 「回して」の一言は、最初に見えた時に一度だけ
  const place = () => {
    const el = img.current;
    if (el) el.style.transform = `rotateY(${yaw.current.toFixed(3)}deg)`; // 正＝右を向く
  };

  // ページの大きさが変わったら、写真の大きさと遠近を決め直す。画面に入っているかも見る
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width: bw, height: bh } = e.contentRect;
      setW(bw);
      const g = layout(bw, bh, pano.hfov ?? 80);
      geo.current = { yawMax: g.yawMax };
      el.style.perspective = `${g.p}px`;
      const im = img.current;
      if (im) Object.assign(im.style, {
        width: `${g.wd}px`, height: `${g.hd}px`, left: `${(bw - g.wd) / 2}px`, top: `${(bh - g.hd) / 2}px`,
        transformOrigin: `50% 50% ${g.p}px`, // 見る人の位置を軸に回す＝首を振る
      });
      place();
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, [pano.hfov]);

  // 動きが使えるか（iPhone は許可が要る・一度許した端末はそのまま）
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('DeviceMotionEvent' in window) || !window.matchMedia('(pointer: coarse)').matches) return;
    const M = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    let saved: string | null = null;
    try { saved = localStorage.getItem(TILT_KEY); } catch {}
    const next: Motion = typeof M.requestPermission !== 'function' || saved === 'granted' ? 'on' : 'ask';
    const t = window.setTimeout(() => setMotion(next), 0); // 画面を作ったあとで切り替える（サーバーの絵と食い違わない）
    return () => window.clearTimeout(t);
  }, []);

  // スマホを回した量：回転の速さを、世界の上下の軸に投影して足していく
  useEffect(() => {
    if (motion !== 'on' || !inView) return;
    let up: [number, number, number] = [0, 0.87, 0.5]; // 端末から見た「上」（向きの値が来るまでの仮）
    let acc = target.current * (geo.current.yawMax || MAX_YAW) / GAIN;
    let last = 0, got = false;
    const ori = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const b = e.beta * D2R, g = e.gamma * D2R;
      up = [-Math.cos(b) * Math.sin(g), Math.sin(b), Math.cos(b) * Math.cos(g)];
    };
    const mot = (e: DeviceMotionEvent) => {
      const r = e.rotationRate;
      if (!r || r.alpha == null || r.beta == null || r.gamma == null) return;
      got = true;
      const now = performance.now();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      // rotationRate：beta＝x軸、gamma＝y軸、alpha＝z軸まわり（度／秒）。上の軸まわりの左回りが正
      let rate = r.beta * up[0] + r.gamma * up[1] + r.alpha * up[2];
      rate = Math.abs(rate) < DEAD ? 0 : rate - Math.sign(rate) * DEAD;
      const ym = geo.current.yawMax || MAX_YAW;
      const lim = (1.6 * ym) / GAIN;
      acc = Math.min(lim, Math.max(-lim, acc - rate * dt)); // 右に回す＝右を向く
      target.current = (acc * GAIN) / ym;
    };
    window.addEventListener('deviceorientation', ori);
    window.addEventListener('devicemotion', mot);
    const t = window.setTimeout(() => setHintDone(true), 2600);
    // iPhone で前に許した印があっても、今は届かない事がある（Safari を開き直した時など）。届かなければもう一度聞く
    const chk = window.setTimeout(() => {
      if (!got && typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function') setMotion('ask');
    }, 1200);
    return () => {
      window.removeEventListener('deviceorientation', ori);
      window.removeEventListener('devicemotion', mot);
      window.clearTimeout(t); window.clearTimeout(chk);
    };
  }, [motion, inView]);

  // 動かす：ばねのように、動き出しと止まりぎわをなめらかに。端はゆるく止まる
  useEffect(() => {
    if (!inView) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const goal = geo.current.yawMax * Math.tanh(target.current);
      const om = 2 / SMOOTH, x = om * dt, ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
      const ch = yaw.current - goal, tmp = (vel.current + om * ch) * dt;
      vel.current = (vel.current - om * tmp) * ex;
      yaw.current = goal + (ch + tmp) * ex;
      place();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  // パソコン：ページの上のマウスの左右の位置（上に重なった「拡大」のボタンがあるので、窓全体で聞いて位置で判断する）
  useEffect(() => {
    if (motion === 'on' || !inView || !window.matchMedia('(hover: hover)').matches) return;
    const mv = (e: MouseEvent) => {
      const r = box.current?.getBoundingClientRect();
      if (!r) return;
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      target.current = inside ? 1.6 * Math.min(1, Math.max(-1, ((e.clientX - r.left) / r.width) * 2 - 1)) : 0;
    };
    window.addEventListener('mousemove', mv);
    return () => window.removeEventListener('mousemove', mv);
  }, [motion, inView]);

  const ask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const M = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    const O = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const r = await M.requestPermission?.();
      if (r === 'granted') {
        try { await O.requestPermission?.(); } catch {} // 同じ許可なので、たいていは聞かれずに通る
        try { localStorage.setItem(TILT_KEY, 'granted'); } catch {}
        setMotion('on');
      } else setMotion('off');
    } catch { setMotion('off'); }
  };

  const [fx, fy, fw, fh] = pano.frost;
  const k = w / 1080;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden bg-[#2a2d31]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={pano.src} alt={label} loading={eager ? 'eager' : 'lazy'} draggable={false}
        className="absolute select-none will-change-transform"
        style={{ maxWidth: 'none', left: 0, top: 0, height: '100%', width: 'auto', aspectRatio: '16 / 9' }} />
      <div className="pointer-events-none absolute" style={{
        left: `${(fx / 1080) * 100}%`, top: `${(fy / 1440) * 100}%`, width: `${(fw / 1080) * 100}%`, height: `${(fh / 1440) * 100}%`,
        borderRadius: 14 * k, background: pano.tint,
        backdropFilter: `blur(${(26 * k).toFixed(1)}px)`, WebkitBackdropFilter: `blur(${(26 * k).toFixed(1)}px)`,
      }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pano.overlay} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none" />
      {motion === 'ask' && (
        <button type="button" onClick={ask}
          className="absolute bottom-[19%] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white"
          style={{ background: 'rgba(20,20,18,0.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
          ◐ Turn to look around
        </button>
      )}
      <p className={`pointer-events-none absolute bottom-[19%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white transition-opacity duration-700 ${!hintDone && inView && motion === 'on' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(20,20,18,0.45)' }}>
        ← Turn your phone →
      </p>
    </div>
  );
}
