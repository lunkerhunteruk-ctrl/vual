import type { Metadata } from 'next';
import { INK, IssueStrip, MUTE, PAPER, PublishedBy, SERIF } from '@/components/latitude/Latitude';
import { savedIndex } from '@/lib/latitude-saved-index';
import { decodeShare } from '@/lib/latitude-saved';
import SavedList from '@/components/latitude/SavedList';
import { SavedRows, type SavedCity } from '@/components/latitude/SavedRows';
import { AddShared } from '@/components/latitude/SaveButton';

// 2026-11-14 ③-2 保存した店（/latitude/saved）。保存は端末の中だけ（lib/latitude-saved.ts）。サーバーには何も置かない。
// ・?s=街:店,店;街:店 で開いた時は「共有された店の一覧」（URL にあるのは街の slug と店の id だけ。データに無い id は黙って飛ばす）。これはサーバーで描く
// ・?s が無い時は自分の一覧。中身は端末にしか無いのでブラウザで描く（使えない端末・空の時は「まだありません」。店名などは保存がある時だけ読む）
// 検索エンジンには載せない（中身が端末ごとに違うため）

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === 'ja' ? '保存した店 | LATITUDE' : 'Saved places | LATITUDE', robots: { index: false, follow: true } };
}

export default async function LatitudeSavedPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ s?: string | string[] }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  const ja = locale === 'ja';
  const isShared = !!sp.s;
  const index = isShared ? savedIndex(ja) : {};
  const shared = decodeShare(Array.isArray(sp.s) ? sp.s[0] : sp.s).filter((x) => index[x.c]?.rows[x.id]);
  const groups: SavedCity[] = [];
  for (const x of shared) {
    let g = groups.find((y) => y.slug === x.c);
    if (!g) { g = { slug: x.c, name: index[x.c].name, cc: index[x.c].cc, rows: [] }; groups.push(g); }
    g.rows.push({ id: x.id, ...index[x.c].rows[x.id] });
  }

  return (
    <div className="min-h-screen" style={{ background: PAPER, color: INK }}>
      <IssueStrip locale={locale} current="saved" />
      <header className="mx-auto max-w-6xl px-4 pb-10 pt-16 md:px-8 md:pb-14 md:pt-28">
        <h1 className="text-[44px] leading-[1] md:text-[72px]" style={{ fontFamily: SERIF, fontWeight: 400 }}>
          {isShared ? (ja ? '共有された店の一覧' : 'A shared list of places') : (ja ? '保存した店' : 'Saved places')}
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: MUTE }}>
          {ja ? '保存はこの端末の中だけです。ログインは要りません。' : 'Saved on this device only. No account needed.'}
        </p>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-8 md:pb-32">
        {isShared ? (
          <>
            {shared.length > 0 && <div className="mb-10"><AddShared items={shared} ja={ja} /></div>}
            <SavedRows groups={groups} locale={locale} />
          </>
        ) : (
          // 自分の一覧：端末の中にしか無いので、ブラウザで描く
          <SavedList locale={locale} />
        )}
      </main>
      <footer className="pb-28">
        <PublishedBy locale={locale} />
      </footer>
    </div>
  );
}
