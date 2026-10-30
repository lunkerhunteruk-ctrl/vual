import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PEOPLE, assetUrl, getPerson, issuesOf } from '@/lib/latitude';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';

// 2026-10-30 LATITUDE の人のページ。号の番号をやめ、名前のある6人がそれぞれ旅する形にした（設定書は vault.vual.jp/docs/LATITUDE-CHARACTERS.md）。
// 名前・住む街・旅をする理由・持ち物の印・その人の全部の1日。のちの部屋（3D）や会話の入口もここに置く

export function generateStaticParams() {
  return PEOPLE.map((p) => ({ person: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; person: string }> }): Promise<Metadata> {
  const { person } = await params;
  const p = getPerson(person);
  if (!p) return { title: 'LATITUDE — VUAL' };
  const title = `${p.name} — LATITUDE | VUAL`;
  const cities = issuesOf(p.slug).map((i) => `${i.city} in ${i.month}`).join(', ');
  const description = `${p.line}${cities ? ` Her days so far: ${cities}.` : ''}`;
  return {
    title,
    description,
    // 本文は英語なので、本体は英語のページ
    alternates: { canonical: `/en/latitude/people/${p.slug}`, languages: { en: `/en/latitude/people/${p.slug}`, 'x-default': `/en/latitude/people/${p.slug}` } },
    openGraph: { type: 'profile', siteName: 'VUAL', title, description, url: `https://vual.jp/en/latitude/people/${p.slug}` },
  };
}

export default async function LatitudePersonPage({ params }: { params: Promise<{ locale: string; person: string }> }) {
  const { locale, person } = await params;
  const p = getPerson(person);
  if (!p) notFound();
  const days = issuesOf(p.slug);

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} />

      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-20 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;People
        </p>
        <h1 className="mt-5 text-[64px] leading-[0.95] md:text-[120px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em', color: INK }}>
          {p.name}
        </h1>
        <p className="mt-6 text-[13px] uppercase tracking-[0.4em] md:mt-8 md:text-[15px]">
          {p.home}&nbsp;&nbsp;·&nbsp;&nbsp;{p.age}
        </p>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {p.line}
        </p>
      </header>

      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <SectionLabel>About her</SectionLabel>
          <div className="flex max-w-2xl flex-col gap-5">
            {p.about.map((t, k) => (
              <p key={k} className="text-[16px] leading-[1.8] md:text-[17px]">{t}</p>
            ))}
            <p className="text-[14px] leading-relaxed" style={{ color: MUTE }}>
              <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: INK }}>Always with her</span>
              <br />
              {p.mark}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <SectionLabel>Her days</SectionLabel>
        </div>
        {days.length ? (
          <div className="mx-auto flex max-w-6xl snap-x gap-4 overflow-x-auto px-4 md:gap-8 md:px-8" style={{ scrollbarWidth: 'thin' }}>
            {days.map((i) => (
              <Link key={i.slug} href={`/${locale}/latitude/${i.slug}`} className="group block w-[62vw] shrink-0 snap-start md:w-[24vw] md:max-w-[300px]" style={{ color: INK }}>
                <div className="overflow-hidden" style={{ aspectRatio: '9 / 16' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={assetUrl(i, 'cover.jpg')} alt={`${p.name} in ${i.city}, ${i.month} — LATITUDE ${i.latitude}`} loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
                <p className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{i.month}</p>
                <p className="mt-1 text-[26px] leading-tight" style={{ fontFamily: SERIF }}>{i.latitude}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.35em]">{i.city}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-6xl px-4 text-[14px] md:px-8" style={{ color: MUTE }}>Her first day is on its way.</p>
        )}
      </section>

      <section className="px-4 pb-16 md:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Also travelling</SectionLabel>
          <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.3em]">
            {PEOPLE.filter((o) => o.slug !== p.slug).map((o) => (
              <li key={o.slug}>
                <Link href={`/${locale}/latitude/people/${o.slug}`} style={{ color: INK }}>{o.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="pb-16">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}
