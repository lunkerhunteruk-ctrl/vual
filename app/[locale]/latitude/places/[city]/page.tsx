import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { CATEGORY_LABEL, CATEGORY_ORDER, CITIES, SIGHT_LABEL, getCity, sectionsOf, slugify } from '@/lib/latitude-places';
import { AreaLinks, PlaceRow, PlacesJsonLd, mapUrl } from '@/components/latitude/CityPlaces';
import { ShowOnMap } from '@/components/latitude/HScroller';
import CityShopMap, { type RinStop, type ShopPin } from '@/components/latitude/CityShopMap';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import AskTraveller from '@/components/latitude/AskTraveller';
import RoomCam from '@/components/latitude/RoomCam';
import { HIDDEN } from '@/lib/latitude-hidden';
import { CityDayRoute, CityRoute, CityWear, hasDayRoute, placeAnchor } from '@/components/latitude/CityGuideExtras';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { NowInCity } from '@/components/latitude/NowInCity';
import { latAsset, latAssetAbs } from '@/lib/latitude-assets';
import BANNERS from '@/lib/latitude-banners.json';

// 2026-11-13 町の頭の横長の写真（ウィキメディア・コモンズの自由に使える写真。撮った人と条件を写真の下に書く。選び方は vault.vual.jp tools/commons-town-photos.py）
type Banner = { file: string; pos: string; alt: string; altJa: string; author: string; license: string; licenseUrl: string; source: string; w: number; h: number };
const bannerOf = (slug: string) => (BANNERS as Record<string, Banner>)[slug];
import { CityLocator } from '@/components/latitude/CityLocator';
import { PLACES } from '@/lib/latitude-map';
import { breadcrumbJsonLd, countryOfCity, getPlaceCountry, placeCountries } from '@/lib/latitude-places-index';
import CountryPlacesPage, { countryMetadata } from '@/components/latitude/CountryPlacesPage';
import { JsonLd } from '@/lib/latitude-publication';

// 2026-10-30 LATITUDE の街のページ（試作）。旅人のその街の1日と、旅人のおすすめの店（編集部が営業を確かめた物だけ）。
// のちに小さな街の冊子になるように：店は種類ごとに並べ、公式サイトと地図へのリンクを付ける。店の写真は載せない。

// 2026-11-11 同じ段に国のページも出す（/latitude/places/japan）。国と街の slug は重ならない（lib/latitude-places-index.ts で確かめる）
export function generateStaticParams() {
  return [...CITIES.map((c) => ({ city: c.slug })), ...placeCountries().map((c) => ({ city: c.slug }))];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const { locale, city } = await params;
  const country = getPlaceCountry(city);
  if (country) return countryMetadata(country, locale);
  const c = getCity(city);
  if (!c) return { title: 'LATITUDE — VUAL' };
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  // 2026-11-01 ユーザー了承：号のページは「何を着るか」、街のページは「どこへ行くか・何を見つけるか」。題にその街ならではの産業を入れる
  const inds = (c.industries || []).slice(0, 2);
  const indEn = inds.map((x) => x.en).join(' and ');
  const indJa = inds.map((x) => x.ja).join('と');
  const title = ja
    ? `${c.nameJa}で行く所${indJa ? `——${indJa}の店と、食べる所` : ''}｜${who}のおすすめ | LATITUDE`
    : `Where to go in ${c.name}${indEn ? ` — ${indEn}, and where to eat` : ''} | ${who}'s list, LATITUDE`;
  const description = ja ? c.introJa : c.intro;
  const path = `/latitude/places/${c.slug}`;
  return {
    title,
    description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'article', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}`,
      ...(bannerOf(c.slug) ? { images: [{ url: latAssetAbs(bannerOf(c.slug)!.file), alt: ja ? bannerOf(c.slug)!.altJa : bannerOf(c.slug)!.alt }] } : {}) },
  };
}


export default async function LatitudeCityPage({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  const country = getPlaceCountry(city);
  if (country) return <CountryPlacesPage c={country} locale={locale} />;
  const c = getCity(city);
  if (!c) notFound();
  const ja = locale === 'ja';
  const home = countryOfCity(c.slug); // 道しるべ「場所 › 日本 › 金沢」の国
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const groups = sectionsOf(c); // その街ならではの産業が先、飲食と器があと
  const checked = c.places.map((x) => x.verifiedAt).sort().at(-1);
  // 旅人に部屋（会話）があれば、このページからその場で聞ける
  const room = roomsOpen() ? getRoom(c.person) : undefined;
  // 2026-11-11 試作：店の地図（土台のある街だけ）。位置（coords）のある店だけを丸にする。リストはこの下にそのまま
  const isIg = (u?: string) => !!u && /^https?:\/\/(www\.)?instagram\.com\//.test(u);
  const pins: ShopPin[] = c.shopMap
    ? c.places.filter((x) => x.coords).map((x) => {
      const ind = x.category === 'local' ? c.industries?.find((i) => i.key === x.industry) : undefined;
      return {
        id: placeAnchor(x),
        key: x.name,
        name: ja ? x.name : x.nameEn,
        area: ja ? x.area : x.areaEn,
        category: x.category,
        catLabel: ind ? (ja ? ind.ja : ind.en) : (ja ? CATEGORY_LABEL[x.category].ja : CATEGORY_LABEL[x.category].en),
        lat: x.coords![0],
        lon: x.coords![1],
        approx: x.coordsApprox,
        what: ja ? x.what : x.whatEn,
        note: ja ? x.note : x.noteEn,
        site: isIg(x.url) ? undefined : x.url,
        instagram: x.instagram ?? (isIg(x.url) ? x.url : undefined),
        photo: x.photo ? latAsset(`places/${c.slug}/shops/${x.photo}`) : undefined,
        mapUrl: mapUrl(x.name, x.address),
        gq: `${x.name} ${x.address}`,
      };
    })
    : [];
  // 2026-11-11 見る所（アート・名所）も同じ地図に。店とは形を分け、カードは「目印」（凛の一言なし）
  const sightPins: ShopPin[] = c.shopMap
    ? (c.sights || []).map((x) => ({
      id: `sight-${slugify(x.nameEn)}`,
      key: x.name,
      kind: x.kind,
      name: ja ? x.name : x.nameEn,
      area: ja ? x.area : x.areaEn,
      category: x.kind,
      catLabel: ja ? SIGHT_LABEL[x.kind].ja : SIGHT_LABEL[x.kind].en,
      lat: x.coords[0],
      lon: x.coords[1],
      what: ja ? x.what : x.whatEn,
      note: '',
      notice: ja ? x.notice : x.noticeEn,
      site: x.url,
      mapUrl: mapUrl(x.name, x.address),
      gq: `${x.name} ${x.address}`,
    }))
    : [];
  // 2026-11-11 試作：「自分でルートを組む」で選べる、凛の1日の地点（上の段の地図と同じ番号）。道の組み合わせは scripts/latitude-route-pairs.py の stop:番号
  // 同じ場所に2度来る日（盛岡の上の橋）は、最初の1つだけ
  const rinStops: RinStop[] = c.routeBuilder
    ? (c.route || []).filter((r) => r.coords).map((r, k) => ({
      id: `stop:${k + 1}`, n: k + 1,
      name: (ja ? r.shortJa : r.short) ?? (ja ? r.placeJa : r.place),
      lat: r.coords![0], lon: r.coords![1],
      gq: r.gmaps ?? `${r.placeJa} ${c.nameJa}`,
    })).filter((x, k, all) => all.findIndex((y) => y.lat === x.lat && y.lon === x.lon) === k)
    : [];
  const mapCats = [
    ...(['local', ...CATEGORY_ORDER] as const)
      .filter((k) => pins.some((p) => p.category === k))
      .map((k) => ({ key: k as string, label: ja ? CATEGORY_LABEL[k].ja : CATEGORY_LABEL[k].en })),
    ...(['art', 'sight'] as const)
      .filter((k) => sightPins.some((p) => p.category === k))
      .map((k) => ({ key: k as string, label: ja ? SIGHT_LABEL[k].ja : SIGHT_LABEL[k].en })),
  ];

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} current={`places/${c.slug}`} />
      {home && (
        <JsonLd data={breadcrumbJsonLd(ja, [
          [ja ? '場所' : 'Places', '/latitude/places'],
          [ja ? home.name.ja : home.name.en, `/latitude/places/${home.slug}`],
          [ja ? c.nameJa : c.name, `/latitude/places/${c.slug}`],
        ])} />
      )}
      <PlacesJsonLd c={c} items={c.places} ja={ja} name={ja ? `${c.nameJa} — ${who}のおすすめ` : `${c.name} — where ${who} would go`} />

      {/* 2026-11-13 町の頭の横長の写真。ページのいちばん上（道しるべの上）。スマホは2:1、広い画面は5:2 */}
      {bannerOf(c.slug) && (() => {
        const b = bannerOf(c.slug)!;
        return (
          <figure className="mx-auto max-w-6xl px-4 pt-6 md:px-8 md:pt-10">
            <span data-lat-photo className="relative block aspect-[2/1] w-full overflow-hidden md:aspect-[5/2]" style={{ background: '#e6e2da' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={latAsset(b.file)} alt={ja ? b.altJa : b.alt} width={b.w} height={b.h} fetchPriority="high"
                className="absolute inset-0 block h-full w-full object-cover" style={{ objectPosition: b.pos, height: '100%' }} />
            </span>
            <figcaption className="mt-2 text-[11px] leading-relaxed" style={{ color: MUTE }}>
              {ja ? b.altJa : b.alt}
              <span className="mx-2">·</span>
              {ja ? '写真：' : 'Photo: '}
              <a href={b.source} target="_blank" rel="noopener" className="underline underline-offset-2" style={{ color: MUTE }}>{b.author}</a>
              {' / '}
              {b.licenseUrl
                ? <a href={b.licenseUrl} target="_blank" rel="noopener license" className="underline underline-offset-2" style={{ color: MUTE }}>{b.license}</a>
                : b.license}
              {ja ? '（ウィキメディア・コモンズ）' : ' (Wikimedia Commons)'}
            </figcaption>
          </figure>
        );
      })()}
      <header className={`mx-auto max-w-6xl px-4 pb-10 md:px-8 md:pb-16 ${bannerOf(c.slug) ? 'pt-8 md:pt-12' : 'pt-16 md:pt-28'}`}>
        {/* 2026-11-11 道しるべ：場所 › 国 › 街 */}
        {home ? (
          <nav aria-label={ja ? '道しるべ' : 'Breadcrumb'} className="lat-label" style={{ color: MUTE }}>
            <Link href={`/${locale}/latitude/places`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? '場所' : 'Places'}</Link>
            <span className="mx-2">›</span>
            <Link href={`/${locale}/latitude/places/${home.slug}`} className="underline-offset-4 hover:underline" style={{ color: MUTE }}>{ja ? home.name.ja : home.name.en}</Link>
            <span className="mx-2">›</span>
            <span aria-current="page" style={{ color: INK }}>{ja ? c.nameJa : c.name}</span>
          </nav>
        ) : (
          <p className="lat-label" style={{ color: MUTE }}>
            Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '街' : 'Places'}
          </p>
        )}
        <p className="mt-5 text-[40px] leading-none md:text-[64px]" style={{ fontFamily: SERIF }}>{c.latitude}</p>
        <h1 className="mt-3 text-[56px] leading-[0.95] md:text-[110px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>
          {ja ? c.nameJa : c.name}
        </h1>
        <p className="lat-label mt-5">{ja ? c.countryJa : c.country}</p>
        {/* 2026-11-11 国の形の小さな図に街の点（外国の人が、その街がどこかすぐ分かるように） */}
        {c.locator && (c.locator.at ?? c.coords ?? PLACES[c.issue ?? c.slug]) && (
          <CityLocator className="mt-7" country={c.countryCode ?? 'JP'} at={(c.locator.at ?? c.coords ?? PLACES[c.issue ?? c.slug])!}
            text={ja ? c.locator.ja : c.locator.en}
            label={ja ? `地図：${c.nameJa}の位置` : `Map: where ${c.name} is`}
            href={home ? `/${locale}/latitude/places/${home.slug}` : undefined} />
        )}
        {/* 2026-11-01 その街のいま（時刻・気温・天気。Open-Meteo を30分ためる。取れない時は出ない） */}
        <NowInCity place={c.issue ?? c.slug} coords={c.coords} name={ja ? c.nameJa : c.name} ja={ja} className="mt-7" />
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>{ja ? c.introJa : c.intro}</p>
      </header>


      {/* 2026-11-11 試作：位置の分かる1日の回り方がある街（金沢）は、店の地図より先に「映像 → 点線の地図 → Google マップ」。回り方のカードもこの中 */}
      <CityDayRoute c={c} ja={ja} who={who} locale={locale} />

      {/* 2026-11-14 この町から行く穴場（lib/latitude-hidden.ts。地元で有名な1か所への1日） */}
      {HIDDEN.some((h) => h.townSlug === c.slug) && (
        <section className="px-4 pb-16 md:px-8 md:pb-20">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>{ja ? `${c.nameJa}から行く地元の名所` : `A hidden spot from ${c.name}`}</SectionLabel>
            <ul className="flex flex-col gap-5">
              {HIDDEN.filter((h) => h.townSlug === c.slug).map((h) => (
                <li key={h.slug} className="max-w-2xl">
                  <Link href={`/${locale}/latitude/places/japan/spot/${h.slug}`} className="text-[20px] underline-offset-4 hover:underline" style={{ fontFamily: SERIF, color: '#4f6b3a' }}>{ja ? h.name : h.nameEn}</Link>
                  <p className="mt-1 text-[14px] leading-relaxed">{ja ? h.what : h.whatEn} <span style={{ color: MUTE }}>{ja ? h.peakNoteJa : h.peakNote}</span></p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {pins.length + sightPins.length > 0 && (
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>
              {c.routeBuilder
                ? (ja ? `${who}のおすすめを地図で見る・自分でルートを組む` : `Where ${who} would go, on the map — or build your own route`)
                : (ja ? `地図で見る、${who}のおすすめ` : `Where ${who} would go, on the map`)}
            </SectionLabel>
            <CityShopMap src={`/latitude/citymaps/${c.slug}.json`} pins={[...pins, ...sightPins]} ja={ja} who={who} person={c.person} cats={mapCats}
              pairsSrc={c.routeBuilder ? `/latitude/routes/${c.slug}-pairs.json` : undefined} rinStops={rinStops} />
          </div>
        </section>
      )}

      {/* 旅人の1日の場面（号の静止画）。横に流す。2026-11-11 号のない町（場面の写真が無い）は出さない＝「凛の〇〇の1日」とも書かない */}
      {c.images.length > 0 && <section className="pb-16 md:pb-24">
        <div className="mx-auto flex max-w-6xl snap-x gap-3 overflow-x-auto px-4 md:gap-6 md:px-8" style={{ scrollbarWidth: 'thin' }}>
          {c.images.map((im) => (
            // 2026-11-01 data-lat-photo：その街が夜の間だけ、写真をうすく暗く・青くする（NowLine の <style>）
            <span key={im.file} data-lat-photo className="block w-[56vw] shrink-0 snap-start md:w-[22vw] md:max-w-[260px]" style={{ aspectRatio: '9 / 16' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={latAsset(`places/${c.slug}/${im.file}`)} alt={ja ? im.altJa : im.alt} loading="lazy" className="block h-full w-full object-cover" />
            </span>
          ))}
        </div>
        <div className="mx-auto mt-5 max-w-6xl px-4 text-[11px] uppercase tracking-[0.3em] md:px-8">
          {p && (
            <Link href={`/${locale}/latitude/people/${p.slug}`} style={{ color: INK }}>
              {ja ? `${who}の${c.nameJa}の1日` : `${who}'s day in ${c.name}`}&nbsp;&nbsp;→
            </Link>
          )}
        </div>
      </section>}

      {/* 深掘りの街だけ：旅人が泊まった宿の部屋（日本の時刻で場面が変わる） */}
      {c.inn && (
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:items-end md:gap-12">
            <div className="mb-5 md:mb-0">
              <SectionLabel>{ja ? c.inn.titleJa : c.inn.title}</SectionLabel>
              <p className="-mt-4 max-w-sm text-[14px] leading-relaxed" style={{ color: MUTE }}>{ja ? c.inn.noteJa : c.inn.note}</p>
            </div>
            <div className="w-full max-w-[360px] overflow-hidden" style={{ aspectRatio: '4 / 5' }}>
              <RoomCam cam={c.inn.cam} reaction={null} fallback={ja ? '戸は開いています。' : 'The door is open.'} />
            </div>
          </div>
        </section>
      )}

      {!hasDayRoute(c) && <CityRoute c={c} ja={ja} who={who} />}
      <CityWear c={c} ja={ja} who={who} />

      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>{ja ? `${who}のおすすめ` : `Where ${who} would go`}</SectionLabel>
          {/* 2026-11-11 種類ごとに横に流す（ユーザー「縦スクロールが多すぎる」）。地区のページへのリンクは下に小さく */}
          <div className="flex flex-col gap-11">
            {groups.map((g) => (
              <PlaceRow key={g.key} c={c} sec={g} ja={ja} locale={locale} who={who} canAsk={!!room} mapIds={new Set(pins.map((p) => p.id))} />
            ))}
          </div>
          <div className="mt-14 flex flex-col gap-3">
            <p className="lat-label" style={{ color: MUTE }}>{ja ? '地区から' : 'By area'}</p>
            <AreaLinks c={c} locale={locale} ja={ja} />
          </div>
          <p className="mt-16 max-w-2xl text-[12px] leading-relaxed" style={{ color: MUTE }}>
            {ja
              ? `${who}は架空の旅人です。店は、編集部が実在と営業を確かめた所だけを載せています（${checked}確認）。営業時間や休みは、行く前に公式サイトで確かめてください。広告の店には印を付けます。`
              : `${who} is a fictional traveller. Every place here was checked by the editors to exist and be open (checked ${checked}). Please confirm hours on the official site before you go. Paid listings are always marked.`}
          </p>
        </div>
      </section>

      {/* 2026-11-11 見る所（アート・名所）。店とは別：凛のおすすめの店ではなく、街の目印。公式で開いている事を確かめた所だけ */}
      {sightPins.length > 0 && (
        <section className="px-4 pb-20 md:px-8 md:pb-28">
          <div className="mx-auto max-w-6xl">
            <SectionLabel>{ja ? `見る所——美術館と名所（目印）` : `To see — art and sights (landmarks)`}</SectionLabel>
            <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {sightPins.map((x) => (
                <li key={x.id} id={x.id} className="scroll-mt-24">
                  <p className="lat-label" style={{ color: MUTE }}>{x.catLabel}&nbsp;&nbsp;·&nbsp;&nbsp;{x.area}</p>
                  <p className="mt-2 text-[20px] leading-snug" style={{ fontFamily: SERIF }}>{x.name}</p>
                  <p className="mt-1 text-[14px] leading-relaxed">{x.what}</p>
                  {x.notice && <p className="mt-2 text-[12px] leading-relaxed" style={{ color: '#7a241e' }}>{x.notice}</p>}
                  <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[10px] uppercase tracking-[0.3em]">
                    <a href={x.site} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? '公式サイト' : 'Website'}</a>
                    <a href={x.mapUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? 'Google マップ' : 'Google Maps'}</a>
                    <ShowOnMap id={x.id} label={ja ? '地図で見る ↑' : 'On the map ↑'} />
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-2xl text-[12px] leading-relaxed" style={{ color: MUTE }}>
              {ja
                ? `見る所は、${who}のおすすめの店とは別の、街の目印です。開いていることを公式で確かめています（${(c.sights || []).map((x) => x.verifiedAt).sort().at(-1)}確認）。時間や休みは、行く前に公式サイトで。`
                : `These are landmarks, not ${who}'s picks. Each was checked to be open on its official site (checked ${(c.sights || []).map((x) => x.verifiedAt).sort().at(-1)}). Please confirm hours before you go.`}
            </p>
          </div>
        </section>
      )}

      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>

      {room && p && (
        <AskTraveller locale={locale} slug={p.slug} name={who} callSeconds={room.callSeconds}
          context={`The visitor is reading your guide page for ${c.name} on the website, which lists your recommended places there. Answer about ${c.name} and those places.`} />
      )}
    </div>
  );
}
