'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PageVideo } from './PageVideo';
import { HOTSPOTS, type Hotspot } from '@/lib/latitude-hotspots';

// カルーセルのページ：スマホは横にめくる、パソコンは2ページずつの見開き。
// ページを押すと拡大写真（左右にめくれる）。LOOKのあるページだけ、少し遅れて「Step into this look」が出て、
// 押すと下（パソコンは右）から体験の画面がせり上がる：見本（凛）・服・顔の写真・作るボタン。
// 2026-10-22 体験はログインなしで公開・1人1日3回まで（回数はサーバーで数える）。stepOn が false の号では出さない。

type Page = { file: string; video?: string };
type StepPage = { page: number; look: number; garments: string[] };
const PAPER = '#f2eee7';
const INK = '#1e1d1b';
const MUTE = '#78746c';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';

export function PagesViewer({ slug, base, pages, stepPages, stepOn, sample }: {
  slug: string; base: string; pages: Page[]; stepPages: StepPage[]; stepOn?: boolean; sample?: { face: string; result: string } | null;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const url = (f: string) => `${base}/pages/${f}`;
  const thumb = (p: Page, n: number) =>
    p.video ? (
      <PageVideo src={url(p.video)} poster={url(p.file)} label={`Page ${n}`} eager={n <= 2} order={n} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url(p.file)} alt={`Page ${n}`} loading={n <= 2 ? 'eager' : 'lazy'} className="block h-full w-full object-cover" />
    );
  const spreads: Page[][] = [];
  for (let i = 0; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2));
  const hit = (n: number) => (
    <button type="button" aria-label={`Open page ${n}`} onClick={() => setOpen(n)} className="absolute inset-0 cursor-zoom-in" />
  );
  return (
    <>
      <div className="md:hidden">
        <div className="latitude-noscroll -mx-4 flex snap-x snap-mandatory overflow-x-auto px-4 pb-2">
          {pages.map((p, i) => (
            <figure key={p.file} className="relative w-[84vw] shrink-0 snap-center" style={{ aspectRatio: '3 / 4' }}>
              {thumb(p, i + 1)}
              {hit(i + 1)}
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          {pages.length} pages — swipe
        </p>
      </div>
      <div className="hidden flex-col gap-10 md:flex">
        {spreads.map((s, k) => (
          <div key={k} className="mx-auto grid w-full max-w-5xl grid-cols-2 shadow-[0_30px_60px_-30px_rgba(30,29,27,0.35)]">
            {s.map((p, j) => (
              <div key={p.file} className="relative" style={{ aspectRatio: '3 / 4' }}>
                {thumb(p, k * 2 + j + 1)}
                {hit(k * 2 + j + 1)}
              </div>
            ))}
            {s.length === 1 && <div style={{ background: PAPER }} />}
          </div>
        ))}
      </div>
      {open !== null && (
        <Lightbox
          slug={slug} pages={pages} url={url} at={open} setAt={setOpen} onClose={() => setOpen(null)}
          stepPages={stepOn ? stepPages : []} sample={sample}
        />
      )}
    </>
  );
}

function Lightbox({ slug, pages, url, at, setAt, onClose, stepPages, sample }: {
  slug: string; pages: Page[]; url: (f: string) => string; at: number; setAt: (n: number) => void; onClose: () => void;
  stepPages: StepPage[]; sample?: { face: string; result: string } | null;
}) {
  const p = pages[at - 1];
  const step = stepPages.find((s) => s.page === at);
  const [cta, setCta] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [result, setResult] = useState<Record<number, string>>({});
  const [showMine, setShowMine] = useState(true);
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => { setSheet(false); setAt(Math.min(pages.length, Math.max(1, at + d))); }, [at, pages.length, setAt]);
  useEffect(() => {
    setCta(false);
    const t = window.setTimeout(() => setCta(true), 1200); // 写真を見せてから、そっと誘う
    return () => window.clearTimeout(t);
  }, [at]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') (sheet ? setSheet(false) : onClose()); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [go, onClose, sheet]);
  const mine = result[at];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: '#0c0c0b' }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touch.current === null || sheet) return; const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); touch.current = null; }}>
      {/* 2026-10-22 スマホで左右が切れていたので、幅を「画面の幅」と「高さの3/4」の小さい方にして、ページ全体を収める */}
      <div className={`relative transition-all duration-500 ${sheet ? 'md:mr-[420px] opacity-40 md:opacity-100' : ''}`} style={{ aspectRatio: '3 / 4', width: 'min(100vw, 75svh)' }}>
        {mine && showMine ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mine} alt="You, in this look" className="h-full w-full object-cover" />
        ) : p.video ? (
          <PageVideo key={at} src={url(p.video)} poster={url(p.file)} label={`Page ${at}`} eager />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url(p.file)} alt={`Page ${at}`} className="h-full w-full object-cover" />
        )}
        {!(mine && showMine) && HOTSPOTS[slug]?.[at] && !sheet && <HotspotLayer key={at} h={HOTSPOTS[slug][at]} />}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 text-[11px] uppercase tracking-[0.3em] text-white/80 hover:text-white">Close ✕</button>
      <p className="absolute left-4 top-4 z-10 text-[10px] uppercase tracking-[0.3em] text-white/50">{at} / {pages.length}</p>
      {at > 1 && <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 p-3 text-2xl text-white/60 hover:text-white md:block">‹</button>}
      {at < pages.length && <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 p-3 text-2xl text-white/60 hover:text-white md:block">›</button>}
      {mine && !sheet && (
        <button type="button" onClick={() => setShowMine(!showMine)} className="absolute bottom-6 left-4 z-10 rounded-full border border-white/40 px-4 py-2 text-[11px] uppercase tracking-[0.25em] text-white">
          {showMine ? 'See the original' : 'See you'}
        </button>
      )}
      {step && !sheet && (
        <button type="button" onClick={() => setSheet(true)}
          className={`absolute bottom-6 right-4 z-10 rounded-full px-5 py-3 text-[11px] uppercase tracking-[0.25em] transition-opacity duration-700 ${cta ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: PAPER, color: INK }}>
          {mine ? 'Try again' : 'Step into this look'} →
        </button>
      )}
      {step && sheet && (
        <StepSheet slug={slug} step={step} sample={sample} onClose={() => setSheet(false)}
          onDone={(u) => { setResult({ ...result, [at]: u }); setShowMine(true); setSheet(false); }} />
      )}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  // 長い辺を1280に縮めてから送る（重さと費用を抑える）
  const img = await createImageBitmap(file);
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.9);
}

function StepSheet({ slug, step, sample, onClose, onDone }: {
  slug: string; step: StepPage; sample?: { face: string; result: string } | null; onClose: () => void; onDone: (url: string) => void;
}) {
  const [face, setFace] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {  // 開いた記録（関心の数）と、今日あと何回か
    fetch('/api/latitude/step-into', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, page: step.page }) })
      .then((r) => r.json()).then((d) => setLeft(typeof d.remaining === 'number' ? d.remaining : null)).catch(() => {});
  }, [slug, step.page]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    if (!face) return;
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/latitude/step-into', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, page: step.page, face }) });
      const d = await r.json();
      if (typeof d.remaining === 'number') setLeft(d.remaining);
      if (r.status === 429) { setErr("That's today's three. Come back tomorrow."); return; }
      const taskId = d.taskId;
      if (!taskId) throw new Error('submit');
      for (let i = 0; i < 60; i++) {
        await new Promise((res) => setTimeout(res, 4000));
        const q = await (await fetch(`/api/latitude/step-into?task=${taskId}`)).json();
        if (q.status === 'completed' && q.url) { onDone(q.url); return; }
        if (q.status === 'failed') throw new Error('failed');
      }
      throw new Error('timeout');
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[78svh] overflow-y-auto rounded-t-2xl p-6 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:p-8"
      style={{ background: PAPER, color: INK }}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>Step into this look</p>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>✕</button>
      </div>
      <h3 className="mt-3 text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>Be the one standing here.</h3>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: MUTE }}>The same place, the same light, these clothes — with your face. One photograph, made for you.</p>
      {sample && (
        <div className="mt-6">
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>Example — RIN</p>
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sample.face} alt="Example face" className="h-20 w-20 object-cover" />
            <span className="text-lg" style={{ color: MUTE }}>→</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sample.result} alt="Example result" className="h-28 w-[84px] object-cover" />
          </div>
        </div>
      )}
      {/* 2026-10-22 ユーザー指定：服（素材アイテム）の写真は出さない */}
      <label className="mt-6 flex cursor-pointer items-center gap-4 border p-3" style={{ borderColor: 'rgba(30,29,27,0.2)' }}>
        {face ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={face} alt="Your face" className="h-16 w-16 object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center text-2xl" style={{ background: 'rgba(30,29,27,0.06)', color: MUTE }}>+</span>
        )}
        <span className="text-[13px]">{face ? 'Change photo' : 'Add a clear photo of your face'}</span>
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFace(await fileToDataUrl(f)); }} />
      </label>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: MUTE }}>Your photo is used only to make this one image. We don&apos;t keep it.</p>
      <button type="button" disabled={!face || busy || left === 0} onClick={run}
        className="mt-5 w-full py-4 text-[12px] uppercase tracking-[0.3em] disabled:opacity-40" style={{ background: INK, color: PAPER }}>
        {busy ? 'Developing…' : 'Step in'}
      </button>
      {busy && <p className="mt-2 text-center text-[11px]" style={{ color: MUTE }}>About a minute.</p>}
      {!busy && left !== null && <p className="mt-2 text-center text-[11px]" style={{ color: MUTE }}>Three a day · {left} left today</p>}
      {err && <p className="mt-2 text-center text-[12px]" style={{ color: '#8a2d22' }}>{err}</p>}
    </div>
  );
}

// 仕掛け：写真の上の小さな光る点。押すと、写っていない物が線で一本ずつ描かれ、最後に一言が出る。もう一度押すと消える
function HotspotLayer({ h }: { h: Hotspot }) {
  const [run, setRun] = useState(0);
  const on = run > 0;
  let t = 0;
  const timed = h.paths.map((p) => { const start = t; t += p.dur + h.gap; return { ...p, start }; });
  const noteAt = t + 0.2;
  return (
    <>
      <style>{`@keyframes lat-draw{to{stroke-dashoffset:0}}@keyframes lat-in{to{opacity:1}}@keyframes lat-ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}`}</style>
      {on && (
        <svg key={run} viewBox="0 0 1080 1440" className="pointer-events-none absolute inset-0 h-full w-full">
          {timed.map((p, i) => (
            <path key={i} d={p.d} fill="none" stroke={h.color} strokeWidth={h.width} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
              style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `lat-draw ${p.dur}s ease-in-out ${p.start}s forwards` }} />
          ))}
          <text x={h.note.x} y={h.note.y} fill={h.note.color} style={{ opacity: 0, animation: `lat-in 0.9s ease ${noteAt}s forwards`, fontFamily: SERIF, fontStyle: 'italic', fontSize: 30 }}>
            {h.note.text.split('\n').map((ln, i) => <tspan key={i} x={h.note.x} dy={i ? 40 : 0}>{ln}</tspan>)}
          </text>
        </svg>
      )}
      <button type="button" aria-label={on ? 'Hide the drawing' : 'Reveal a drawing'} onClick={() => setRun(on ? 0 : run + 1)}
        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 p-3" style={{ left: `${(h.x / 1080) * 100}%`, top: `${(h.y / 1440) * 100}%` }}>
        <span className="relative block h-3.5 w-3.5 rounded-full" style={{ background: on ? 'transparent' : PAPER, boxShadow: '0 0 0 1px rgba(30,29,27,0.35)', border: on ? `1px solid ${PAPER}` : 'none' }}>
          {!on && <span className="absolute inset-0 rounded-full" style={{ background: PAPER, animation: 'lat-ping 1.8s ease-out infinite' }} />}
        </span>
      </button>
    </>
  );
}
