'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// 横に流れる列の端を、紙の色へふわっと溶かす（2026-10-27）。囲みを付けずに「まだ続いている」ことだけを伝える。
// 右の端は先がある間だけ、左の端は少しでも動かした後だけ薄くする。全部が収まる時は何もしない
const FADE = 36;
export function FadeScroller({ className = '', children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = () => {
    const el = ref.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft > 2, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 });
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const mask = `linear-gradient(to right, ${edge.l ? 'transparent' : '#000'} 0, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edge.r ? 'transparent' : '#000'} 100%)`;
  return (
    <div ref={ref} onScroll={measure} className={className} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      {children}
    </div>
  );
}
