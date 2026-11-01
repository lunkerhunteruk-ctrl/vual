import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ISSUES, assetUrl, getIssue, isLive, issueNo, issuesOf, liveIssues, personOf, type LatitudeIssue } from '@/lib/latitude';
import { stepIntoPages } from '@/lib/latitude-recipe';
import { JsonLd, issueJsonLd } from '@/lib/latitude-publication';
import { existsSync } from 'fs';
import path from 'path';
import AskTraveller from '@/components/latitude/AskTraveller';
import { getRoom, roomsOpen } from '@/lib/latitude-rooms';
import { CITIES } from '@/lib/latitude-places';
import { NowInCity } from '@/components/latitude/NowInCity';
import { ISSUE_CITY_EN, ISSUE_CITY_JA } from '@/lib/latitude-now';
import { INK, IssueStrip, LatitudeFigure, MoreIssues, MUTE, NewsletterSignup, PAPER, Pages, Palette, PublishedBy, Reel, SERIF, SectionLabel } from '@/components/latitude/Latitude';

// LATITUDE の1号を1ページで読む。上から：題字 → リール → カルーセルのページ → 読み物 → 色 → 奥付 → 前後の号

export function generateStaticParams() {
  return ISSUES.map((i) => ({ slug: i.slug }));
}

// 公開予約の号は、時刻まで ?preview=<LATITUDE_PREVIEW_KEY> か、その号の previewToken を付けた時だけ見られる
type SP = Promise<{ preview?: string }>;
const canPreview = (issue: LatitudeIssue, key?: string) =>
  !!key && ((!!issue.previewToken && key === issue.previewToken) || (!!process.env.LATITUDE_PREVIEW_KEY && key === process.env.LATITUDE_PREVIEW_KEY));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const i = getIssue(slug);
  if (!i) return { title: 'LATITUDE — VUAL' };
  if (!isLive(i)) return { title: 'LATITUDE — VUAL', robots: { index: false, follow: false } };
  const title = `LATITUDE ${issueNo(i)} — ${i.latitude} ${i.city} | VUAL`;
  return {
    // 2026-10-30 検索結果に出る題と説明は「その街・その月・何を着るか」（seo）。SNS のリンクの見え方（openGraph）は雑誌の題と一行のまま
    title: i.seo?.title ?? title,
    description: i.seo?.description ?? i.line,
    // 2026-10-30 号の本文は英語で ja・en とも同じなので、本体は英語のページにそろえる（親の layout の canonical "/" を上書きする。上書きしないとトップの写しと見なされ、検索に出ない）
    alternates: {
      canonical: `/en/latitude/${i.slug}`,
      languages: { en: `/en/latitude/${i.slug}`, 'x-default': `/en/latitude/${i.slug}` }, // ja は本体でないので並べない（並べると食い違いになる）
    },
    openGraph: {
      type: 'article',
      siteName: 'VUAL',
      title,
      description: i.line,
      url: `https://vual.jp/${locale}/latitude/${i.slug}`,
      // リンクの見え方は 1200×630 の og.jpg（1ページ目＋紙の色に緯度と一行。scripts/latitude-og.py で作る）。無い号は表紙
      images: [existsSync(path.join(process.cwd(), 'public', 'latitude', i.slug, 'og.jpg'))
        ? { url: assetUrl(i, 'og.jpg'), width: 1200, height: 630 }
        : { url: assetUrl(i, 'cover.jpg'), width: 720, height: 1280 }],
    },
    twitter: { card: 'summary_large_image', title, description: i.line, images: [assetUrl(i, 'og.jpg')] },
  };
}

export default async function LatitudeIssuePage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: SP }) {
  const { locale, slug } = await params;
  const { preview } = await searchParams;
  const issue = getIssue(slug);
  if (!issue) notFound();
  const previewing = !isLive(issue);
  if (previewing && !canPreview(issue, preview)) notFound();
  // 2026-10-22 体験「Step into this look」はログインなしで公開（1人1日3回）。止める時は環境変数 LATITUDE_STEPINTO=off
  const stepOn = process.env.LATITUDE_STEPINTO !== 'off';
  const sampleDir = path.join(process.cwd(), 'public', 'latitude', issue.slug, 'stepinto');
  const sample = existsSync(path.join(sampleDir, 'sample-result.jpg')) ? { face: assetUrl(issue, 'stepinto/sample-face.jpg'), result: assetUrl(issue, 'stepinto/sample-result.jpg') } : null;
  const list = (previewing ? [...ISSUES] : liveIssues()).sort((a, b) => a.no - b.no); // 前の号・次の号は号数の順
  const idx = list.indexOf(issue);
  const prev = list[idx - 1];
  const next = list[idx + 1];
  // 2026-11-01 号の旅人に部屋（会話・通話）があれば、号のページからも話しかけられる。街のページがあれば案内も
  const person = personOf(issue);
  const room = person && roomsOpen() ? getRoom(person.slug) : undefined;
  const city = CITIES.find((c) => c.issue === issue.slug || (c.person === issue.person && c.name.toLowerCase() === issue.city.toLowerCase()));
  const ja = locale === 'ja';
  const who = person ? (ja ? person.ja.name : person.name) : '';
  const nowName = ja ? (city?.nameJa ?? ISSUE_CITY_JA[issue.slug] ?? issue.city) : (ISSUE_CITY_EN[issue.slug] ?? issue.city);

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      {isLive(issue) && <JsonLd data={issueJsonLd(issue)} />}
      <IssueStrip locale={locale} current={issue.slug} />

      {/* 題字 */}
      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-20 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;
          {/* 2026-10-30 号の番号の代わりに「人 · 月」。名前はその人のページへ */}
          {personOf(issue) ? (
            <>
              <Link href={`/${locale}/latitude/people/${issue.person}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                {personOf(issue)!.name}
              </Link>
              {issue.month ? <>&nbsp;&nbsp;·&nbsp;&nbsp;{issue.month}</> : null}
            </>
          ) : (
            issueNo(issue)
          )}
        </p>
        <h1 className="mt-5 text-[64px] leading-[0.95] md:text-[120px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em', color: INK }}>
          <LatitudeFigure value={issue.latitude} />
        </h1>
        <p className="mt-6 text-[13px] uppercase tracking-[0.5em] md:mt-8 md:text-[15px]">{issue.city}</p>
        {/* 2026-11-01 この街のいま（号の月の話ではなく、見ている今の時刻・気温・天気。取れない時は出ない） */}
        <NowInCity place={issue.slug} coords={city?.coords} ja={ja} className="mt-6" name={nowName} chapters={issue.chapters} />
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {issue.line}
        </p>
        <ol className="mt-8 flex flex-col gap-2 md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-2">
          {issue.chapters.map((c, k) => (
            <li key={c.no} data-lat-chapter={k} className="text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
              <span style={{ color: INK }}>{c.no}</span>&nbsp;&nbsp;—&nbsp;&nbsp;{c.place}, {c.time}
              {/* 2026-11-01 いまの街の時刻がこの章に重なる時だけ、NowLine が出す（ふだんは隠す） */}
              <span data-lat-now className="ml-3 hidden items-center gap-1.5 normal-case tracking-[0.08em]" style={{ color: INK }}>
                <span aria-hidden="true" className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: 'var(--lat-now-chip, #1e1d1b)' }} />
                {ja ? `いまの${nowName}は、この章の時間` : `${nowName} is at this hour now`}
              </span>
            </li>
          ))}
        </ol>
        {/* 2026-11-01 ユーザー：旅人が誰で、ほかのどの号に出ているかを分かりやすく。小さな名前のリンクだけでは気づきにくい */}
        {person && (
          <Link href={`/${locale}/latitude/people/${person.slug}`} className="group mt-10 flex max-w-xl items-center gap-4 border-t pt-6" style={{ borderColor: 'rgba(30,29,27,0.15)', color: INK }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/latitude/people/${person.slug}.jpg`} alt={who} width={56} height={56} className="h-14 w-14 shrink-0 rounded-full object-cover" />
            <span className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{ja ? 'この日を旅した人' : 'The traveller'}</span>
              <span className="text-[18px] leading-snug" style={{ fontFamily: SERIF }}>
                {who}{ja ? `（${person.ja.home}・${person.age}歳）` : `, ${person.home}, ${person.age}`}
              </span>
              <span className="text-[11px] uppercase tracking-[0.25em] underline-offset-4 group-hover:underline">
                {ja ? `${who}のほかの1日を見る` : `See all of ${who}'s days`}&nbsp;&nbsp;→
              </span>
            </span>
          </Link>
        )}
      </header>

      {/* リール */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Film</SectionLabel>
          <Reel issue={issue} />
        </div>
      </section>

      {/* filmOnly の号は、カルーセルのページ・読み物・色を出さない（2026-10-24） */}
      {!issue.filmOnly && (
        <>
      {/* カルーセルのページ */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>The issue</SectionLabel>
          <Pages issue={issue} stepPages={stepOn ? await stepIntoPages(issue.slug) : []} stepOn={stepOn} sample={stepOn ? sample : null} />
        </div>
      </section>

      {/* 読み物 */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <SectionLabel>Field notes&nbsp;&nbsp;—&nbsp;&nbsp;{issue.latitude}</SectionLabel>
            <h2 className="text-[36px] leading-tight md:text-[48px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: 0, color: INK }}>
              {issue.notesTitle}
            </h2>
          </div>
          <div className="mt-8 flex max-w-2xl flex-col gap-5 md:mt-0">
            {issue.notes.map((t, k) => (
              <p key={k} className="text-[16px] leading-[1.8] md:text-[17px]">
                {k === 0 ? (
                  <>
                    {/* 2026-10-22 雑誌のドロップキャップ：最初の1文字を3行ぶん大きく沈める */}
                    <span
                      aria-hidden="true"
                      className="float-left mr-3 mt-[0.035em] text-[6em] leading-[0.72]"
                      style={{ fontFamily: SERIF, fontWeight: 400, color: issue.capColour ?? INK }}
                    >
                      {t[0]}
                    </span>
                    <span className="sr-only">{t[0]}</span>
                    {t.slice(1)}
                  </>
                ) : (
                  t
                )}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 号の色 */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>
            The colours of {issue.latitude}
          </SectionLabel>
          <Palette issue={issue} />
        </div>
      </section>
        </>
      )}

      {/* 2026-10-30 旅のメモ：検索から来た人への入口の情報。雑誌の邪魔をしないよう、奥付の前に小さく */}
      {issue.seo && (
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
            <SectionLabel>Notes for the trip&nbsp;&nbsp;—&nbsp;&nbsp;{issue.city} in {issue.seo.month}</SectionLabel>
            <dl className="flex max-w-2xl flex-col gap-4 text-[14px] leading-relaxed" style={{ color: MUTE }}>
              <div><dt className="text-[10px] uppercase tracking-[0.25em]" style={{ color: INK }}>Weather</dt><dd className="mt-1">{issue.seo.weather}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.25em]" style={{ color: INK }}>What she wore</dt><dd className="mt-1">{issue.seo.wore}</dd></div>
              <div><dt className="text-[10px] uppercase tracking-[0.25em]" style={{ color: INK }}>Earlier or later</dt><dd className="mt-1">{issue.seo.season}</dd></div>
              <p className="text-[12px]">The images in this issue were made with AI by VUAL. The places, the routes and the facts are real.</p>
            </dl>
          </div>
        </section>
      )}

      {/* 2026-11-01 同じ旅人のほかの号（表紙を並べる） */}
      {person && (() => {
        const others = issuesOf(person.slug).filter((o) => o.slug !== issue.slug);
        return (
          <section className="px-4 pb-16 md:px-8 md:pb-24">
            <div className="mx-auto max-w-6xl">
              <SectionLabel>{ja ? `${who}のほかの1日` : `${who}'s other days`}</SectionLabel>
              {others.length ? (
                <div className="flex snap-x gap-4 overflow-x-auto md:gap-8" style={{ scrollbarWidth: 'thin' }}>
                  {others.map((o) => (
                    <Link key={o.slug} href={`/${locale}/latitude/${o.slug}`} className="group block w-[44vw] shrink-0 snap-start md:w-[18vw] md:max-w-[220px]" style={{ color: INK }}>
                      <div className="overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={assetUrl(o, 'cover.jpg')} alt={`${person.name} in ${o.city}, ${o.month} — LATITUDE ${o.latitude}`} loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      </div>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{o.month}</p>
                      <p className="mt-1 text-[22px] leading-tight" style={{ fontFamily: SERIF }}>{o.latitude}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.35em]">{o.city}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px]" style={{ color: MUTE }}>{ja ? `${who}の旅は、この1日から。` : `This is ${who}'s first day.`}</p>
              )}
              <Link href={`/${locale}/latitude/people/${person.slug}`} className="mt-6 inline-block text-[11px] uppercase tracking-[0.3em] underline underline-offset-4" style={{ color: INK }}>
                {ja ? `${who}について` : `About ${who}`}&nbsp;&nbsp;→
              </Link>
            </div>
          </section>
        );
      })()}

      {/* 2026-11-01 旅人と話す（部屋・通話）と、街の案内 */}
      {room && person && (
        <section className="px-4 pb-16 md:px-8 md:pb-24">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-3">
            <Link href={`/${locale}/latitude/people/${person.slug}/room`} className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, background: INK, color: '#f2eee7' }}>
              {ja ? `${who}と話す・通話する` : `Talk to ${who}, or call her`}&nbsp;&nbsp;→
            </Link>
            {city && (
              <Link href={`/${locale}/latitude/places/${city.slug}`} className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, color: INK }}>
                {ja ? `${who}の${city.nameJa}のおすすめ` : `Where ${who} would go in ${city.name}`}&nbsp;&nbsp;→
              </Link>
            )}
          </div>
        </section>
      )}

      {/* 2026-10-30 次の号をメールで（Substack） */}
      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl">
          <NewsletterSignup locale={locale} />
        </div>
      </section>

      {/* 奥付 */}
      <MoreIssues locale={locale} current={issue.slug} />

      <footer className="border-t px-4 py-16 md:px-8 md:py-24" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.3em]">Latitude&nbsp;&nbsp;{issueNo(issue)}</p>
          <p className="mt-3 text-[28px]" style={{ fontFamily: SERIF }}>
            {issue.latitude}&nbsp;&nbsp;—&nbsp;&nbsp;{issue.city}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>
            {issue.chapters.map((c) => c.place).join('  ·  ')}
          </p>
          {/* 制作の案内（2026-10-28）：号を見たブランドが VUAL に頼めると分かるように、号のいちばん最後にだけ置く。
              読む人に向けた文なので言語で切り替える（クレジットの行は奥付の慣習どおり英語のまま） */}
          <p className="mt-10 max-w-xl text-[14px] leading-relaxed" style={{ color: MUTE }}>
            {locale === 'ja'
              ? 'LATITUDE は、ファッションのクリエイティブスタジオ VUAL が制作しています。VUAL では、ブランドの実物の服から、映像と誌面の制作も承っています。'
              : 'LATITUDE is made by VUAL, a fashion creative studio. VUAL also makes films and editorial for brands, from the real garments.'}{' '}
            <Link href={`/${locale}`} className="underline underline-offset-4" style={{ color: INK }}>
              vual.jp
            </Link>
            {'  ·  '}
            <a href="mailto:studio@vual.jp" className="underline underline-offset-4" style={{ color: INK }}>
              studio@vual.jp
            </a>
          </p>
          <p className="mt-6 text-[10px] tracking-[0.15em]" style={{ color: MUTE }}>
            Created with AI by VUAL.{issue.credits?.map((c) => ` ${c}.`).join('')}
          </p>

          <div className="mt-16 flex items-center justify-between text-[11px] uppercase tracking-[0.25em]">
            {prev ? (
              <Link href={`/${locale}/latitude/${prev.slug}`} style={{ color: INK }}>
                ← {issueNo(prev)}&nbsp;&nbsp;{prev.city}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/${locale}/latitude/${next.slug}`} style={{ color: INK }}>
                {issueNo(next)}&nbsp;&nbsp;{next.city} →
              </Link>
            ) : (
              <Link href={`/${locale}/latitude`} style={{ color: MUTE }}>
                All issues
              </Link>
            )}
          </div>

          <div className="mt-16">
            <PublishedBy locale={locale} />
          </div>
        </div>
      </footer>

      {room && person && (
        <AskTraveller locale={locale} slug={person.slug} name={who} callSeconds={room.callSeconds}
          context={`The visitor is reading your LATITUDE issue about ${issue.city} on the website.`} />
      )}
    </div>
  );
}
