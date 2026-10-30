import { personOf, type LatitudeIssue } from '@/lib/latitude';

// 2026-10-30 LATITUDE は VUAL が出している出版物（コンデナストと Vogue の関係）。
// Google や AI のチャットが「LATITUDE を出しているのは VUAL」と読めるよう、構造化データで出版元と号のつながりを書く。
export const SITE = 'https://vual.jp';

export const PUBLISHER = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'VUAL',
  legalName: 'LUFIS Co., Ltd.',
  url: SITE,
  description: 'A publisher and creative studio based in Japan and the United Kingdom. Publisher of LATITUDE.',
  email: 'editor@vual.jp',
};

export const PERIODICAL = {
  '@type': ['Periodical', 'CreativeWorkSeries'],
  '@id': `${SITE}/en/latitude#periodical`,
  name: 'LATITUDE',
  alternateName: 'LATITUDE — The travelling issue',
  url: `${SITE}/en/latitude`,
  description: 'A travelling issue by VUAL. Six named travellers each spend one day in a real place, at one latitude. The people are fictional; the places and one fact about each place are real.',
  inLanguage: ['en', 'ja'],
  publisher: { '@id': PUBLISHER['@id'] },
  editor: { '@type': 'Person', name: 'Sachio Kawasaki', jobTitle: 'Founding Editor' },
};

export const periodicalJsonLd = () => ({ '@context': 'https://schema.org', '@graph': [PUBLISHER, PERIODICAL] });

export const issueJsonLd = (i: LatitudeIssue) => {
  const p = personOf(i);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      PUBLISHER,
      PERIODICAL,
      {
        '@type': 'PublicationIssue',
        '@id': `${SITE}/en/latitude/${i.slug}#issue`,
        name: `${i.latitude} ${i.city}${p ? ` — ${p.name}` : ''}`,
        url: `${SITE}/en/latitude/${i.slug}`,
        datePublished: i.published,
        description: i.line,
        isPartOf: { '@id': PERIODICAL['@id'] },
        publisher: { '@id': PUBLISHER['@id'] },
        contentLocation: { '@type': 'Place', name: i.city },
        image: `${SITE}/latitude/${i.slug}/cover.jpg`,
      },
    ],
  };
};

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
