'use client';
import { useEffect, useRef, useState } from 'react';

// カルーセルの動くページ。2026-10-22 ユーザー指定：土台の静止画は、ほかのページと同じように最初から出しておき、
// 動画は読み込めて動き出したら上にふわっと重ねる（読み込み中にページが空になったり、途中のコマで止まって見えたりしない）。
// iPhone の Safari は同時に動かせる動画の数が少ないので、画面に入った1本だけを読み込んで動かし、外れたら止める。
// 終わりまで来たら頭に戻して繰り返す。再生できない時（省電力モードなど）は静止画のまま。
// 2026-10-22 ユーザー指定：ページを開いたら、若い番号の動くページから1本ずつ順に、裏で先に読み込んでおく（3枚目→10枚目→12枚目）。
const queue: { order: number; load: () => Promise<void> }[] = [];
let running = false;
function enqueue(order: number, load: () => Promise<void>) {
  queue.push({ order, load });
  queue.sort((a, b) => a.order - b.order);
  if (!running) window.setTimeout(drain, 0);
}
async function drain() {
  running = true;
  while (queue.length) await queue.shift()!.load();
  running = false;
}

export function PageVideo({ src, poster, label, eager = false, order }: { src: string; poster: string; label: string; eager?: boolean; order?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const shown = () => v.getClientRects().length > 0;
    const start = () => {
      if (!shown()) return;
      if (!v.getAttribute('src')) { v.src = src; v.load(); }
      v.play().catch(() => {});
    };
    const again = () => { v.currentTime = 0; v.play().catch(() => {}); };
    const inView = () => {
      const r = v.getBoundingClientRect(); if (!r.width || !r.height) return false;
      const w = Math.min(r.right, window.innerWidth) - Math.max(r.left, 0), h = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return w > 0 && h > 0 && (w * h) / (r.width * r.height) > 0.3;
    };
    const check = () => (inView() ? (v.paused || !v.getAttribute('src') ? start() : null) : !v.paused && v.pause());
    const playing = () => setOn(true);
    const timer = window.setInterval(check, 500);
    window.addEventListener('scroll', check, { passive: true });
    document.addEventListener('scroll', check, { passive: true, capture: true });
    v.addEventListener('ended', again);
    v.addEventListener('canplay', check);
    v.addEventListener('playing', playing);
    check();
    // 先読み：見えている側（スマホの列かパソコンの見開き）だけ、番号順に1本ずつ読み込む。次へ進むのは読み込めたか8秒たった時
    let cancelled = false;
    if (order !== undefined) {
      enqueue(order, () => new Promise<void>((done) => {
        if (cancelled || !shown() || v.getAttribute('src')) return done();
        const fin = () => { window.clearTimeout(t); v.removeEventListener('canplaythrough', fin); done(); };
        const t = window.setTimeout(fin, 8000);
        v.addEventListener('canplaythrough', fin);
        v.preload = 'auto'; v.src = src; v.load();
      }));
    }
    return () => {
      cancelled = true;
      window.clearInterval(timer); window.removeEventListener('scroll', check); document.removeEventListener('scroll', check, { capture: true });
      v.removeEventListener('ended', again); v.removeEventListener('canplay', check); v.removeEventListener('playing', playing);
    };
  }, [src, order]);
  return (
    <span className="relative block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={poster} alt={label} loading={eager ? 'eager' : 'lazy'} className="block h-full w-full object-cover" />
      <video ref={ref} muted loop playsInline preload="none" aria-hidden="true"
        className="absolute inset-0 block h-full w-full object-cover transition-opacity duration-500" style={{ opacity: on ? 1 : 0 }} />
    </span>
  );
}
