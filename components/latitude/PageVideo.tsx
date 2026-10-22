'use client';
import { useEffect, useRef } from 'react';

// カルーセルの動くページ。iPhone の Safari は、横にめくる列の中の動画や、読み込みの途中で自動再生を止めることがあるので、
// 画面に入ったら play() を呼び直し、出たら止める。省電力モードなどで再生できない時は、ポスター（静止画）のまま見せる
export function PageVideo({ src, poster, label }: { src: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => v.play().catch(() => {});
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? tryPlay() : v.pause()),
      { threshold: 0.25 },
    );
    io.observe(v);
    v.addEventListener('canplay', tryPlay);
    return () => {
      io.disconnect();
      v.removeEventListener('canplay', tryPlay);
    };
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-label={label}
      className="block h-full w-full object-cover"
    />
  );
}
