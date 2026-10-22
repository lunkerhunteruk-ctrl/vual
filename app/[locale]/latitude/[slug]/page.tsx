import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ISSUES, assetUrl, getIssue, isLive, issueNo, liveIssues } from '@/lib/latitude';
import { stepIntoAllowed, stepIntoPages } from '@/lib/latitude-recipe';
import { existsSync } from 'fs';
import path from 'path';
import { INK, IssueStrip, LatitudeFigure, MUTE, PAPER, Pages, Palette, Reel, SERIF, SectionLabel } from '@/components/latitude/Latitude';

// LATITUDE の1号を1ページで読む。上から：題字 → リール → カルーセルのページ → 読み物 → 色 → 奥付 → 前後の号

export function generateStaticParams() {
  return ISSUES.map((i) => ({ slug: i.slug }));
}

// 公開予約の号は、時刻まで ?preview=<LATITUDE_PREVIEW_KEY> を付けた時だけ見られる
type SP = Promise<{ preview?: string; step?: string }>;
const canPreview = (key?: string) => !!key && !!process.env.LATITUDE_PREVIEW_KEY && key === process.env.LATITUDE_PREVIEW_KEY;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const i = getIssue(slug);
  if (!i) return { title: 'LATITUDE — VUAL' };
  if (!isLive(i)) return { title: 'LATITUDE — VUAL', robots: { index: false, follow: false } };
  const title = `LATITUDE ${issueNo(i)} — ${i.latitude} ${i.city} | VUAL`;
  return {
    title,
    description: i.line,
    openGraph: {
      type: 'article',
      siteName: 'VUAL',
      title,
      description: i.line,
      url: `https://vual.jp/${locale}/latitude/${i.slug}`,
      images: [{ url: assetUrl(i, 'pages/01.jpg'), width: 1080, height: 1440 }],
    },
  };
}

export default async function LatitudeIssuePage({ params, searchParams }: { params: Promise<{ locale: string; slug: string }>; searchParams: SP }) {
  const { locale, slug } = await params;
  const { preview, step } = await searchParams;
  const issue = getIssue(slug);
  if (!issue) notFound();
  const previewing = !isLive(issue);
  if (previewing && !canPreview(preview)) notFound();
  // 2026-10-22 体験「Step into this look」は、今は ?step=<合言葉> の時だけ（公開前の確認用）
  const stepOn = stepIntoAllowed(step);
  const sampleDir = path.join(process.cwd(), 'public', 'latitude', issue.slug, 'stepinto');
  const sample = existsSync(path.join(sampleDir, 'sample-result.jpg')) ? { face: assetUrl(issue, 'stepinto/sample-face.jpg'), result: assetUrl(issue, 'stepinto/sample-result.jpg') } : null;
  const list = (previewing ? [...ISSUES] : liveIssues()).sort((a, b) => a.no - b.no); // 前の号・次の号は号数の順
  const idx = list.indexOf(issue);
  const prev = list[idx - 1];
  const next = list[idx + 1];

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} current={issue.slug} />

      {/* 題字 */}
      <header className="mx-auto max-w-6xl px-4 pb-12 pt-16 md:px-8 md:pb-20 md:pt-28">
        <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
          Latitude&nbsp;&nbsp;·&nbsp;&nbsp;{issueNo(issue)}
        </p>
        <h1 className="mt-5 text-[64px] leading-[0.95] md:text-[120px]" style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.01em', color: INK }}>
          <LatitudeFigure value={issue.latitude} />
        </h1>
        <p className="mt-6 text-[13px] uppercase tracking-[0.5em] md:mt-8 md:text-[15px]">{issue.city}</p>
        <p className="mt-8 max-w-xl text-[17px] leading-relaxed md:text-[20px]" style={{ fontFamily: SERIF }}>
          {issue.line}
        </p>
        <ol className="mt-8 flex flex-col gap-2 md:flex-row md:gap-10">
          {issue.chapters.map((c) => (
            <li key={c.no} className="text-[11px] uppercase tracking-[0.25em]" style={{ color: MUTE }}>
              <span style={{ color: INK }}>{c.no}</span>&nbsp;&nbsp;—&nbsp;&nbsp;{c.place}, {c.time}
            </li>
          ))}
        </ol>
      </header>

      {/* リール */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>Film</SectionLabel>
          <Reel issue={issue} />
        </div>
      </section>

      {/* カルーセルのページ */}
      <section className="px-4 pb-20 md:px-8 md:pb-32">
        <div className="mx-auto max-w-6xl">
          <SectionLabel>The issue</SectionLabel>
          <Pages issue={issue} stepPages={stepOn ? await stepIntoPages(issue.slug) : []} stepKey={stepOn ? step : undefined} sample={stepOn ? sample : null} />
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

      {/* 奥付 */}
      <footer className="border-t px-4 py-16 md:px-8 md:py-24" style={{ borderColor: 'rgba(30,29,27,0.12)' }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[11px] uppercase tracking-[0.3em]">Latitude&nbsp;&nbsp;{issueNo(issue)}</p>
          <p className="mt-3 text-[28px]" style={{ fontFamily: SERIF }}>
            {issue.latitude}&nbsp;&nbsp;—&nbsp;&nbsp;{issue.city}
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTE }}>
            {issue.chapters.map((c) => c.place).join('  ·  ')}
          </p>
          <p className="mt-10 max-w-xl text-[14px] leading-relaxed" style={{ color: MUTE }}>
            This issue was shot and edited by VUAL. We make issues for brands, too.{' '}
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
        </div>
      </footer>
    </div>
  );
}
