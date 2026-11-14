import type { Metadata } from 'next';
import Link from 'next/link';
import { PEOPLE, assetUrl, issueNo, liveIssues } from '@/lib/latitude';
import { INK, IssueStrip, MINCHO, MUTE, NewsletterSignup, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import TravellerMap from '@/components/latitude/TravellerMap';
import { JsonLd, periodicalJsonLd } from '@/lib/latitude-publication';
import { mapTravellers } from '@/lib/latitude-map';
import { latAssetAbs } from '@/lib/latitude-assets';
import { CITIES } from '@/lib/latitude-places';

// 2026-11-11 よくある質問：LATITUDE が何かを、言い切りの短い文で（検索や AI のチャットが答えに使いやすいように）。llms.txt の FAQ と同じ中身
const FAQ = {
  en: [
    ['What is LATITUDE?', 'A serial fiction about clothes and places, published by VUAL. In each issue a fictional traveller spends one day in a real place, filmed as if documented, and the issue is titled by the latitude of that place.'],
    ['Are the people real?', 'No. The six travellers are fictional. The places, the routes and one true fact about each place are real.'],
    ['How are the images made?', 'With AI, by VUAL, a fashion creative studio in Japan and the UK. The editor, Sachio Kawasaki, decides what is kept, and writes those decisions down in the notes for each issue.'],
    ['Are the shops in the city guides real?', 'Yes. The city guides list only places whose opening the editors checked on official sources. The issues themselves never name a shop.'],
  ],
  ja: [
    ['LATITUDE とは何ですか？', 'VUAL が出している、服と場所の連作フィクションです。毎号、架空の旅人が実在の街で過ごす1日を、記録のように描きます。題はその場所の緯度です。'],
    ['人物は実在しますか？', 'いいえ。6人の旅人は架空です。場所・道すじ・その土地のひとつの事実は本物です。'],
    ['画像や映像はどう作っていますか？', 'ファッションのクリエイティブスタジオ VUAL（日本・イギリス）が AI で作っています。何を残すかは編集長の川崎 祥央が決め、その判断を号ごとの制作ノートに書いています。'],
    ['街の案内の店は本当にありますか？', 'はい。編集部が公式の情報で営業を確かめた店だけを載せています。作品の中には店の名前を出していません。'],
  ],
} as const;

// LATITUDE の一覧：公開中の号の表紙を、緯度の数字と一緒に並べる。公開予約の時刻を過ぎた号が出るよう、数分ごとに作り直す
export const revalidate = 300;

// LATITUDE の美学（ドキュメンタリーの手法で描く、架空の一日）。連絡文・紹介資料と同じ文
const STATEMENT_EN =
  'LATITUDE is a series of fictional days, filmed as if documented. The place — and one true thing about it — is real; the person and the day are imagined. We look for the beauty of clothes not in the posed moment, but in the time between.';
const STATEMENT_JA =
  'LATITUDE は、ひとつの緯度の、ある一日を記録するように描く連作です。場所と、その土地のひとつの事実は本物。人と一日は架空です。飾った瞬間ではなく、その間に流れる時間の中に、服の美しさを探しています。';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const description = locale === 'ja' ? STATEMENT_JA : STATEMENT_EN;
  return {
    title: 'LATITUDE — VUAL',
    description,
    // 2026-10-30 本体の場所はこのページ自身（親の layout の canonical "/" を上書きする。上書きしないとトップの写しと見なされる）
    alternates: {
      canonical: `/${locale}/latitude`,
      languages: { en: '/en/latitude', ja: '/ja/latitude', 'x-default': '/en/latitude' },
    },
    // リンクの見え方：Fårö の灯台のページ＋LATITUDE の題（public/latitude/og-index.jpg。scripts/latitude-og.py で作る）
    openGraph: { type: 'website', siteName: 'VUAL', title: 'LATITUDE — VUAL', description, url: `https://vual.jp/${locale}/latitude`,
      images: [{ url: latAssetAbs('og-index.jpg'), width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: 'LATITUDE — VUAL', description, images: [latAssetAbs('og-index.jpg')] },
  };
}

export default async function LatitudeIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={periodicalJsonLd()} />
      <IssueStrip locale={locale} />
      <header className="mx-auto max-w-6xl px-4 pb-14 pt-16 md:px-8 md:pb-24 md:pt-28">
        <h1 className="text-[56px] uppercase leading-none md:text-[104px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '0.12em', color: INK }}>
          Latitude
        </h1>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          A travelling issue by VUAL
        </p>
        {locale === 'ja' ? (
          <p className="mt-4 max-w-xl text-[15px] leading-[2.1] md:text-[17px]" style={{ fontFamily: MINCHO }}>
            {STATEMENT_JA}
          </p>
        ) : (
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
            {STATEMENT_EN}
          </p>
        )}
        {/* 2026-10-30 6人それぞれの旅。名前からその人のページへ */}
        <nav id="people" className="mt-10 scroll-mt-20">
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>People</p>
          {/* 2026-11-01 ユーザー：スマホで6人が1行に収まるように（字を少し小さく・字間を詰め、幅いっぱいに均等に並べる） */}
          <ul className="mt-3 flex flex-nowrap justify-between text-[10px] uppercase tracking-[0.16em] md:flex-wrap md:justify-start md:gap-x-7 md:gap-y-2 md:text-[12px] md:tracking-[0.3em]">
            {PEOPLE.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/latitude/people/${p.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{p.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* 2026-11-11 街の案内（旅人のおすすめの店）への入口。号のページの奥にしか無かった */}
        <nav className="mt-8">
          {/* 2026-11-11 場所から探すページ（地図）への入口 */}
          <p className="flex items-baseline gap-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
            Places
            <Link href={`/${locale}/latitude/places`} className="underline underline-offset-4" style={{ color: INK }}>{locale === 'ja' ? '地図で見る →' : 'On the map →'}</Link>
          </p>
          {/* 2026-11-12 ユーザー：街が増えると名前の壁になる。ここには号のある街だけを並べ、案内だけの街は数を1行で（一覧は場所のページで地方ごとに） */}
          {(() => {
            const live = liveIssues();
            // 号のページと同じ探し方（金沢のように issue の無い街は、旅人と街の名前で）
            const hasIssue = (c: (typeof CITIES)[number]) => live.some((i) => i.slug === c.issue || (c.person === i.person && c.name.toLowerCase() === i.city.toLowerCase()));
            const withIssue = CITIES.filter(hasIssue);
            const rest = CITIES.filter((c) => !hasIssue(c) && !c.issue && c.places.length);
            const jp = rest.filter((c) => (c.countryCode || 'JP') === 'JP').length;
            const abroad = rest.length - jp;
            const ja = locale === 'ja';
            return (
              <>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] md:gap-x-7 md:text-[12px] md:tracking-[0.3em]">
                  {withIssue.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/${locale}/latitude/places/${c.slug}`} className="underline-offset-4 hover:underline" style={{ color: INK }}>{ja ? c.nameJa : c.name}</Link>
                    </li>
                  ))}
                </ul>
                {rest.length > 0 && (
                  <Link href={`/${locale}/latitude/places`} className="mt-4 inline-block text-[12px] underline-offset-4 hover:underline md:text-[13px]" style={{ color: MUTE }}>
                    {ja
                      ? `ほか、${[jp && `日本の${jp}`, abroad && `海外の${abroad}`].filter(Boolean).join('と、')}の街の案内　→`
                      : `And city guides to ${[jp && `${jp} more town${jp > 1 ? 's' : ''} in Japan`, abroad && `${abroad} abroad`].filter(Boolean).join(' and ')}  →`}
                  </Link>
                )}
              </>
            );
          })()}
        </nav>
        {/* 2026-11-12 ユーザー：Places の下の Notes（一号ずつ、どう作ったか）は外す。画面の下に同じ入口がある */}
      </header>
      <main className="flex snap-x gap-4 overflow-x-auto px-4 pb-28 md:gap-8 md:px-8 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))]" style={{ scrollbarWidth: 'thin' }}>
        {liveIssues().map((i) => (
          <Link key={i.slug} href={`/${locale}/latitude/${i.slug}`} className="group block w-[62vw] shrink-0 snap-start md:w-[24vw] md:max-w-[300px]" style={{ color: INK }}>
            <div className="overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(i, 'cover.jpg')}
                alt={`LATITUDE ${issueNo(i)} — ${i.latitude} ${i.city}`}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
              {issueNo(i)}
            </p>
            <p className="mt-1 text-[26px] leading-tight" style={{ fontFamily: SERIF }}>
              {i.latitude}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.35em]">{i.city}</p>
          </Link>
        ))}
      </main>
      {/* 2026-10-30 6人が今どこにいるか（最後の1日の場所がまたたく）。押すとその人のページへ */}
      <section className="mx-auto max-w-6xl pb-24 md:px-8 md:pb-32">
        <div className="px-4 md:px-0">
          <SectionLabel>Where they are</SectionLabel>
        </div>
        <TravellerMap travellers={mapTravellers()} locale={locale} />
      </section>
      {/* 2026-11-11 よくある質問（小さく。雑誌の邪魔をしない） */}
      <section className="mx-auto max-w-6xl px-4 pb-20 md:px-8 md:pb-28">
        <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (locale === 'ja' ? FAQ.ja : FAQ.en).map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
        <SectionLabel>{locale === 'ja' ? 'よくある質問' : 'Questions'}</SectionLabel>
        <dl className="grid max-w-4xl gap-8 md:grid-cols-2 md:gap-x-16">
          {(locale === 'ja' ? FAQ.ja : FAQ.en).map(([q, a]) => (
            <div key={q}>
              <dt className="text-[17px] leading-snug" style={{ fontFamily: locale === 'ja' ? MINCHO : SERIF }}>{q}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed" style={{ color: MUTE }}>{a}</dd>
            </div>
          ))}
        </dl>
      </section>
      {/* 2026-10-30 次の号をメールで（Substack） */}
      <section className="mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <NewsletterSignup locale={locale} />
      </section>
      <footer className="pb-16">
        {/* 2026-11-08 編集長のページへの入り口は「この雑誌について」の1か所だけにする（ユーザー決定）。ここには置かない */}
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}
