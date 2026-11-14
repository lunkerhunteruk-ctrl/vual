'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ACTION, INK, MUTE, SERIF } from '@/lib/latitude-theme';
import { MAX_SHOPS, MAX_TOWNS, best, makeQuery, prepare, type Prepared, type SearchIndex } from '@/lib/latitude-search';

// 2026-11-14 ③-3 「場所から探す」の頭の検索欄。街と店の名前（日本語・英語のどちらでも）で探す。
// 探す元（/api/latitude/search）は、入力欄に初めて触った時に読む（ページを開いただけでは読まない）。
// 結果は街が先（5つまで）、店があと（10軒まで）。店はその街の案内の、その店のカード（#place-…）へ。
// キーボード：上下で選ぶ・Enter で開く・Esc で消す（combobox と listbox）。入力欄の字は 18px（iPhone で勝手に拡大されない 16px 以上）。
// ページの字はサーバーで描いたまま。この部品は、押した後にだけ出る表示を足すだけ（0-3・③の進め方）。

// p：照らし合わせる名前（日本語・英語の順）。latin：ひらがなをローマ字にした入力と照らす名前（英語）
type Entry = { href: string; name: string; alt: string; sub: string; p: Prepared[]; latin: Prepared[] };
type Hit = { href: string; name: string; alt?: string; sub: string };

const hasJa = (s: string) => /[぀-ヿ㐀-鿿]/.test(s);
// 日本語・英語の名前を照らし合わせる形に。英語の方は、ひらがなをローマ字にした入力とも照らす（同じ物を指す）
const names = (ja: string, en: string) => { const p = [prepare(ja), prepare(en)]; return { p, latin: [p[1]] }; };

export default function PlaceSearch({ locale }: { locale: string }) {
  const ja = locale === 'ja';
  const router = useRouter();
  // id はページに1つだけの欄なので固定（useId はこのページで、サーバーとブラウザで食い違った）
  const uid = 'lat-search';
  const inputId = `${uid}-q`;
  const listId = `${uid}-list`;
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ towns: Entry[]; shops: Entry[] } | null>(null);
  const [active, setActive] = useState(-1);
  const asked = useRef(false);
  const label = ja ? '街や店の名前で探す' : 'Search towns and shops';

  // 初めて触った時に1度だけ読む。読んだら、照らし合わせる形（大文字・全角・カタカナをそろえた形）を先に作っておく
  const load = () => {
    if (asked.current) return;
    asked.current = true;
    fetch('/api/latitude/search')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: SearchIndex) => {
        const lab = (i: number) => (ja ? d.labels[i][1] : d.labels[i][0]);
        const towns: Entry[] = d.towns.map(([slug, name, nameJa, where, whereJa]) => ({
          href: `/${locale}/latitude/places/${slug}`,
          name: ja ? nameJa : name, alt: ja ? name : nameJa, sub: ja ? whereJa : where,
          ...names(nameJa, name),
        }));
        const shops: Entry[] = d.shops.map(([t, name, nameEn0, cat, area, anchor]) => {
          const nameEn = nameEn0 || name;
          const town = d.towns[t];
          return {
            href: `/${locale}/latitude/places/${town[0]}#${anchor}`,
            name: ja ? name : nameEn, alt: ja ? nameEn : name,
            sub: [lab(cat), lab(area), ja ? town[2] : town[1]].join(' · '),
            ...names(name, nameEn),
          };
        });
        setData({ towns, shops });
      })
      .catch(() => { asked.current = false; }); // 読めなかった時は、次に触った時にもう一度
  };

  const res = useMemo(() => {
    if (!data || !q.trim()) return null;
    const query = makeQuery(q);
    if (!query.q.c) return null;
    const pick = (xs: Entry[], max: number): Hit[] =>
      xs.map((x, i) => ({ x, i, ...best(x.p, x.latin, query) }))
        .filter((m) => m.r >= 0)
        .sort((a, b) => a.r - b.r || a.i - b.i)
        .slice(0, max)
        // もう一方の言語の名前で合った時は、その名前も小さく添える（英語のページで「今井」と打った人に、看板の字を見せる）
        .map(({ x, via }) => ({ href: x.href, name: x.name, alt: x.alt && x.alt !== x.name && via === (ja ? 1 : 0) ? x.alt : undefined, sub: x.sub }));
    return { towns: pick(data.towns, MAX_TOWNS), shops: pick(data.shops, MAX_SHOPS) };
  }, [data, q, ja]);

  const hits = res ? [...res.towns, ...res.shops] : [];
  const open = !!res;
  const optId = (k: number) => `${uid}-o${k}`;

  // 字が変わったら、選んでいた行は外す
  const change = (v: string) => { setQ(v); setActive(-1); };
  // 上下で選んだ行が画面の外なら、見える所まで寄せる
  useEffect(() => {
    if (active >= 0) document.getElementById(`${uid}-o${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 変換中の Enter・矢印は IME のもの
    if (e.key === 'ArrowDown') {
      if (!hits.length) return;
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      if (!hits.length) return;
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      if (!hits.length) return;
      e.preventDefault();
      router.push(hits[Math.max(active, 0)].href);
    } else if (e.key === 'Escape') {
      if (!q) return;
      e.preventDefault();
      change('');
    }
  };

  const row = (h: Hit, k: number) => (
    <Link key={h.href} href={h.href} id={optId(k)} role="option" aria-selected={k === active} tabIndex={-1}
      className="flex min-h-[56px] flex-col justify-center border-b px-3 py-2"
      style={{ borderColor: 'rgba(30,29,27,0.12)', color: INK, background: k === active ? 'rgba(30,29,27,0.07)' : undefined }}
      onMouseMove={() => { if (k !== active) setActive(k); }}>
      <span className="text-[18px] leading-snug" style={{ fontFamily: SERIF }}>
        {h.name}
        {h.alt && <span lang={hasJa(h.alt) ? 'ja' : 'en'} className="ml-2 text-[14px]" style={{ color: MUTE }}>{h.alt}</span>}
      </span>
      <span className="mt-0.5 text-[13px] leading-snug" style={{ color: MUTE }}>{h.sub}</span>
    </Link>
  );

  return (
    <div role="search" className="max-w-xl">
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className="flex items-center gap-3 border-b focus-within:shadow-[0_1px_0_0_#1e1d1b]" style={{ borderColor: INK }}>
        <input id={inputId} type="text" value={q} placeholder={label}
          role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? optId(active) : undefined}
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="search"
          onFocus={load} onPointerDown={load}
          onChange={(e) => change(e.target.value)} onKeyDown={onKey}
          className="h-[52px] min-w-0 flex-1 bg-transparent text-[18px] placeholder:text-[#5f5b54]"
          // 全体の :focus-visible の枠（globals.css）は出さず、下の線を2本分に太くして、触っている事を見せる
          style={{ fontFamily: SERIF, color: INK, outline: 'none' }} />
        {q && (
          <button type="button" className={`${ACTION} shrink-0 cursor-pointer`} style={{ color: INK }}
            onClick={() => { change(''); document.getElementById(inputId)?.focus(); }}>
            {ja ? '消す' : 'Clear'}
          </button>
        )}
      </div>
      <div id={listId} role="listbox" aria-label={label} hidden={!open || !hits.length} className="mt-2">
        {!!res?.towns.length && (
          <div role="group" aria-labelledby={`${uid}-ht`}>
            <p id={`${uid}-ht`} role="presentation" className="lat-label px-3 pb-1 pt-4" style={{ color: MUTE }}>{ja ? '街' : 'Towns'}</p>
            {res.towns.map((h, k) => row(h, k))}
          </div>
        )}
        {!!res?.shops.length && (
          <div role="group" aria-labelledby={`${uid}-hs`}>
            <p id={`${uid}-hs`} role="presentation" className="lat-label px-3 pb-1 pt-4" style={{ color: MUTE }}>{ja ? '店' : 'Shops'}</p>
            {res.shops.map((h, k) => row(h, res.towns.length + k))}
          </div>
        )}
      </div>
      <p aria-live="polite" className="text-[16px]" style={{ color: MUTE }}>
        {open && !hits.length ? <span className="block px-3 pt-4">{ja ? '見つかりませんでした。' : 'No matches.'}</span> : null}
      </p>
    </div>
  );
}
