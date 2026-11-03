'use client';
import { useEffect, useRef, useState } from 'react';

// 2026-11-03 傾けて見回すページ（試作・ウィーンの3ページ）。下に横長（16:9）の写真、上に止まった層：
// すりガラス（その場で下の写真をぼかす）と、文字・ページ番号・下の暗がりを抜いた透明の画像。
// スマホ：左右に傾けると写真が動く。iPhone は最初に1回だけ押して動きの使用を許す（許したかはこの端末に覚えておく）。
// パソコン：ページの上でマウスを左右に動かす。動きを減らす設定の人には、まん中で止めたまま見せる。
export type Pano = {
  src: string;      // 横長の写真（16:9）
  overlay: string;  // 上に止まる層（1080×1440 の透明 PNG／WebP）
  frost: [number, number, number, number]; // すりガラスの位置と大きさ（1080×1440 の中の x, y, 幅, 高さ）
  tint: string;     // すりガラスの色（例 'rgba(54,31,22,0.5)'）
};

const TILT_KEY = 'lat-tilt';
const RANGE = 22; // 何度傾けると端まで行くか

type Motion = 'off' | 'ask' | 'on';

export function PanoPage({ pano, label, eager }: { pano: Pano; label: string; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const target = useRef(0.5);   // 0＝左端、1＝右端
  const pos = useRef(0.5);
  const base = useRef<number | null>(null);
  const [w, setW] = useState(0);
  const [motion, setMotion] = useState<Motion>('off');
  const [inView, setInView] = useState(false);
  const [hintDone, setHintDone] = useState(false); // 「傾けて」の一言は、最初に見えた時に一度だけ
  const place = () => {
    const el = img.current, b = box.current;
    if (el && b) el.style.transform = `translate3d(${-pos.current * Math.max(0, el.offsetWidth - b.offsetWidth)}px,0,0)`;
  };

  // ページの幅（すりガラスのぼかしの強さを、ページの大きさに合わせるため）と、画面に入っているか
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // 見えていない間も、写真はまん中に置いておく（めくって入った時に左寄せから跳ばない）
    const ro = new ResizeObserver(([e]) => { setW(e.contentRect.width); place(); });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  // 傾きが使えるか（iPhone は許可が要る・一度許した端末はそのまま）
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('DeviceOrientationEvent' in window) || !window.matchMedia('(pointer: coarse)').matches) return;
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    let saved: string | null = null;
    try { saved = localStorage.getItem(TILT_KEY); } catch {}
    const next: Motion = typeof D.requestPermission !== 'function' || saved === 'granted' ? 'on' : 'ask';
    const t = window.setTimeout(() => setMotion(next), 0); // 画面を作ったあとで切り替える（サーバーの絵と食い違わない）
    return () => window.clearTimeout(t);
  }, []);

  // 傾き：見えている間だけ聞く。最初の向きを「まん中」にして、そこから左右へ
  useEffect(() => {
    if (motion !== 'on' || !inView) return;
    base.current = null;
    let got = false;
    const on = (e: DeviceOrientationEvent) => {
      const landscape = Math.abs((screen.orientation?.angle ?? 0)) === 90;
      const v = landscape ? e.beta : e.gamma;
      if (v == null) return;
      got = true;
      if (base.current === null) base.current = v;
      base.current += (v - base.current) * 0.004; // ゆっくり今の持ち方に慣らす（傾けたまま固まらない）
      const sign = (screen.orientation?.angle ?? 0) === -90 || (screen.orientation?.angle ?? 0) === 270 ? -1 : 1;
      target.current = Math.min(1, Math.max(0, 0.5 + (sign * (v - base.current)) / (2 * RANGE)));
    };
    window.addEventListener('deviceorientation', on);
    const t = window.setTimeout(() => setHintDone(true), 2600);
    // iPhone で前に許した印があっても、今は届かない事がある（Safari を開き直した時など）。届かなければもう一度聞く
    const chk = window.setTimeout(() => {
      if (!got && typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function') setMotion('ask');
    }, 1200);
    return () => { window.removeEventListener('deviceorientation', on); window.clearTimeout(t); window.clearTimeout(chk); };
  }, [motion, inView]);

  // 動かす：少し遅れてついてくる（手ぶれを消す）
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const tick = () => {
      pos.current += (target.current - pos.current) * 0.08;
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
      target.current = inside ? Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) : 0.5;
    };
    window.addEventListener('mousemove', mv);
    return () => window.removeEventListener('mousemove', mv);
  }, [motion, inView]);

  const ask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      const r = await D.requestPermission?.();
      if (r === 'granted') { try { localStorage.setItem(TILT_KEY, 'granted'); } catch {} setMotion('on'); }
      else setMotion('off');
    } catch { setMotion('off'); }
  };

  const [fx, fy, fw, fh] = pano.frost;
  const k = w / 1080;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden bg-[#2a2d31]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={img} src={pano.src} alt={label} loading={eager ? 'eager' : 'lazy'} draggable={false} onLoad={place}
        className="absolute left-0 top-0 select-none will-change-transform"
        style={{ height: '100%', width: 'auto', maxWidth: 'none', aspectRatio: '16 / 9' }} />
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
          ◐ Tilt to look around
        </button>
      )}
      <p className={`pointer-events-none absolute bottom-[19%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white transition-opacity duration-700 ${!hintDone && inView && motion === 'on' ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'rgba(20,20,18,0.45)' }}>
        ← Tilt your phone →
      </p>
    </div>
  );
}
