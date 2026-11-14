import Link from 'next/link';
import { INK, MUTE, SERIF } from '@/components/latitude/Latitude';
import { AskAboutButton } from '@/components/latitude/AskTraveller';
import { placeAnchor } from '@/components/latitude/CityGuideExtras';
import TrackLink from '@/components/latitude/TrackLink';
import { AddressLine, FactsLine, JaName } from '@/components/latitude/ShopFacts';
import { areasOf, sectionsOf, type CityPlace, type LatitudeCity, type PlaceCategory, type PlaceSection } from '@/lib/latitude-places';
import { latAsset } from '@/lib/latitude-assets';
import HScroller, { ShowOnMap } from '@/components/latitude/HScroller';
import { CARD_W } from '@/lib/latitude-card';
import { CATEGORY_COLOR } from '@/lib/latitude-category-colors';
import INDUSTRY_PHOTOS from '@/lib/latitude-industry-photos.json';

// 2026-11-13 「〇〇ならでは」のカードの写真。key は「街/産業の key」
type IndustryPhoto = { file: string; pos: string; alt: string; altJa: string; author: string; license: string; licenseUrl: string; source: string; w: number; h: number };
const industryPhoto = (city: string, key: string) => (INDUSTRY_PHOTOS as Record<string, IndustryPhoto>)[`${city}/${key}`];

// 2026-10-30 街のページと「街×種類」のページで共通の、店の並び。
// 種類の見出しの横に旅人の1日の場面を1枚（その店の写真ではないと分かるように、店の行には置かない）。
// 2026-11-01 節（sectionsOf）ごとに並べる：その街ならではの産業が先、飲食と器があと。産業の節は見出しの下に短い説明。

export { CATEGORY_ORDER } from '@/lib/latitude-places';
export const mapUrl = (name: string, address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address}`)}`;

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
              <p className="lat-label mb-2" style={{ color: MUTE }}>{ja ? `${c.nameJa}ならでは` : `Made in ${c.name}`}</p>
            )}
            <Link href={`/${locale}/latitude/places/${c.slug}/${sec.key}`} className="text-[22px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: INK }}>
              {label}
            </Link>
            {sec.about && <p className="mt-3 max-w-xs text-[14px] leading-relaxed" style={{ color: MUTE }}>{ja ? sec.about.ja : sec.about.en}</p>}
          </>
        ) : null /* 街×種類のページでは、題が同じ言葉なので見出しを出さない */}
        {im && (
          // 2026-11-14 種類のページの最初の写真：遅れて出ないよう lazy を外し、読み込み中は紙より少し濃い色に
          <figure className="mt-4 w-[46vw] max-w-[200px]" style={{ background: '#e6e2da' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={latAsset(`places/${c.slug}/${im.file}`)} alt={ja ? im.altJa : im.alt} className="w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
            <figcaption className="lat-label mt-2" style={{ color: MUTE }}>{ja ? `${who}の1日から` : `From ${who}'s day`}</figcaption>
          </figure>
        )}
      </div>
      <ul className="flex flex-col">
        {items.map((x) => (
          <li key={x.name} id={placeAnchor(x)} className="scroll-mt-24 border-t py-6 first:border-t-0 first:pt-0 md:first:border-t md:first:pt-6" style={{ borderColor: 'rgba(30,29,27,0.14)' }}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h3 className="text-[20px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 400 }}>
                {ja ? x.name : x.nameEn}
                {x.ad && <span className="ml-3 align-middle text-[11px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{ja ? '広告' : 'Ad'}</span>}
              </h3>
              <p className="lat-label" style={{ color: MUTE }}>{ja ? x.area : x.areaEn}</p>
            </div>
            <JaName name={x.name} nameEn={x.nameEn} ja={ja} />
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed">{ja ? x.what : x.whatEn}</p>
            <FactsLine facts={x} ja={ja} className="mt-2 max-w-2xl" />
            <AddressLine address={x.address} ja={ja} className="mt-2 max-w-2xl" />
            <p className="mt-2 max-w-2xl text-[16px] leading-relaxed" style={{ fontFamily: SERIF }}>
              <span className="mr-2 text-[12px] uppercase tracking-[0.18em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE }}>{who}</span>
              {ja ? x.note : x.noteEn}
            </p>
            {/* 2026-11-14 押せる高さ 44px。旅先でいちばん押す道案内（地図）を先に、枠つきで */}
            <p className="mt-1 flex flex-wrap gap-x-5 gap-y-0">
              <TrackLink href={mapUrl(x.name, x.address)} label={ja ? '地図' : 'Map'} shop={x.name} kind="map" person={c.person} main />
              {x.url && <TrackLink href={x.url} label={ja ? '公式サイト' : 'Website'} shop={x.name} kind="site" person={c.person} />}
              {canAsk && <AskAboutButton text={ja ? `${x.name}について教えて` : `Tell me about ${x.nameEn}`} label={ja ? `${who}に聞く` : `Ask ${who}`} shop={x.name} person={c.person} />}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 検索エンジン向けの店の一覧（ItemList）。店の種類ごとに schema.org の型を合わせる
const TYPE: Record<PlaceCategory, string> = { local: 'LocalBusiness', craft: 'Store', wear: 'ClothingStore', jewellery: 'JewelryStore', sweets: 'CafeOrCoffeeShop', food: 'Restaurant', cafe: 'CafeOrCoffeeShop' };
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
        ...(x.url ? { url: x.url } : {}),
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
    <p className="flex flex-wrap gap-x-6 gap-y-0 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]">
      {secs.map((s) => (
        <Link key={s.key} href={`/${locale}/latitude/places/${c.slug}/${s.key}`} className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
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
    <p className="flex flex-wrap gap-x-6 gap-y-0 text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em]">
      {areas.map((a) => (
        <Link key={a.slug} href={`/${locale}/latitude/places/${c.slug}/area/${a.slug}`} className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline" style={{ color: INK }}>
          {ja ? a.name : a.nameEn}
        </Link>
      ))}
    </p>
  );
}

// 2026-11-11 街のページの「おすすめ」：種類ごとに、店のカードを横に流す（ユーザー「縦スクロールが多すぎる」）。
// 見出しの左に地図の丸と同じ色の点、右に「すべて見る →」（種類のページ）。カードは字の組みだけ（店の写真は載せない決まり）。
// カードの中の字は今のリストと同じ文（検索と AI のチャットが読む）。横に隠れたカードも最初から全部描く。
// mapIds：上の店の地図に丸のある店（「地図で見る」を出す）
export function PlaceRow({ c, sec, ja, locale, who, canAsk, mapIds }: {
  c: LatitudeCity; sec: PlaceSection; ja: boolean; locale: string; who: string; canAsk: boolean; mapIds: Set<string>;
}) {
  const label = ja ? sec.label.ja : sec.label.en;
  const im = sec.kind === 'category' ? c.categoryImages?.[sec.category] : undefined;
  const ph = sec.kind === 'industry' ? industryPhoto(c.slug, sec.key) : undefined;
  const count = sec.items.length + (im ? 1 : 0) + (sec.about ? 1 : 0);
  const head = (
    <div className="flex flex-col gap-1">
      <h3 className="flex items-center gap-3 text-[22px] leading-tight" style={{ fontFamily: SERIF, fontWeight: 400 }}>
        <span className="block h-[10px] w-[10px] shrink-0 rounded-full" style={{ background: CATEGORY_COLOR[sec.category] ?? INK }} aria-hidden="true" />
        {sec.kind === 'industry' && <span className="sr-only">{ja ? `${c.nameJa}ならでは：` : `Made in ${c.name}: `}</span>}
        {label}
        <span className="text-[12px] uppercase tabular-nums tracking-[0.2em]" style={{ color: MUTE, fontFamily: 'inherit' }}>{sec.items.length}</span>
      </h3>
      <Link href={`/${locale}/latitude/places/${c.slug}/${sec.key}`} className="inline-flex min-h-[44px] items-center self-start pl-[22px] text-[12px] uppercase tracking-[0.2em] [&:lang(ja)]:tracking-[0.08em] underline-offset-4 hover:underline" style={{ color: INK }}>
        {ja ? `${label}をすべて見る →` : `All ${label.toLowerCase()} →`}
      </Link>
    </div>
  );
  return (
    <div>
      <HScroller count={count} label={ja ? `${c.nameJa}の${label}` : `${label} in ${c.name}`} ja={ja} head={head}>
        {sec.about && (
          // その街ならではの仕事の説明は、列の最初のカードに（見出しの下に置くより縦が短い。字はそのまま）
          // 2026-11-13 カードの上に、その仕事の写真（ウィキメディア・コモンズの自由に使える写真。作者と条件をカードの下に）
          <li className={`${CARD_W} flex shrink-0 snap-start flex-col`} style={{ background: 'rgba(30,29,27,0.04)' }}>
            {ph && (
              <span className="relative block aspect-[4/3] w-full overflow-hidden" style={{ background: '#e6e2da' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={latAsset(ph.file)} alt={ja ? ph.altJa : ph.alt} width={ph.w} height={ph.h} loading="lazy"
                  className="absolute inset-0 block h-full w-full object-cover" style={{ objectPosition: ph.pos, height: '100%' }} />
              </span>
            )}
            <div className="flex flex-1 flex-col justify-end p-5">
              <p className="lat-label" style={{ color: MUTE }}>{ja ? `${c.nameJa}ならでは` : `Made in ${c.name}`}</p>
              <p className="mt-3 text-[15px] leading-relaxed">{ja ? sec.about.ja : sec.about.en}</p>
              {ph && (
                <p className="mt-4 text-[12px] leading-relaxed" style={{ color: MUTE }}>
                  {ja ? ph.altJa : ph.alt}
                  <span className="mx-1.5">·</span>
                  {ja ? '写真：' : 'Photo: '}
                  <a href={ph.source} target="_blank" rel="noopener" className="underline underline-offset-2" style={{ color: MUTE }}>{ph.author}</a>
                  {' / '}
                  {ph.licenseUrl
                    ? <a href={ph.licenseUrl} target="_blank" rel="noopener license" className="underline underline-offset-2" style={{ color: MUTE }}>{ph.license}</a>
                    : ph.license}
                  {ja ? '（ウィキメディア・コモンズ）' : ' (Wikimedia Commons)'}
                </p>
              )}
            </div>
          </li>
        )}
        {sec.items.map((x) => (
          <li key={x.name} id={placeAnchor(x)} className={`${CARD_W} flex shrink-0 snap-start flex-col scroll-mt-28 border p-5`} style={{ borderColor: 'rgba(30,29,27,0.16)' }}>
            <p className="lat-label" style={{ color: MUTE }}>
              {ja ? x.area : x.areaEn}
              {x.ad && <span className="ml-3">{ja ? '広告' : 'Ad'}</span>}
            </p>
            <h4 className="mt-2 text-[20px] leading-snug" style={{ fontFamily: SERIF, fontWeight: 400 }}>{ja ? x.name : x.nameEn}</h4>
            <JaName name={x.name} nameEn={x.nameEn} ja={ja} />
            <p className="mt-3 text-[16px] leading-relaxed">{ja ? x.what : x.whatEn}</p>
            <FactsLine facts={x} ja={ja} />
            <AddressLine address={x.address} ja={ja} />
            <p className="mt-3 text-[16px] leading-relaxed" style={{ fontFamily: SERIF }}>
              <span className="mr-2 text-[12px] uppercase tracking-[0.18em] [&:lang(ja)]:tracking-[0.08em]" style={{ color: MUTE, fontFamily: 'inherit' }}>{who}</span>
              {ja ? x.note : x.noteEn}
            </p>
            {/* 2026-11-14 押せる高さ 44px。順番は Google マップ（枠つき）→ 公式サイト → 地図で見る → 聞く（旅先でいちばん押すのは道案内） */}
            <p className="mt-auto flex flex-wrap gap-x-5 gap-y-0 pt-2">
              <TrackLink href={mapUrl(x.name, x.address)} label={ja ? 'Google マップ' : 'Google Maps'} shop={x.name} kind="map" person={c.person} main />
              {x.url && <TrackLink href={x.url} label={ja ? '公式サイト' : 'Website'} shop={x.name} kind="site" person={c.person} />}
              {mapIds.has(placeAnchor(x)) && <ShowOnMap id={placeAnchor(x)} label={ja ? '地図で見る' : 'On the map'} />}
              {canAsk && <AskAboutButton text={ja ? `${x.name}について教えて` : `Tell me about ${x.nameEn}`} label={ja ? `${who}に聞く` : `Ask ${who}`} shop={x.name} person={c.person} />}
            </p>
          </li>
        ))}
        {im && (
          // 号の場面（その店の写真ではないと分かるよう、カードの列の最後に「凛の1日から」と添えて置く）
          <li className={`${CARD_W} shrink-0 snap-start`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={latAsset(`places/${c.slug}/${im.file}`)} alt={ja ? im.altJa : im.alt} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
            <p className="lat-label mt-2" style={{ color: MUTE }}>{ja ? `${who}の1日から` : `From ${who}'s day`}</p>
          </li>
        )}
      </HScroller>
    </div>
  );
}
