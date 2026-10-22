'use client';
import { useEffect, useState } from 'react';

// 2026-10-22 試作：AIの動画を使わずに「描かれて、歩き出す」。
// 1) 1コマ目の線画を、線の芯のデータ（strokes.json）に沿って覆いをはがすように一筆ずつ見せる（太い筆の線とかすれはそのまま）
// 2) 描き終わったら、AIに静止画で描かせた歩く4コマ（f1〜f4）を順に切り替えて、その場で歩かせる
type Strokes = { w: number; h: number; stroke: number; paths: { d: string; len: number }[] };

// draw=false：描く動きを省き、最初から4コマを繰り返すだけ（2026-10-22 ユーザー指定）
export function DrawWalk({ base, speed = 1100, fps = 6, draw = true }: { base: string; speed?: number; fps?: number; draw?: boolean }) {
  const [s, setS] = useState<Strokes | null>(null);
  const [run, setRun] = useState(0);
  const [walk, setWalk] = useState(!draw);
  const [frame, setFrame] = useState(0);
  useEffect(() => { fetch(`${base}/strokes.json`).then((r) => r.json()).then(setS); }, [base]);
  // 線の長さに比例した時間で、上から順に描く（speed＝1秒に描く長さ）
  const timed = (s?.paths ?? []).reduce<{ d: string; start: number; dur: number }[]>((acc, p) => {
    // 1本ずつ順に（前の線を描き終えてから次へ。筆を持ち上げて次の線へ移る間をほんの少し）
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].dur + 0.03 : 0.2;
    acc.push({ d: p.d, start, dur: Math.max(0.06, p.len / speed) });
    return acc;
  }, []);
  const total = timed.length ? timed[timed.length - 1].start + timed[timed.length - 1].dur : 0;
  useEffect(() => {
    if (!s || !draw) return;
    setWalk(false);
    const t = window.setTimeout(() => setWalk(true), (total + 0.3) * 1000);
    return () => window.clearTimeout(t);
  }, [s, run, total, draw]);
  useEffect(() => {
    if (!walk) return;
    const t = window.setInterval(() => setFrame((f) => (f + 1) % 4), 1000 / fps);
    return () => window.clearInterval(t);
  }, [walk, fps]);
  if (!s) return null;
  return (
    <div className="relative h-full w-full">
      <style>{'@keyframes dw-draw{to{stroke-dashoffset:0}}@keyframes dw-on{to{opacity:1}}'}</style>
      {!walk ? (
        <svg key={run} viewBox={`0 0 ${s.w} ${s.h}`} className="absolute inset-0 h-full w-full">
          <defs>
            <mask id={`dw-mask-${run}`} maskUnits="userSpaceOnUse" x="0" y="0" width={s.w} height={s.h}>
              {timed.map((p, i) => (
                <path key={i} d={p.d} fill="none" stroke="#fff" strokeWidth={s.stroke} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
                  // iPhone の Safari は、描き始める前の線の端の丸みだけを点として先に出すので、描き始めるまで線ごと隠しておく
                  style={{ strokeDasharray: 1, strokeDashoffset: 1, opacity: 0, animation: `dw-on 0s linear ${p.start}s forwards, dw-draw ${p.dur}s ease-in-out ${p.start}s forwards` }} />
              ))}
            </mask>
          </defs>
          <image href={`${base}/f1.png`} width={s.w} height={s.h} mask={`url(#dw-mask-${run})`} />
        </svg>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${base}/f${frame + 1}.png`} alt="" className="absolute inset-0 h-full w-full" />
      )}
      {[2, 3, 4].map((n) => <link key={n} rel="preload" as="image" href={`${base}/f${n}.png`} />)}
      {draw && <button type="button" onClick={() => { setFrame(0); setRun(run + 1); }} className="absolute -bottom-8 right-0 text-[10px] uppercase tracking-[0.3em] text-neutral-500">Replay</button>}
    </div>
  );
}
