import Link from 'next/link';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import type { PlaceCountry } from '@/lib/latitude-places-index';
import { REGIONS } from '@/lib/latitude-regions';

const MONTH_NO: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };

// 2026-11-11 場所のページと国のページの、国ごと・街ごとの文字の一覧（街の案内と号へのリンク）。検索と AI のチャットが読む
export function CountryCityList({ countries, locale, linkCountry = true, heading = true }: { countries: PlaceCountry[]; locale: string; linkCountry?: boolean; heading?: boolean }) {
  const ja = locale === 'ja';
  return (
    <div className={`grid gap-12 md:gap-x-16 ${countries.length > 1 ? 'md:grid-cols-2' : ''}`}>
      {countries.map((c) => (
        <div key={c.code}>
          {heading && <h2 className="text-[26px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>
            {linkCountry ? (
              <Link href={`/${locale}/latitude/places/${c.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? c.name.ja : c.name.en}</Link>
            ) : (ja ? c.name.ja : c.name.en)}
          </h2>}
          {/* 2026-11-14 ユーザー：町が多い国（いまは日本）は、号のある町だけを行で出し、ほかの町は「ほかの町」にしまう。
              開くと、地方ごとに北から名前だけ（凛のページと同じ形）。しまっても HTML には全部あるので、検索と AI のチャットは読める */}
          {REGIONS[c.code] && c.cities.length > 8 ? (() => {
            const main = c.cities.filter((q) => q.issue);
            const rest = c.cities.filter((q) => !q.issue);
            const groups = REGIONS[c.code].map((r) => ({ r, qs: rest.filter((q) => q.region === r.key).sort((x, y) => y.lat - x.lat) })).filter((g) => g.qs.length);
            return (
              <>
                {main.length > 0 && (
                  <>
                    <p className="lat-label mt-6" style={{ color: MUTE }}>{ja ? '旅人が1日を過ごした町' : 'Where a traveller spent a day'}</p>
                    <Rows qs={main} locale={locale} />
                  </>
                )}
                {rest.length > 0 && (
                  <details className="group mt-2 border-t" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
                    <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                      <span className="text-[20px]" style={{ fontFamily: SERIF, color: INK }}>{ja ? `旅人のおすすめの町　${rest.length}` : `Towns with the travellers' picks  ${rest.length}`}</span>
                      <span className="text-[12px] uppercase tracking-[0.2em]" style={{ color: INK }}>
                        <span className="group-open:hidden">{ja ? '街の案内を見る ＋' : 'City guides +'}</span>
                        <span className="hidden group-open:inline">{ja ? '閉じる －' : 'Close −'}</span>
                      </span>
                    </summary>
                    <dl className="flex flex-col pb-2">
                      {groups.map(({ r, qs }) => (
                        <div key={r.key} className="grid grid-cols-1 gap-1 border-t py-3" style={{ borderColor: 'rgba(30,29,27,0.08)' }}>
                          <dt className="lat-label" style={{ color: MUTE }}>{ja ? r.ja : r.en}</dt>
                          <dd className="flex min-w-0 flex-wrap gap-x-5 gap-y-1.5 text-[15px]" style={{ fontFamily: SERIF }}>
                            {qs.map((q) => (
                              <Link key={q.slug} href={`/${locale}/latitude/places/${q.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                                {ja ? q.nameJa : q.name}
                              </Link>
                            ))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </>
            );
          })() : <Rows qs={c.cities} locale={locale} />}
        </div>
      ))}
    </div>
  );
}

function Rows({ qs, locale }: { qs: PlaceCountry['cities']; locale: string }) {
  const ja = locale === 'ja';
  return (
    <ul className="mt-4 flex flex-col">
      {qs.map((q) => (
        <li key={q.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t py-4" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
          <span className="flex items-baseline gap-4">
            <Link href={`/${locale}/latitude/places/${q.slug}`} className="text-[20px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: INK }}>
              {ja ? q.nameJa : q.name}
            </Link>
            <span className="text-[12px] uppercase tracking-[0.2em] tabular-nums" style={{ color: MUTE }}>{q.latitude}</span>
          </span>
          <span className="ml-auto flex gap-x-5 whitespace-nowrap text-[12px] uppercase tracking-[0.2em]">
            <Link href={`/${locale}/latitude/places/${q.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
              {ja ? '街の案内' : 'City guide'}
            </Link>
            {q.issue && (
              <Link href={`/${locale}/latitude/${q.issue.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                {/* 2026-11-14 ユーザー：「号（RIN・NOVEMBER）」でなく、何があるかで「凛の1日（11月）」 */}
                {ja ? `${q.person?.nameJa ?? q.person?.name ?? '旅人'}の1日${q.issue.month ? `（${MONTH_NO[q.issue.month] ?? ''}月）` : ''} →` : `${q.person?.name ?? 'The'}'s day${q.issue.month ? `, ${q.issue.month}` : ''} →`}
              </Link>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
