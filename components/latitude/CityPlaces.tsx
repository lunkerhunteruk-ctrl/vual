import Link from 'next/link';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import { AskAboutButton } from '@/components/latitude/AskTraveller';
import { placeAnchor } from '@/components/latitude/CityGuideExtras';
import TrackLink from '@/components/latitude/TrackLink';
import { areasOf, sectionsOf, type CityPlace, type LatitudeCity, type PlaceCategory, type PlaceSection } from '@/lib/latitude-places';

// 2026-10-30 街のページと「街×種類」のページで共通の、店の並び。
// 種類の見出しの横に旅人の1日の場面を1枚（その店の写真ではないと分かるように、店の行には置かない）。
// 2026-11-01 節（sectionsOf）ごとに並べる：その街ならではの産業が先、飲食と器があと。産業の節は見出しの下に短い説明。

export { CATEGORY_ORDER } from '@/lib/latitude-places';
const mapUrl = (name: string, address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

export function PlaceGroup({ c, sec, ja, locale, who, canAsk, linkHeading }: {
  c: LatitudeCity; sec: PlaceSection; ja: boolean; locale: string; who: string; canAsk: boolean; linkHeading: boolean;
}) {
  const items = sec.items;
  const label = ja ? sec.label.ja : sec.label.en;
  const im = sec.kind === 'category' ? c.categoryImages?.[sec.category] : undefined;
  return (
    <div className="md:grid md:grid-cols-[1fr_3fr] md:gap-12">
      <div className="mb-5 md:mb-0">
        {linkHeading ? (
          <>
            {sec.kind === 'industry' && (
              <p className="mb-2 text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? `${c.nameJa}ならでは` : `Made in ${c.name}`}</p>
            )}
            <Link href={`/${locale}/latitude/places/${c.slug}/${sec.key}`} className="text-[22px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: INK }}>
              {label}
            </Link>
            {sec.about && <p className="mt-3 max-w-xs text-[13px] leading-relaxed" style={{ color: MUTE }}>{ja ? sec.about.ja : sec.about.en}</p>}
          </>
        ) : null /* 街×種類のページでは、題が同じ言葉なので見出しを出さない */}
        {im && (
          <figure className="mt-4 w-[46vw] max-w-[200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/latitude/places/${c.slug}/${im.file}`} alt={ja ? im.altJa : im.alt} loading="lazy" className="w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
            <figcaption className="mt-2 text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? `${who}の1日から` : `From ${who}'s day`}</figcaption>
          </figure>
        )}
      </div>
      <ul className="flex flex-col">
        {items.map((x) => (
          <li key={x.name} id={placeAnchor(x)} className="scroll-mt-24 border-t py-6 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-6" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-[20px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 400 }}>
                {ja ? x.name : x.nameEn}
                {x.ad && <span className="ml-3 align-middle text-[9px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? '広告' : 'Ad'}</span>}
              </h3>
              <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? x.area : x.areaEn}</p>
            </div>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed">{ja ? x.what : x.whatEn}</p>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed" style={{ fontFamily: SERIF }}>
              <span className="mr-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{who}</span>
              {ja ? x.note : x.noteEn}
            </p>
            <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.3em]">
              <TrackLink href={x.url} label={ja ? '公式サイト' : 'Website'} shop={x.name} kind="site" person={c.person} />
              <TrackLink href={mapUrl(x.name, x.address)} label={ja ? '地図' : 'Map'} shop={x.name} kind="map" person={c.person} />
              {canAsk && <AskAboutButton text={ja ? `${x.name}について教えて` : `Tell me about ${x.nameEn}`} label={ja ? `${who}に聞く` : `Ask ${who}`} shop={x.name} person={c.person} />}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 検索エンジン向けの店の一覧（ItemList）。店の種類ごとに schema.org の型を合わせる
const TYPE: Record<PlaceCategory, string> = { local: 'LocalBusiness', matcha: 'CafeOrCoffeeShop', sweets: 'CafeOrCoffeeShop', food: 'Restaurant', coffee: 'CafeOrCoffeeShop', craft: 'Store' };
export function PlacesJsonLd({ c, items, ja, name }: { c: LatitudeCity; items: CityPlace[]; ja: boolean; name: string }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((x, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': TYPE[x.category],
        name: ja ? x.name : x.nameEn,
        url: x.url,
        address: { '@type': 'PostalAddress', streetAddress: x.address, addressLocality: c.name, addressCountry: c.countryCode ?? 'JP' },
        description: ja ? x.what : x.whatEn,
      },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

// ほかの種類へのリンク（街×種類のページの下と、街のページの見出しの下）
export function CategoryLinks({ c, locale, ja, current }: { c: LatitudeCity; locale: string; ja: boolean; current?: string }) {
  const secs = sectionsOf(c);
  return (
    <p className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.3em]">
      {secs.map((s) => (
        <Link key={s.key} href={`/${locale}/latitude/places/${c.slug}/${s.key}`} className="underline-offset-4 hover:underline"
          style={{ color: s.key === current ? MUTE : INK }} aria-current={s.key === current ? 'page' : undefined}>
          {(ja ? c.nameJa : c.name)}{ja ? 'の' : ' · '}{ja ? s.label.ja : s.label.en}
        </Link>
      ))}
    </p>
  );
}

// 地区のページへのリンク（店が AREA_MIN 軒以上ある地区だけ。無ければ何も出さない）
export function AreaLinks({ c, locale, ja }: { c: LatitudeCity; locale: string; ja: boolean }) {
  const areas = areasOf(c);
  if (!areas.length) return null;
  return (
    <p className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.3em]">
      {areas.map((a) => (
        <Link key={a.slug} href={`/${locale}/latitude/places/${c.slug}/area/${a.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
          {ja ? a.name : a.nameEn}
        </Link>
      ))}
    </p>
  );
}
