import type { Metadata } from 'next';
import Link from 'next/link';
import { PEOPLE } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, PAPER, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import { JsonLd, periodicalJsonLd } from '@/lib/latitude-publication';

// 2026-10-30 LATITUDE の奥付。VUAL が出している出版物（コンデナストと Vogue の関係）として、出版元・編集・作り方・連絡先を並べる。
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

const T = {
  en: {
    title: 'About LATITUDE — VUAL',
    description: 'LATITUDE is a travelling issue published by VUAL, a publisher and creative studio in Tokyo and London.',
    label: 'About',
    lead: 'LATITUDE is a travelling issue published by VUAL.',
    rows: [
      ['Publisher', 'VUAL (LUFIS Co., Ltd.)'],
      ['Founding Editor', 'Sachio Kawasaki'],
      ['Offices', 'Tokyo · London'],
      ['Languages', 'English · 日本語'],
      ['Contact', 'editor@vual.jp'],
    ],
    howTitle: 'How an issue is made',
    how: [
      'Each issue is one day at one latitude. The place is real, and so is one fact about it, checked before we begin. The traveller and the day are imagined.',
      'The pictures and films are made with AI by the VUAL studio, from the clothes, the place and the light of that season. Nothing in an issue is presented as a photograph of a real person.',
      'No brand pays to appear. When a brand lends its wardrobe with permission, it is credited once, at the end of that issue.',
      'Shops in our city guides are listed only after we have checked, on their own pages, that they are open in the year we write. No listing is paid for; if that ever changes, paid listings will be marked as such.',
    ],
    travellers: 'The travellers',
    studioTitle: 'The studio',
    studio: 'VUAL also makes films and stills for fashion brands. LATITUDE is where we make our own work.',
    studioLink: 'VUAL studio',
  },
  ja: {
    title: 'LATITUDE について — VUAL',
    description: 'LATITUDE は、東京とロンドンの出版・制作スタジオ VUAL が出している、旅の連作です。',
    label: '奥付',
    lead: 'LATITUDE は、VUAL が出している旅の連作です。',
    rows: [
      ['出版', 'VUAL（LUFIS Co., Ltd.）'],
      ['編集', '川崎 祥央（Founding Editor）'],
      ['拠点', '東京・ロンドン'],
      ['言語', '日本語・English'],
      ['連絡先', 'editor@vual.jp'],
    ],
    howTitle: '号の作り方',
    how: [
      'ひとつの号は、ひとつの緯度の、ある一日です。場所と、その土地のひとつの事実は本物で、作る前に確かめています。旅人と一日は架空です。',
      '写真と映像は、VUAL のスタジオが、その季節の服・場所・光から AI で作っています。実在の人の写真として見せることはしません。',
      '載せるためにお金を受け取ったブランドはありません。許可を得て服を借りた号では、その号の最後に一度だけ名前を記します。',
      '街の案内の店は、その年に営業していることを店の公式のページで確かめてから載せています。お金を受け取って載せている店はありません。もし将来そうする時は、そのことをはっきり示します。',
    ],
    travellers: '旅をする人',
    studioTitle: 'スタジオ',
    studio: 'VUAL は、ファッションブランドの映像と写真も作っています。LATITUDE は、私たち自身の作品をつくる場所です。',
    studioLink: 'VUAL のスタジオ',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = locale === 'ja' ? T.ja : T.en;
  return {
    title: t.title,
    description: t.description,
    alternates: {
      canonical: `/${locale}/latitude/about`,
      languages: { en: '/en/latitude/about', ja: '/ja/latitude/about', 'x-default': '/en/latitude/about' },
    },
    openGraph: { type: 'website', siteName: 'VUAL', title: t.title, description: t.description, url: `https://vual.jp/${locale}/latitude/about` },
  };
}

export default async function LatitudeAboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ja = locale === 'ja';
  const t = ja ? T.ja : T.en;
  const body = ja ? { fontFamily: MINCHO } : { fontFamily: SERIF };

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={periodicalJsonLd()} />
      <IssueStrip locale={locale} />
      <header className="mx-auto max-w-3xl px-4 pb-10 pt-16 md:px-8 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude`} style={{ color: MUTE }}>Latitude</Link>&nbsp;&nbsp;·&nbsp;&nbsp;{t.label}
        </p>
        <h1 className="mt-5 text-[56px] uppercase leading-none md:text-[96px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '0.12em', color: INK }}>
          Latitude
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed md:text-[20px]" style={body}>{t.lead}</p>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 md:px-8">
        <dl className="border-t" style={{ borderColor: 'rgba(30,29,27,0.15)' }}>
          {t.rows.map(([k, v]) => (
            <div key={k} className="flex gap-6 border-b py-4" style={{ borderColor: 'rgba(30,29,27,0.15)' }}>
              <dt className="w-36 shrink-0 pt-[3px] text-[10px] uppercase tracking-[0.3em] md:w-48" style={{ color: MUTE }}>{k}</dt>
              <dd className="text-[15px]" style={body}>
                {v.includes('@') ? <a href={`mailto:${v}`} style={{ color: INK }}>{v}</a> : v}
              </dd>
            </div>
          ))}
        </dl>

        <section className="mt-16">
          <SectionLabel>{t.howTitle}</SectionLabel>
          <div className="space-y-5">
            {t.how.map((s) => (
              <p key={s} className={ja ? 'text-[15px] leading-[2.1]' : 'text-[17px] leading-relaxed'} style={body}>{s}</p>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <SectionLabel>{t.travellers}</SectionLabel>
          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-[12px] uppercase tracking-[0.3em]">
            {PEOPLE.map((p) => (
              <li key={p.slug}>
                <Link href={`/${locale}/latitude/people/${p.slug}`} style={{ color: INK }}>{ja ? p.ja.name : p.name}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <SectionLabel>{t.studioTitle}</SectionLabel>
          <p className={ja ? 'text-[15px] leading-[2.1]' : 'text-[17px] leading-relaxed'} style={body}>{t.studio}</p>
          <Link href={`/${locale}`} className="mt-5 inline-block border-b pb-1 text-[10px] uppercase tracking-[0.3em]" style={{ color: INK, borderColor: INK }}>
            {t.studioLink}&nbsp;&nbsp;→
          </Link>
        </section>
      </main>
    </div>
  );
}
