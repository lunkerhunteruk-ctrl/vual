'use client';
import { useEffect, useRef } from 'react';

// カルーセルの動くページ。iPhone の Safari は同時に動かせる動画の数が少なく、読み込みが重なると途中のコマで止まる。
// そこで、画面に入った1本だけを読み込んで動かし、外れたら止める。パソコン用の見開き（スマホでは隠れている側）は読み込まない。
// 終わりまで来たら頭に戻して繰り返す（loop が効かない時のための念押し）。再生できない時は、ポスター（静止画）のまま見せる
export function PageVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
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
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : v.pause()), { threshold: 0.3 });
    io.observe(v);
    v.addEventListener('ended', again);
    v.addEventListener('canplay', () => { if (shown()) v.play().catch(() => {}); });
    return () => { io.disconnect(); v.removeEventListener('ended', again); };
  }, [src]);
  return (
    <video ref={ref} poster={poster} muted loop playsInline preload="none" aria-label={label} className="block h-full w-full object-cover" />
  );
}
