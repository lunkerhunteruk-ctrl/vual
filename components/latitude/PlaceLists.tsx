import Link from 'next/link';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import type { PlaceCountry } from '@/lib/latitude-places-index';

// 2026-11-11 場所のページと国のページの、国ごと・街ごとの文字の一覧（街の案内と号へのリンク）。検索と AI のチャットが読む
export function CountryCityList({ countries, locale, linkCountry = true }: { countries: PlaceCountry[]; locale: string; linkCountry?: boolean }) {
  const ja = locale === 'ja';
  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-x-16">
      {countries.map((c) => (
        <div key={c.code}>
          <h2 className="text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>
            {linkCountry ? (
              <Link href={`/${locale}/latitude/places/${c.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? c.name.ja : c.name.en}</Link>
            ) : (ja ? c.name.ja : c.name.en)}
          </h2>
          <ul className="mt-4 flex flex-col">
            {c.cities.map((q) => (
              <li key={q.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t py-4" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                <span className="flex items-baseline gap-4">
                  <Link href={`/${locale}/latitude/places/${q.slug}`} className="text-[20px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: INK }}>
                    {ja ? q.nameJa : q.name}
                  </Link>
                  <span className="text-[10px] uppercase tracking-[0.3em] tabular-nums" style={{ color: MUTE }}>{q.latitude}</span>
                </span>
                <span className="ml-auto flex gap-x-5 whitespace-nowrap text-[10px] uppercase tracking-[0.3em]">
                  <Link href={`/${locale}/latitude/places/${q.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                    {ja ? '街の案内' : 'City guide'}
                  </Link>
                  {q.issue && (
                    <Link href={`/${locale}/latitude/${q.issue.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                      {ja ? `号${q.person ? `（${q.person.name}${q.issue.month ? `・${q.issue.month}` : ''}）` : ''}` : `The issue${q.person ? ` · ${q.person.name}${q.issue.month ? `, ${q.issue.month}` : ''}` : ''}`}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
