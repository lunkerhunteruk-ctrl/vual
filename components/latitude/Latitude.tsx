import Link from 'next/link';
import { ISSUES, assetUrl, issueNo, type LatitudeIssue } from '@/lib/latitude';

// LATITUDE の紙面の色と字。Instagram のカルーセルと同じ紙・墨・灰を使う
export const PAPER = '#f2eee7';
export const INK = '#1e1d1b';
export const MUTE = '#78746c';
export const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';

const STREAM_HOST = 'https://customer-iachfaxtqeo2l99t.cloudflarestream.com';

// 号の切り替え：上に残る細い帯。号を選ぶのはここ、読むのは縦スクロール
// 横に流れる列のスクロールバーを隠す（指やトラックパッドでは動かせる）
const NOSCROLL_CSS = '.latitude-noscroll{scrollbar-width:none}.latitude-noscroll::-webkit-scrollbar{display:none}';

export function IssueStrip({ locale, current }: { locale: string; current?: string }) {
  return (
    <nav
      className="sticky top-0 z-30 border-b backdrop-blur"
      style={{ background: 'rgba(242,238,231,0.92)', borderColor: 'rgba(30,29,27,0.12)' }}
    >
      <style>{NOSCROLL_CSS}</style>
      <div className="latitude-noscroll mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-3 md:px-8">
        <Link href={`/${locale}/latitude`} className="shrink-0 text-[11px] uppercase tracking-[0.35em]" style={{ color: INK }}>
          Latitude
        </Link>
        <span className="h-3 w-px shrink-0" style={{ background: 'rgba(30,29,27,0.2)' }} />
        {ISSUES.map((i) => {
          const on = i.slug === current;
          return (
            <Link
              key={i.slug}
              href={`/${locale}/latitude/${i.slug}`}
              aria-current={on ? 'page' : undefined}
              className="shrink-0 whitespace-nowrap text-[11px] uppercase tracking-[0.2em] transition-opacity hover:opacity-100"
              style={{ color: on ? INK : MUTE, opacity: on ? 1 : 0.8, borderBottom: on ? `1px solid ${INK}` : '1px solid transparent' }}
            >
              {issueNo(i)}&nbsp;&nbsp;{i.city}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// リール：最初は音なしで自動再生、操作バーで音を出せる
export function Reel({ issue }: { issue: LatitudeIssue }) {
  const title = `LATITUDE ${issueNo(issue)} — ${issue.latitude} ${issue.city}`;
  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
      {issue.streamId ? (
        <iframe
          src={`${STREAM_HOST}/${issue.streamId}/iframe?autoplay=true&muted=true&loop=true&preload=auto&poster=${encodeURIComponent(
            `${STREAM_HOST}/${issue.streamId}/thumbnails/thumbnail.jpg?time=1s&height=1280`,
          )}`}
          title={title}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <video
          src={assetUrl(issue, 'reel.mp4')}
          poster={assetUrl(issue, 'cover.jpg')}
          title={title}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

// カルーセルのページ：スマホは横にめくる、パソコンは2ページずつの見開き
export function Pages({ issue }: { issue: LatitudeIssue }) {
  const spreads: (typeof issue.pages)[] = [];
  for (let i = 0; i < issue.pages.length; i += 2) spreads.push(issue.pages.slice(i, i + 2));
  const page = (p: (typeof issue.pages)[number], n: number) =>
    p.video ? (
      <video
        src={assetUrl(issue, `pages/${p.video}`)}
        poster={assetUrl(issue, `pages/${p.file}`)}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`Page ${n}`}
        className="block h-full w-full object-cover"
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={assetUrl(issue, `pages/${p.file}`)} alt={`Page ${n}`} loading={n <= 2 ? 'eager' : 'lazy'} className="block h-full w-full object-cover" />
    );
  return (
    <>
      {/* スマホ：横にめくる */}
      <div className="md:hidden">
        <div className="latitude-noscroll -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {issue.pages.map((p, i) => (
            <figure key={p.file} className="relative w-[84vw] shrink-0 snap-center" style={{ aspectRatio: '3 / 4' }}>
              {page(p, i + 1)}
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: MUTE }}>
          {issue.pages.length} pages — swipe
        </p>
      </div>
      {/* パソコン：見開き */}
      <div className="hidden flex-col gap-10 md:flex">
        {spreads.map((s, k) => (
          <div key={k} className="mx-auto grid w-full max-w-5xl grid-cols-2 shadow-[0_30px_60px_-30px_rgba(30,29,27,0.35)]">
            {s.map((p, j) => (
              <div key={p.file} className="relative" style={{ aspectRatio: '3 / 4' }}>
                {page(p, k * 2 + j + 1)}
              </div>
            ))}
            {s.length === 1 && <div style={{ background: PAPER }} />}
          </div>
        ))}
      </div>
    </>
  );
}

export function Palette({ issue }: { issue: LatitudeIssue }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-6 md:grid-cols-6">
      {issue.colours.map((c) => (
        <div key={c.name}>
          <div className="w-full" style={{ background: c.hex, aspectRatio: '5 / 3', boxShadow: 'inset 0 0 0 1px rgba(30,29,27,0.08)' }} />
          <p className="mt-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: INK }}>
            {c.name}
          </p>
          <p className="mt-1 text-[10px] tracking-[0.15em]" style={{ color: MUTE }}>
            {c.hex.toUpperCase()}
          </p>
        </div>
      ))}
    </div>
  );
}

// 緯度の数字（例 55.7° N）。° は数字に寄せ、N との間は少しあける
export function LatitudeFigure({ value }: { value: string }) {
  const m = value.match(/^([\d.]+)°\s*(\w)$/);
  if (!m) return <>{value}</>;
  return (
    <>
      {m[1]}
      <span style={{ marginLeft: '-0.06em' }}>°</span>
      <span style={{ marginLeft: '0.18em' }}>{m[2]}</span>
    </>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-8 text-[10px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>
      {children}
    </p>
  );
}
