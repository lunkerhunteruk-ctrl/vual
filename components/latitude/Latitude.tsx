import Link from 'next/link';
import { assetUrl, issueNo, liveIssues, type LatitudeIssue } from '@/lib/latitude';
import { PagesViewer } from './PagesViewer';
import type { StepIntoPage } from '@/lib/latitude-recipe';

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
        {liveIssues().map((i) => {
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

// リール：最初は音なしで自動再生、操作バーで音を出せる。
// Stream の埋め込み（iframe）は、トップから押して来ると再生と同時にフォーカスを取り、ページを勝手に下へ動かすので、
// Stream が出す MP4 を普通の video で流す（Stream 側で downloads を有効にしてある）
export function Reel({ issue }: { issue: LatitudeIssue }) {
  const title = `LATITUDE ${issueNo(issue)} — ${issue.latitude} ${issue.city}`;
  const src = issue.streamId ? `${STREAM_HOST}/${issue.streamId}/downloads/default.mp4` : assetUrl(issue, 'reel.mp4');
  const poster = issue.streamId
    ? `${STREAM_HOST}/${issue.streamId}/thumbnails/thumbnail.jpg?time=1s&height=1280`
    : assetUrl(issue, 'cover.jpg');
  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
      <video
        src={src}
        poster={poster}
        title={title}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}

// カルーセルのページ（拡大写真と「Step into this look」は PagesViewer）
export function Pages({ issue, stepPages = [], stepKey, sample }: {
  issue: LatitudeIssue; stepPages?: StepIntoPage[]; stepKey?: string; sample?: { face: string; result: string } | null;
}) {
  return <PagesViewer slug={issue.slug} base={assetUrl(issue, '').replace(/\/$/, '')} pages={issue.pages} stepPages={stepPages} stepKey={stepKey} sample={sample} />;
}

// 号の色：何色でも横一列。1色の幅は色の数で決まる。スマホは色だけを一列に並べ、名前は下に1行ずつ書く
export function Palette({ issue }: { issue: LatitudeIssue }) {
  const cols = { gridTemplateColumns: `repeat(${issue.colours.length}, minmax(0, 1fr))` };
  const chip = (hex: string) => (
    <div className="w-full" style={{ background: hex, aspectRatio: '1 / 1', boxShadow: 'inset 0 0 0 1px rgba(30,29,27,0.08)' }} />
  );
  return (
    <>
      <div className="hidden gap-3 md:grid lg:gap-4" style={cols}>
        {issue.colours.map((c) => (
          <div key={c.name} className="min-w-0">
            {chip(c.hex)}
            <p className="mt-3 text-[10px] uppercase leading-snug tracking-[0.2em]" style={{ color: INK }}>
              {c.name}
            </p>
            <p className="mt-1 text-[10px] tracking-[0.15em]" style={{ color: MUTE }}>
              {c.hex.toUpperCase()}
            </p>
          </div>
        ))}
      </div>
      <div className="md:hidden">
        <div className="grid" style={cols}>
          {issue.colours.map((c) => (
            <div key={c.name}>{chip(c.hex)}</div>
          ))}
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-y-2.5">
          {issue.colours.map((c) => (
            <li key={c.name} className="flex items-center gap-2 text-[10px] uppercase tracking-[0.15em]" style={{ color: INK }}>
              <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ background: c.hex }} />
              <span className="truncate">{c.name}</span>
              <span className="ml-auto shrink-0" style={{ color: MUTE }}>
                {c.hex.toUpperCase()}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </>
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
