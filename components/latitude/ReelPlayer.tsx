'use client';
import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';

// リールの再生（2026-10-27）：ブラウザの操作バーは機械ごとに形が変わり、iPhone では右上の小さい印だけで音に気づかれなかった。
// 自前の印にそろえる：音なしで流れている間は左下に「♪ TAP FOR SOUND」。映像のどこをタップしても音が出て最初から流れ直す。
// 音が出ている間はスピーカーの印だけ、もう一度タップで消音。下の端に細い進み具合の線。画面から外れたら音を消す。
// （音つきの自動再生は、見る人が一度タップするまでブラウザが許さない）
export function ReelPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.intersectionRatio < 0.25 && !v.muted) { v.muted = true; setMuted(true); }
    }, { threshold: [0, 0.25] });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.muted) {
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {});
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
  };

  return (
    <button type="button" onClick={toggle} aria-label={muted ? 'Play with sound' : 'Mute'} className="absolute inset-0 block h-full w-full cursor-pointer">
      <video
        ref={ref}
        src={src}
        poster={poster}
        title={title}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setProgress(v.currentTime / v.duration); }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <span
        className="pointer-events-none absolute bottom-5 left-4 flex h-10 items-center gap-2 rounded-full px-4 text-[11px] uppercase tracking-[0.25em] text-white"
        style={{ background: 'rgba(20,20,18,0.55)' }}
      >
        {muted ? <>♪&nbsp;&nbsp;Tap for sound</> : <Volume2 size={16} strokeWidth={1.5} />}
      </span>
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-white/20">
        <span className="block h-full bg-white/80" style={{ width: `${progress * 100}%` }} />
      </span>
    </button>
  );
}
