'use client';
import { useEffect, useState } from 'react';
import { MUTE } from '@/lib/latitude-theme';
import { useSaved, ShareSaved } from '@/components/latitude/SaveButton';
import { SavedRows, type SavedCity } from '@/components/latitude/SavedRows';
import type { SavedIndexData } from '@/lib/latitude-saved-index';

// 2026-11-14 ③-2 自分の保存した店（端末の中の一覧）。街ごと・保存した順。データに無い店（英語の店名が変わった・載せなくなった店）は黙って飛ばす。
// 中身は端末にしか無いので、ここだけブラウザで描く。店名や住所は、1軒以上保存してある時だけ /api/latitude/saved-index/<言語> から読む
// （全部の店の一覧を取るだけで、どの店を保存したかは送らない）

export default function SavedList({ locale }: { locale: string }) {
  const ja = locale === 'ja';
  const list = useSaved();
  const [index, setIndex] = useState<SavedIndexData | null>(null);
  const [failed, setFailed] = useState(false);
  const need = list.length > 0 && !index;
  useEffect(() => {
    if (!need) return;
    let off = false;
    fetch(`/api/latitude/saved-index/${ja ? 'ja' : 'en'}`).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => { if (!off) setIndex(d); }).catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [need, ja]);

  const empty = (
    <p className="max-w-xl text-[15px] leading-relaxed" style={{ color: MUTE }}>
      {ja ? 'まだ保存した店はありません。街の案内で、店の「保存」を押すとここに並びます。' : 'Nothing saved yet. Tap Save on a shop in a city guide and it will appear here.'}
    </p>
  );
  if (!list.length) return empty;
  if (!index) return failed ? empty : <p className="text-[15px]" style={{ color: MUTE }}>…</p>;

  const groups: SavedCity[] = [];
  for (const x of [...list].sort((a, b) => a.t - b.t)) {
    const city = index[x.c];
    const row = city?.rows[x.id];
    if (!city || !row) continue;
    let g = groups.find((y) => y.slug === x.c);
    if (!g) { g = { slug: x.c, name: city.name, rows: [] }; groups.push(g); }
    g.rows.push({ id: x.id, ...row });
  }
  if (!groups.length) return empty;
  return (
    <>
      <div className="mb-10"><ShareSaved locale={locale} /></div>
      <SavedRows groups={groups} locale={locale} removable />
    </>
  );
}
