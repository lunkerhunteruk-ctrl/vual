import { INK, MUTE, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import { slugify, type CityPlace, type LatitudeCity } from '@/lib/latitude-places';
import { latAsset } from '@/lib/latitude-assets';
import HScroller from '@/components/latitude/HScroller';
import { CARD_W } from '@/lib/latitude-card';

// 2026-10-30 街のページの「この季節に何を着るか」と「旅人の1日の回り方」。AI のチャットにない、VUAL の旅の服と、その日を丸ごと真似できる順番を見せる。
// 回り方の店は「近くの、旅人のおすすめ」。旅人がその店に行ったとは書かない（行ったのは号の場面の場所だけ）。

export const placeAnchor = (x: CityPlace) => `place-${slugify(x.nameEn)}`;

export function CityWear({ c, ja, who }: { c: LatitudeCity; ja: boolean; who: string }) {
  const w = c.wear;
  if (!w) return null;
  const city = ja ? c.nameJa : c.name;
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <SectionLabel>{ja ? `${w.seasonJa}の${city}で、何を着るか` : `What to wear in ${city}, ${w.season.toLowerCase()}`}</SectionLabel>
        <ul className="mb-10 flex max-w-2xl flex-col gap-1 text-[14px] leading-relaxed" style={{ color: MUTE }}>
          {w.facts.map((f) => <li key={f.en}>{ja ? f.ja : f.en}</li>)}
        </ul>
        {/* スマホでは横に流す（縦長の写真を3枚縦に積むと長すぎる）。広い画面では3列 */}
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-0" style={{ scrollbarWidth: 'thin' }}>
          {w.looks.map((l) => (
            <figure key={l.time} className="flex w-[68vw] min-w-0 shrink-0 snap-start flex-col gap-3 sm:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {/* 服が頭から靴まで見えるように、号の絵の縦長のまま（切ると顔や足が切れる） */}
              <img src={latAsset(`places/${c.slug}/${l.image}`)} alt={ja ? l.itemsJa : l.items} loading="lazy" className="w-full object-cover" style={{ aspectRatio: '9 / 16' }} />
              <figcaption className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-[0.3em] tabular-nums" style={{ color: MUTE }}>{l.time}</span>
                <span className="text-[14px] leading-relaxed">{ja ? l.itemsJa : l.items}</span>
                <span className="text-[16px] leading-relaxed" style={{ fontFamily: SERIF }}>
                  <span className="mr-2 text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{who}</span>
                  {ja ? l.noteJa : l.note}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {/* 実在ブランドの服で撮った号（vualOriginals: false）は出さない。ブランド名も書かない */}
        {w.vualOriginals !== false && <p className="mt-8 text-[12px]" style={{ color: MUTE }}>{ja ? '服はすべて VUAL のオリジナルです。' : 'All clothes are VUAL originals.'}</p>}
      </div>
    </section>
  );
}

export function CityRoute({ c, ja, who }: { c: LatitudeCity; ja: boolean; who: string }) {
  if (!c.route?.length) return null;
  const byName = new Map(c.places.map((x) => [x.name, x]));
  // 2026-11-11 ユーザー「縦スクロールが多すぎる」→ 1つの時刻＝1枚のカードを横に流す（上に写真 4:5、下に時刻・場所・一文・近くのおすすめ）
  return (
    <section className="px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-6xl">
        <HScroller count={c.route.length} label={ja ? `${who}の1日の回り方` : `${who}'s day, in order`} ja={ja}
          head={<p className="text-[10px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>{ja ? `${who}の1日の回り方` : `${who}'s day, in order`}</p>}>
          {c.route.map((r) => {
            const near = (r.near || []).map((n) => byName.get(n)).filter(Boolean) as CityPlace[];
            return (
              <li key={r.time} className={`${CARD_W} shrink-0 snap-start`}>
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={latAsset(`places/${c.slug}/${r.image}`)} alt={ja ? r.whatJa : r.what} loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '4 / 5' }} />
                ) : (
                  // 写真の無い時刻は、紙に時刻だけ（店や場面の写真を作らない）
                  <div className="flex w-full items-end p-5" style={{ aspectRatio: '4 / 5', border: '1px solid rgba(30,29,27,0.14)' }}>
                    <span className="text-[44px] leading-none tabular-nums" style={{ fontFamily: SERIF, color: MUTE }}>{r.time}</span>
                  </div>
                )}
                <p className="mt-4 text-[11px] uppercase tabular-nums tracking-[0.3em]" style={{ color: MUTE }}>{r.time}</p>
                <p className="mt-1 text-[20px] leading-snug" style={{ fontFamily: SERIF }}>{ja ? r.placeJa : r.place}</p>
                <p className="mt-1 text-[15px] leading-relaxed">{ja ? r.whatJa : r.what}</p>
                {near.length > 0 && (
                  <p className="mt-3 text-[12px] leading-relaxed" style={{ color: MUTE }}>
                    {ja ? `近くの、${who}のおすすめ：` : `Nearby, ${who} would go to: `}
                    {near.map((x, k) => (
                      <span key={x.name}>
                        {k > 0 && (ja ? '、' : ', ')}
                        <a href={`#${placeAnchor(x)}`} className="underline underline-offset-4" style={{ color: INK }}>{ja ? x.name : x.nameEn}</a>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </HScroller>
      </div>
    </section>
  );
}
