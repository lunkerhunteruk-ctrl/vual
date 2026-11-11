'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

// 2026-11-11 ユーザー「縦スクロールが多すぎて見にくい」→ 街のページの「1日の回り方」と「おすすめ」を横に流す。
// カードはピタッと止まる（scroll-snap）。スマホは画面幅の約8割のカードで、次のカードの端が見える。
// マウスのある画面（@media (hover: hover)）だけ左右の矢印。何枚目かを「3 / 8」で出す。
// 中身（カード）はサーバーで全部描く（検索と AI のチャットが読む字を隠さない）。キーボードは、流れる帯に Tab で入って ← →、カードの中のリンクにも Tab で入れる。

// カードの幅は lib/latitude-card.ts の CARD_W（サーバーの部品から使うので、この 'use client' のファイルには置かない）

// head：帯の見出し。渡すと、何枚目か・矢印を見出しの右に置く（縦の長さを減らすため）
export default function HScroller({ children, count, label, ja, head }: { children: ReactNode; count: number; label: string; ja: boolean; head?: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: count <= 1 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const first = el.children[0] as HTMLElement | undefined;
      const step = first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0') : el.clientWidth;
      setAt(Math.min(count - 1, Math.round(el.scrollLeft / Math.max(step, 1))));
      setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [count]);

  const go = (d: number) => {
    const el = ref.current;
    if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0') : el.clientWidth;
    const per = Math.max(1, Math.floor((el.clientWidth + 8) / step));
    el.scrollBy({ left: d * per * step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const arrow = 'hidden h-8 w-8 items-center justify-center border text-[14px] transition-opacity disabled:opacity-25 [@media(hover:hover)]:inline-flex';
  const controls = count > 1 && (
    <div className="flex shrink-0 items-center gap-3">
      <p className="text-[10px] tabular-nums tracking-[0.3em]" style={{ color: '#78746c' }} aria-live="polite">
        {at + 1} / {count}
      </p>
      <button type="button" className={arrow} style={{ borderColor: 'rgba(30,29,27,0.2)', color: '#1e1d1b' }} onClick={() => go(-1)} disabled={edge.start} aria-label={ja ? '前へ' : 'Previous'}>←</button>
      <button type="button" className={arrow} style={{ borderColor: 'rgba(30,29,27,0.2)', color: '#1e1d1b' }} onClick={() => go(1)} disabled={edge.end} aria-label={ja ? '次へ' : 'Next'}>→</button>
    </div>
  );
  return (
    <div>
      {head !== undefined && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">{head}</div>
          {controls}
        </div>
      )}
      <ul ref={ref} tabIndex={0} aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 outline-offset-4 md:mx-0 md:scroll-px-0 md:px-0"
        style={{ scrollbarWidth: 'none' }}>
        {children}
      </ul>
      {head === undefined && controls && <div className="mt-3 flex justify-end">{controls}</div>}
    </div>
  );
}

// 下の一覧のカードから、上の店の地図でその店に寄る（CityShopMap が受ける）
export function ShowOnMap({ id, label }: { id: string; label: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('latitude:shop-map', { detail: id }))}
      className="cursor-pointer underline-offset-4 hover:underline" style={{ color: '#1e1d1b' }}>
      {label}
    </button>
  );
}
