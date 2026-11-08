import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { assetUrl, getIssue, isLive, issueNo, liveIssues, personOf } from '@/lib/latitude';
import { getNote, noteLead, noteText, type NoteBlock, type NoteRun } from '@/lib/latitude-notes';
import { JsonLd, PERIODICAL, PUBLISHER, SITE } from '@/lib/latitude-publication';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';

// 2026-11-08 号ごとの制作ノート（監督の記録）。日本語（/ja）と英語（/en）は別の文章なので、それぞれを本体（canonical）にする。
// 中身は lib/latitude-notes.ts（data/latitude-notes/<slug>.json）。note と Substack にも同じ文があるが、vual.jp を元の置き場にする。

const NOTE_JA_URL = 'https://note.com/sachiokawasaki/m/mf5725176786b';
const SUBSTACK_URL = 'https://sachiokawasaki.substack.com';
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Shippori Mincho", serif';

export function generateStaticParams() {
  return liveIssues().filter((i) => getNote(i.slug)).map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const i = getIssue(slug);
  const n = getNote(slug);
  if (!i || !n || !isLive(i)) return { title: 'LATITUDE — VUAL', robots: { index: false, follow: false } };
  const ja = locale === 'ja';
  const b = ja ? n.ja : n.en;
  const title = ja ? `${b.title}｜制作ノート | VUAL` : `${b.title} — how LATITUDE ${i.latitude} ${i.city} was made | VUAL`;
  const description = ja ? noteLead(b, 120) : b.subtitle || noteLead(b);
  const path = `/latitude/${i.slug}/notes`;
  return {
    title,
    description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'article', siteName: 'VUAL', title: b.title, description, url: `${SITE}/${ja ? 'ja' : 'en'}${path}`, images: [{ url: assetUrl(i, 'og.jpg'), width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: b.title, description, images: [assetUrl(i, 'og.jpg')] },
  };
}

function Runs({ c }: { c: NoteRun[] }) {
  return (
    <>
      {c.map((r, k) => (r.b ? <strong key={k} style={{ fontWeight: 600 }}>{r.s}</strong> : <span key={k}>{r.s}</span>))}
    </>
  );
}

function Block({ b, ja }: { b: NoteBlock; ja: boolean }) {
  const head = ja ? MINCHO : SERIF;
  switch (b.t) {
    case 'h':
      return (
        <h2 className={ja ? 'mt-10 text-[22px] leading-snug md:text-[26px]' : 'mt-10 text-[12px] uppercase tracking-[0.3em]'} style={{ fontFamily: ja ? head : undefined, fontWeight: ja ? 600 : 500, color: INK }}>
          {b.s}
        </h2>
      );
    case 'p':
      return <p><Runs c={b.c} /></p>;
    case 'ul':
    case 'ol': {
      const L = b.t === 'ol' ? 'ol' : 'ul';
      return (
        <L className={`${b.t === 'ol' ? 'list-decimal' : 'list-disc'} flex flex-col gap-2 pl-6`}>
          {b.items.map((it, k) => <li key={k}><Runs c={it} /></li>)}
        </L>
      );
    }
    case 'img':
      return (
        <figure className="my-4 flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.src} alt={b.cap || (ja ? 'この号の画像' : 'From this issue')} loading="lazy" className="h-auto w-full" style={{ background: 'rgba(30,29,27,0.06)' }} />
          {b.cap && <figcaption className="text-[13px] leading-relaxed" style={{ color: MUTE }}>{b.cap}</figcaption>}
        </figure>
      );
    case 'sign':
      return <p className="mt-6 text-[12px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>{b.s}</p>;
  }
}

export default async function LatitudeNotesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const issue = getIssue(slug);
  const note = getNote(slug);
  if (!issue || !note || !isLive(issue)) notFound();
  const ja = locale === 'ja';
  const b = ja ? note.ja : note.en;
  const person = personOf(issue);
  const others = liveIssues().filter((o) => o.slug !== issue.slug && getNote(o.slug)).sort((a, z) => a.no - z.no);
  const url = `${SITE}/${ja ? 'ja' : 'en'}/latitude/${issue.slug}/notes`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      PUBLISHER,
      PERIODICAL,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: b.title,
        description: ja ? noteLead(b, 120) : b.subtitle || noteLead(b),
        inLanguage: ja ? 'ja' : 'en',
        url,
        mainEntityOfPage: url,
        datePublished: issue.published,
        author: { '@type': 'Person', '@id': `${SITE}/en/latitude/editor#person`, name: 'Sachio Kawasaki', alternateName: '川崎 祥央', jobTitle: 'Founding Editor, LATITUDE', url: `${SITE}/en/latitude/editor`, worksFor: { '@id': PUBLISHER['@id'] } },
        publisher: { '@id': PUBLISHER['@id'] },
        isPartOf: { '@id': PERIODICAL['@id'] },
        about: { '@type': 'PublicationIssue', '@id': `${SITE}/en/latitude/${issue.slug}#issue`, name: `${issue.latitude} ${issue.city}${person ? ` — ${person.name}` : ''}` },
        contentLocation: { '@type': 'Place', name: issue.city },
        image: assetUrl(issue, 'og.jpg'),
        wordCount: ja ? undefined : noteText(b).split(/\s+/).length,
        keywords: ['LATITUDE', 'AI film', 'fashion', 'documentary', 'directing', issue.city],
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={ld} />
      <IssueStrip locale={locale} />

      <article className="mx-auto max-w-2xl px-4 pb-20 pt-14 md:px-0 md:pb-28 md:pt-24">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{issueNo(issue)}&nbsp;&nbsp;·&nbsp;&nbsp;{issue.latitude} {issue.city}&nbsp;&nbsp;·&nbsp;&nbsp;{ja ? '制作ノート' : 'How it was made'}
        </p>
        <h1 className="mt-5 text-[34px] leading-[1.25] md:text-[46px]" style={{ fontFamily: ja ? MINCHO : SERIF, fontWeight: ja ? 600 : 400, letterSpacing: 0, color: INK, textWrap: 'balance' }}>
          {b.title}
        </h1>
        {!ja && b.subtitle && <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTE }}>{b.subtitle}</p>}
        <p className="mt-6 text-[12px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
          <Link href={`/${locale}/latitude/editor`} rel="author" className="underline-offset-4 hover:underline" style={{ color: MUTE }}>
            {ja ? '川崎 祥央　LATITUDE 編集長' : 'Sachio Kawasaki, Founding Editor'}
          </Link>
        </p>

        <div
          className={`mt-10 flex flex-col gap-5 ${ja ? 'text-[16px] leading-[2]' : 'text-[17px] leading-[1.8]'}`}
          style={{ fontFamily: ja ? MINCHO : undefined }}
        >
          {b.blocks.map((x, k) => <Block key={k} b={x} ja={ja} />)}
        </div>

        <div className="mt-14 flex flex-wrap gap-3 border-t pt-8" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
          <Link href={`/${locale}/latitude/${issue.slug}`} className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, background: INK, color: '#f2eee7' }}>
            {ja ? `この号を見る（${issue.latitude} ${issue.city}）` : `See the issue — ${issue.latitude} ${issue.city}`}&nbsp;&nbsp;→
          </Link>
          <a href={ja ? NOTE_JA_URL : SUBSTACK_URL} target="_blank" rel="noopener" className="border px-6 py-3 text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: INK, color: INK }}>
            {ja ? 'note でマガジンを読む' : 'Follow the notes on Substack'}&nbsp;&nbsp;↗
          </a>
        </div>
      </article>

      {others.length > 0 && (
        <section className="px-4 pb-20 md:px-8 md:pb-28">
          <div className="mx-auto max-w-2xl">
            <SectionLabel>{ja ? 'ほかの号の制作ノート' : 'Notes on the other issues'}</SectionLabel>
            <ul className="flex flex-col gap-3 text-[15px]">
              {others.map((o) => {
                const on = getNote(o.slug)!;
                return (
                  <li key={o.slug}>
                    <Link href={`/${locale}/latitude/${o.slug}/notes`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                      <span className="mr-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{o.latitude} {o.city}</span>
                      {(ja ? on.ja : on.en).title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      <footer className="border-t px-4 py-16 md:px-8" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
        <div className="mx-auto max-w-6xl">
          <PublishedBy locale={locale} />
        </div>
      </footer>
    </div>
  );
}
