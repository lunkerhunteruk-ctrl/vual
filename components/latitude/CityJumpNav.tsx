'use client';
import { useEffect, useRef, useState } from 'react';
import { ACTION, INK, MUTE } from '@/lib/latitude-theme';

// 2026-11-14 ②-1 街のページの目次。上の帯（IssueStrip）のすぐ下に張りつき、1回押せば「店」「地図」などへ飛べる。
// リンクはふつうの <a href="#shops">（JavaScript が無くても飛べる）。いま見ている所を墨、ほかを灰にするのは、動いた時だけの上乗せ。
// 張りつく位置は、帯の実際の高さを測って合わせる（測る前・JS が無い時は 45px）。帯と同じ紙の色とぼかし、下に細い線。
// data-lat-sticky：店の地図が「上に張りつく物の下端」を知るための印（CityShopMap）
export type JumpItem = { id: string; label: string };

const NOSCROLL = '.lat-jump{scrollbar-width:none}.lat-jump::-webkit-scrollbar{display:none}';

export default function CityJumpNav({ items, label }: { items: JumpItem[]; label: string }) {
  const nav = useRef<HTMLElement>(null);
  const [top, setTop] = useState(45);
  const [cur, setCur] = useState<string | null>(null);

  // 上の帯の高さ（字の大きさや幅で変わっても合うように、大きさが変わるたびに測り直す）
  useEffect(() => {
    const strip = document.querySelector<HTMLElement>('[data-lat-strip]');
    if (!strip) return;
    const measure = () => setTop(Math.round(strip.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(strip);
    return () => ro.disconnect();
  }, []);

  // いま見ている所：二つの帯のすぐ下の1本の線（IntersectionObserver の細い帯）にかかっている節。線より上に過ぎた節のうち、いちばん下の物
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const line = top + (nav.current?.offsetHeight ?? 45) + 48;
    const pick = () => {
      let on: string | null = null;
      for (const e of els) if (e.getBoundingClientRect().top <= line) on = e.id;
      setCur(on);
    };
    const io = new IntersectionObserver(pick, { rootMargin: `-${line}px 0px -${Math.max(0, window.innerHeight - line - 1)}px 0px` });
    els.forEach((e) => io.observe(e));
    // 目次から飛んだ直後など、線の上で止まった時にも合わせ直す（scrollend の無いブラウザは IntersectionObserver だけ）
    window.addEventListener('scrollend', pick);
    pick();
    return () => { io.disconnect(); window.removeEventListener('scrollend', pick); };
  }, [items, top]);

  return (
    <nav ref={nav} data-lat-sticky aria-label={label} className="sticky z-20 border-b backdrop-blur"
      style={{ top, background: 'rgba(242,238,231,0.92)', borderColor: 'rgba(30,29,27,0.12)' }}>
      <style>{NOSCROLL}</style>
      <ul className="lat-jump mx-auto flex max-w-6xl gap-x-6 overflow-x-auto whitespace-nowrap px-4 md:gap-x-8 md:px-8">
        {items.map((i) => (
          <li key={i.id} className="shrink-0">
            <a href={`#${i.id}`} className={ACTION} aria-current={cur === i.id ? 'location' : undefined}
              style={{ color: cur === i.id ? INK : MUTE }}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
