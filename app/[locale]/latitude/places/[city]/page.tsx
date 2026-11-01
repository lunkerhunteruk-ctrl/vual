import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPerson } from '@/lib/latitude';
import { CITIES, getCity, sectionsOf } from '@/lib/latitude-places';
import { AreaLinks, CategoryLinks, PlaceGroup, PlacesJsonLd } from '@/components/latitude/CityPlaces';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import AskTraveller from '@/components/latitude/AskTraveller';
import RoomCam from '@/components/latitude/RoomCam';
import { CityRoute, CityWear } from '@/components/latitude/CityGuideExtras';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { NowInCity } from '@/components/latitude/NowInCity';
import { latAsset } from '@/lib/latitude-assets';

// 2026-10-30 LATITUDE の街のページ（試作）。旅人のその街の1日と、旅人のおすすめの店（編集部が営業を確かめた物だけ）。
// のちに小さな街の冊子になるように：店は種類ごとに並べ、公式サイトと地図へのリンクを付ける。店の写真は載せない。

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const { locale, city } = await params;
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
    openGraph: { type: 'article', siteName: 'VUAL', title, description, url: `https://vual.jp/${ja ? 'ja' : 'en'}${path}` },
  };
}


export default async function LatitudeCityPage({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  const c = getCity(city);
  if (!c) notFound();
  const ja = locale === 'ja';
  const p = getPerson(c.person);
  const who = p ? (ja ? p.ja.name : p.name) : '';
  const groups = sectionsOf(c); // その街ならではの産業が先、飲食と器があと
  const checked = c.places.map((x) => x.verifiedAt).sort().at(-1);
  // 旅人に部屋（会話）があれば、このページからその場で聞ける
  const room = roomsOpen() ? getRoom(c.person) : undefined;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />
      <PlacesJsonLd c={c} items={c.places} ja={ja} name={ja ? `${c.nameJa} — ${who}のおすすめ` : `${c.name} — where ${who} would go`} />

      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-16 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '街' : 'Places'}
        </p>
        <p className="mt-5 text-[40px] leading-none md:text-[64px]" style={{ fontFamily: SERIF }}>{c.latitude}</p>
        <h1 className="mt-3 text-[56px] leading-[0.95] md:text-[110px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em' }}>
          {ja ? c.nameJa : c.name}
        </h1>
        <p className="mt-5 text-[12px] uppercase tracking-[0.4em]">{ja ? c.countryJa : c.country}</p>
        {/* 2026-11-01 その街のいま（時刻・気温・天気。Open-Meteo を30分ためる。取れない時は出ない） */}
        <NowInCity place={c.issue ?? c.slug} coords={c.coords} name={ja ? c.nameJa : c.name} ja={ja} className="mt-7" />
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>{ja ? c.introJa : c.intro}</p>
      </header>

      {/* 旅人の1日の場面（号の静止画）。横に流す */}
      <section className="pb-16 md:pb-24">
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
      </section>

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

      <CityRoute c={c} ja={ja} who={who} />
      <CityWear c={c} ja={ja} who={who} />

      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>{ja ? `${who}のおすすめ` : `Where ${who} would go`}</SectionLabel>
          <div className="mb-12 flex flex-col gap-3"><CategoryLinks c={c} locale={locale} ja={ja} /><AreaLinks c={c} locale={locale} ja={ja} /></div>
          <div className="flex flex-col gap-14">
            {groups.map((g) => (
              <PlaceGroup key={g.key} c={c} sec={g} ja={ja} locale={locale} who={who} canAsk={!!room} linkHeading />
            ))}
          </div>
          <p className="mt-16 max-w-2xl text-[12px] leading-relaxed" style={{ color: MUTE }}>
            {ja
              ? `${who}は架空の旅人です。店は、編集部が実在と営業を確かめた所だけを載せています（${checked}確認）。営業時間や休みは、行く前に公式サイトで確かめてください。広告の店には印を付けます。`
              : `${who} is a fictional traveller. Every place here was checked by the editors to exist and be open (checked ${checked}). Please confirm hours on the official site before you go. Paid listings are always marked.`}
          </p>
        </div>
      </section>

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
