import Link from 'next/link';
import { ACTION_MAIN, INK, MUTE, SERIF } from '@/lib/latitude-theme';
import { AddressLine, JaName } from '@/components/latitude/ShopFacts';
import { RemoveSaved } from '@/components/latitude/SaveButton';

// 2026-11-14 ③-2 保存した店の一覧の行（自分の一覧はブラウザで、共有されたリンクはサーバーで同じ形に描く。'use client' は付けない）。
// 街ごとに、店名（英語版は日本語の店名も）・種類と地区・住所（コピーつき。②-3 の部品）・その店だけの Google マップ

export type SavedRow = { id: string; name: string; nameJa?: string; label: string; address: string };
export type SavedCity = { slug: string; name: string; rows: SavedRow[] };

// Google マップは店のカードと同じ言葉（日本語の店名＋住所）
export const savedMapUrl = (r: SavedRow) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.nameJa ?? r.name} ${r.address}`)}`;

export function SavedRows({ groups, locale, removable = false }: { groups: SavedCity[]; locale: string; removable?: boolean }) {
  const ja = locale === 'ja';
  return (
    <div className="flex flex-col gap-14">
      {groups.map((g) => (
        <section key={g.slug}>
          <h2 className="text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>
            <Link href={`/${locale}/latitude/places/${g.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{g.name}</Link>
          </h2>
          <ul className="mt-4 flex flex-col">
            {g.rows.map((r) => (
              <li key={r.id} className="border-t py-5" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                <p lang={ja ? undefined : 'en'} className="lat-label" style={{ color: MUTE }}>{r.label}</p>
                <p className="mt-1 text-[20px] leading-snug" style={{ fontFamily: SERIF }}>{r.name}</p>
                <JaName name={r.nameJa} nameEn={r.name} ja={ja} />
                <AddressLine address={r.address} ja={ja} />
                <p className="mt-2 flex flex-wrap gap-x-5 gap-y-0">
                  <a href={savedMapUrl(r)} target="_blank" rel="noopener noreferrer" className={ACTION_MAIN} style={{ color: INK, borderColor: INK }}>{ja ? 'Google マップ' : 'Google Maps'}</a>
                  {removable && <RemoveSaved city={g.slug} id={r.id} ja={ja} />}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
