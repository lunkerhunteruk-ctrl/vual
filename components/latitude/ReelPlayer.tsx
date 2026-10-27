'use client';
import { useEffect, useRef, useState } from 'react';

// リールの再生（2026-10-27 ユーザー指定）：音なしの自動再生で、ずっとくり返す。映像に集中できるよう、印や文字は出さない。
// 操作は2つだけ：①タップで音を出す／消す（最初には戻さない） ②横になぞると早送り・巻き戻し（なぞった幅＝映像の長さの割合）。
// 縦の動きはページのスクロールに残す（touch-action: pan-y）。下の端の細い線は、今どこにいるかと、なぞった時の手がかり。
// 画面から外れたら音を消す。（音つきの自動再生は、見る人が一度タップするまでブラウザが許さない）
const TAP = 8; // これより動いたら、タップではなく「なぞる」
export function ReelPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; t: number; scrub: boolean } | null>(null);
  const [progress, setProgress] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio < 0.25) v.muted = true; }, { threshold: [0, 0.25] });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const toggleSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    if (v.paused) v.play().catch(() => {});
  };

  const onDown = (e: React.PointerEvent) => {
    const v = ref.current;
    if (!v) return;
    drag.current = { x: e.clientX, y: e.clientY, t: v.currentTime, scrub: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current, v = ref.current, el = box.current;
    if (!d || !v || !el || !v.duration) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.scrub) {
      if (Math.abs(dx) < TAP || Math.abs(dx) < Math.abs(dy)) return; // まだタップか、縦のスクロール
      d.scrub = true; setScrubbing(true);
      el.setPointerCapture(e.pointerId);
    }
    const t = Math.min(v.duration - 0.05, Math.max(0, d.t + (dx / el.clientWidth) * v.duration));
    v.currentTime = t;
    setProgress(t / v.duration);
  };
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.scrub) { setScrubbing(false); ref.current?.play().catch(() => {}); return; }
    if (Math.abs(e.clientX - d.x) < TAP && Math.abs(e.clientY - d.y) < TAP) toggleSound();
  };

  return (
    <div
      ref={box}
      role="button"
      tabIndex={0}
      aria-label="Tap for sound on or off; drag sideways to move through the film"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => { drag.current = null; setScrubbing(false); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSound(); } }}
      className="absolute inset-0 cursor-pointer select-none"
      style={{ touchAction: 'pan-y' }}
    >
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
        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration && !drag.current?.scrub) setProgress(v.currentTime / v.duration); }}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <span className={`pointer-events-none absolute inset-x-0 bottom-0 bg-white/20 transition-[height] duration-200 ${scrubbing ? 'h-[4px]' : 'h-[2px]'}`}>
        <span className="block h-full bg-white/80" style={{ width: `${progress * 100}%` }} />
      </span>
    </div>
  );
}
