import type { Metadata } from 'next';
import Link from 'next/link';
import { liveIssues } from '@/lib/latitude';
import { getNote } from '@/lib/latitude-notes';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF, SectionLabel } from '@/components/latitude/Latitude';
import { EDITOR_ID, JsonLd, PERIODICAL, PUBLISHER, SITE } from '@/lib/latitude-publication';

// 2026-11-08 編集長の紹介ページ。制作ノートの書き手が誰で、どんな経験から判断しているかを、検索と AI に分かる形で置く。
// 書くのは、本人が制作ノートに書いた事実と、確かめた事だけ（経歴を足す時は本人に確かめる）。
// 経歴（CSM・Balenciaga・自分のブランド）は vual.jp トップの FOUNDER 欄と同じ文（2026-11-08 ユーザー確認）。トップは画面を JS で組むので、文字で読めるのはこのページ。

const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
const INSTAGRAM = 'https://www.instagram.com/sachio_kawasaki/';
const NOTE = 'https://note.com/sachiokawasaki';
const SUBSTACK = 'https://sachiokawasaki.substack.com';

const T = {
  en: {
    title: 'Sachio Kawasaki, Founding Editor of LATITUDE — VUAL',
    description: 'Sachio Kawasaki (MA Fashion, Central Saint Martins; trained at Balenciaga) is the founder and creative director of VUAL and the founding editor of LATITUDE, its travelling issue. The pictures are made with AI; what is filmed, what stays and what goes is the editor’s decision.',
    label: 'The editor',
    name: 'Sachio Kawasaki',
    role: 'Founding Editor, LATITUDE  ·  Founder & Creative Director, VUAL',
    rows: [['Education', 'MA Fashion, Central Saint Martins'], ['Career', 'Trained at Balenciaga. Founded and ran his own label'], ['Now', 'Founder & Creative Director, VUAL. Founding Editor, LATITUDE'], ['Publisher', 'VUAL (LUFIS Co., Ltd.)'], ['Based in', 'United Kingdom']],
    bio: [
      'Sachio Kawasaki is the founding editor of LATITUDE, a travelling issue published by VUAL. Each issue is one day in one real place: the traveller is imagined, the place and one fact about it are real.',
      'The pictures and films are made with AI. The editor decides what is filmed and what stays: the route of the day, the light at each hour, which of hundreds of stills are used, what is cut, and when an issue is finished by hand.',
      'Kawasaki completed the MA Fashion at Central Saint Martins, trained at Balenciaga, and went on to found and run his own label. VUAL brings that eye, formed on the floor of high fashion, together with new technology.',
      'He spent about seven years in London as a fashion student, and some of the issues carry a memory from those years.',
    ],
    rulesTitle: 'Rules kept across every issue',
    rules: [
      'The title is the latitude and the city. Chapters move by the clock.',
      'One day, one outfit. The clothes change only when the day gives a reason.',
      'Each issue carries one real thing: a fact checked before we begin, or the editor’s own memory.',
      'A picture that is true to the facts is not always one you can watch. Deciding is the job.',
    ],
    memTitle: 'Memories in the issues',
    mems: [
      ['51.5° N London', 'Seven years a fashion student in London. Music for 18 Musicians at the Barbican.'],
      ['55.7° N Copenhagen', 'At art school in London there was a girl from Copenhagen who studied graphic design.'],
      ['45.5° N Milan', 'As a student, the roof of the Duomo one cold winter: the whole city was there.'],
      ['55.9° N Edinburgh', 'A city known mostly from the train, on the way north to Perth to fish for salmon.'],
    ],
    notesTitle: 'Working notes',
    notesLead: 'For every issue, a record of what was chosen, what was dropped, and why.',
    contactTitle: 'Contact',
  },
  ja: {
    title: '川崎 祥央（LATITUDE 編集長）— VUAL',
    description: '川崎 祥央（Central Saint Martins MA Fashion 修了・Balenciaga で研鑽）。VUAL の創業者・クリエイティブディレクターで、旅の連作 LATITUDE の編集長。絵と映像は AI で作り、何を撮り、何を残し、何を捨てるかを決めています。',
    label: '編集長',
    name: '川崎 祥央',
    role: 'LATITUDE 編集長  ·  VUAL 創業者・クリエイティブディレクター',
    rows: [['学歴', 'Central Saint Martins MA Fashion 修了'], ['経歴', 'Balenciaga で研鑽を積んだのち、自身のブランドを設立・運営'], ['現在', 'VUAL 創業者・クリエイティブディレクター／LATITUDE 編集長'], ['発行', 'VUAL（LUFIS Co., Ltd.）'], ['拠点', 'イギリス']],
    bio: [
      '川崎 祥央は、VUAL が出している旅の連作 LATITUDE の編集長です。1号につき、実在の街の1日。旅人は架空、場所とその土地の事実は本物です。',
      '絵と映像は AI で作ります。何を撮り、何を残すかは編集長が決めます。一日の道すじ、時刻ごとの光、数百枚の静止画のどれを使うか、何を外すか、最後に自分の手で仕上げるかどうか。',
      'Central Saint Martins の MA Fashion を修了。Balenciaga で研鑽を積んだのち、自身のブランドを設立・運営しました。ハイファッションの現場で培った視点と、新しい技術を合わせて、VUAL を作っています。',
      'ファッションの学生として、ロンドンで約7年を過ごしました。号のいくつかには、そのころの記憶が入っています。',
    ],
    rulesTitle: 'どの号でも変えないこと',
    rules: [
      '題は緯度と街の名前。章は時刻で進む。',
      '1日に1コーデ。服が変わるのは、その日に理由がある時だけ。',
      '毎号ひとつ、本物を入れる。始める前に確かめた事実か、編集長自身の記憶。',
      '事実どおりの絵と、見ていられる絵は、同じとは限らない。決めるのが仕事。',
    ],
    memTitle: '号に入れた記憶',
    mems: [
      ['51.5° N ロンドン', 'ファッションの学生として、ロンドンで7年。バービカンで聴いた『18人の音楽家のための音楽』。'],
      ['55.7° N コペンハーゲン', 'ロンドンの美術学校に、コペンハーゲンから来てグラフィックデザインを学んでいた女の子がいた。'],
      ['45.5° N ミラノ', '学生のころ、寒い冬にドゥオーモのてっぺんへ。屋上からは、街のすべてが見えた。'],
      ['55.9° N エジンバラ', '鮭を釣りにパースへ向かう列車の窓から眺める街。'],
    ],
    notesTitle: '制作ノート',
    notesLead: '号ごとに、何を選び、何を捨て、なぜそうしたかの記録です。',
    contactTitle: '連絡先',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ja = locale === 'ja';
  const t = ja ? T.ja : T.en;
  const path = '/latitude/editor';
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: `/${ja ? 'ja' : 'en'}${path}`, languages: { en: `/en${path}`, ja: `/ja${path}`, 'x-default': `/en${path}` } },
    openGraph: { type: 'profile', siteName: 'VUAL', title: t.title, description: t.description, url: `${SITE}/${ja ? 'ja' : 'en'}${path}` },
  };
}

export default async function LatitudeEditorPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const ja = locale === 'ja';
  const t = ja ? T.ja : T.en;
  const issues = liveIssues().filter((i) => getNote(i.slug)).sort((a, z) => a.no - z.no);
  const url = `${SITE}/${ja ? 'ja' : 'en'}/latitude/editor`;
  const person = {
    '@type': 'Person',
    '@id': EDITOR_ID,
    name: 'Sachio Kawasaki',
    alternateName: '川崎 祥央',
    jobTitle: ['Founding Editor, LATITUDE', 'Founder & Creative Director, VUAL'],
    description: 'MA Fashion, Central Saint Martins. Trained at Balenciaga, then founded and ran his own label. Founder and creative director of VUAL; founding editor of LATITUDE.',
    image: `${SITE}/lp/founder-bw.jpeg`,
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'Central Saint Martins', parentOrganization: { '@type': 'CollegeOrUniversity', name: 'University of the Arts London' }, sameAs: 'https://en.wikipedia.org/wiki/Central_Saint_Martins' },
    hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: 'degree', name: 'MA Fashion', recognizedBy: { '@type': 'CollegeOrUniversity', name: 'Central Saint Martins' } },
    worksFor: { '@id': PUBLISHER['@id'] },
    email: 'editor@vual.jp',
    url: `${SITE}/en/latitude/editor`,
    sameAs: [INSTAGRAM, NOTE, SUBSTACK],
    knowsAbout: ['fashion', 'fashion film', 'documentary', 'AI image and film production', 'editorial direction'],
  };
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      PUBLISHER,
      { ...PERIODICAL, editor: { '@id': person['@id'] } },
      person,
      { '@type': 'ProfilePage', '@id': `${url}#page`, url, inLanguage: ja ? 'ja' : 'en', mainEntity: { '@id': person['@id'] } },
    ],
  };
  const body = ja ? { fontFamily: MINCHO } : undefined;

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <JsonLd data={ld} />
      <IssueStrip locale={locale} />

      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-16 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{t.label}</p>
        <h1 className="mt-5 text-[52px] leading-[1.05] md:text-[96px]" style={{ fontFamily: ja ? MINCHO : SERIF, fontWeight: ja ? 600 : 400, letterSpacing: 0, color: INK }}>
          {t.name}
        </h1>
        {ja && <p className="mt-3 text-[13px] tracking-[0.3em]" style={{ color: MUTE }}>Sachio Kawasaki</p>}
        <p className="mt-6 text-[13px] uppercase tracking-[0.35em]">{t.role}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lp/founder-bw.jpeg" alt={t.name} width={160} height={160} className="mt-10 h-28 w-28 rounded-full object-cover md:h-36 md:w-36" style={{ filter: 'grayscale(1)' }} />
      </header>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <dl className="mb-10 flex flex-col gap-4 text-[13px] md:mb-0">
            {t.rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{k}</dt>
                <dd className="mt-1">{v}</dd>
              </div>
            ))}
          </dl>
          <div className={`flex max-w-2xl flex-col gap-5 ${ja ? 'text-[16px] leading-[2]' : 'text-[17px] leading-[1.8]'}`} style={body}>
            {t.bio.map((p, k) => <p key={k}>{p}</p>)}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <SectionLabel>{t.rulesTitle}</SectionLabel>
          <ol className="flex max-w-2xl list-decimal flex-col gap-3 pl-6 text-[16px] leading-[1.8]" style={body}>
            {t.rules.map((r, k) => <li key={k}>{r}</li>)}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <SectionLabel>{t.memTitle}</SectionLabel>
          <dl className="flex max-w-2xl flex-col gap-5">
            {t.mems.map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{k}</dt>
                <dd className="mt-1 text-[17px] leading-relaxed" style={{ fontFamily: ja ? MINCHO : SERIF }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-24">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <div>
            <SectionLabel>{t.notesTitle}</SectionLabel>
            <p className="mb-8 max-w-xs text-[14px] leading-relaxed" style={{ color: MUTE }}>{t.notesLead}</p>
          </div>
          <ul className="flex max-w-2xl flex-col gap-3 text-[15px]">
            {issues.map((o) => {
              const n = getNote(o.slug)!;
              return (
                <li key={o.slug}>
                  <Link href={`/${locale}/latitude/${o.slug}/notes`} className="underline-offset-4 hover:underline" style={{ color: INK }}>
                    <span className="mr-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>{o.latitude} {o.city}</span>
                    {(ja ? n.ja : n.en).title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="px-4 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_2fr] md:gap-16">
          <SectionLabel>{t.contactTitle}</SectionLabel>
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>editor@vual.jp</li>
            <li><a href={INSTAGRAM} target="_blank" rel="noopener me" className="underline-offset-4 hover:underline">Instagram @sachio_kawasaki</a></li>
            <li><a href={ja ? NOTE : SUBSTACK} target="_blank" rel="noopener me" className="underline-offset-4 hover:underline">{ja ? 'note（制作ノートのマガジン）' : 'Substack (the working notes by email)'}</a></li>
            <li><Link href={`/${locale}/latitude/about`} className="underline-offset-4 hover:underline">{ja ? 'LATITUDE について' : 'About LATITUDE'}</Link></li>
            <li><Link href={`/${locale}`} className="underline-offset-4 hover:underline">{ja ? 'VUAL（スタジオ）' : 'VUAL, the studio'}</Link></li>
          </ul>
        </div>
      </section>

      <footer className="border-t px-4 py-16 md:px-8" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
        <div className="mx-auto max-w-6xl">
          <PublishedBy locale={locale} />
        </div>
      </footer>
    </div>
  );
}
