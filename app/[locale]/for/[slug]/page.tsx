import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProposal } from '@/lib/proposals';
import { ProposalPlayer } from '@/components/proposal/ProposalPlayer';

// 営業用の見本ページ。ブランドごとに lib/proposals.ts へ1件足すと出る。
// 検索に出さない（noindex）。サイトのメニューやサイトマップにも載せない。

const SERIF_EN = 'var(--font-playfair), "Playfair Display", Georgia, serif';
const MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProposal(slug);
  return {
    title: p ? `${p.brand} — VUAL Studio` : 'VUAL Studio',
    robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  };
}

const CUTS = [
  { en: 'WIDE', ja: '全身でコーデ全体の形を見せる。場所ごとに背景が変わる。' },
  { en: 'MID', ja: '重ね方と色の合わせ方。ここでスタイリングのポイントを一言、声と字幕で。' },
  { en: 'DETAIL', ja: 'ポイントが見える寄り。刺繍・柄・足元・首元など。' },
];

export default async function ProposalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const p = getProposal(slug);
  if (!p) notFound();

  const note = p.private
    ? `ご提案のために ${p.brand} の商品で作った見本です。公開はしていません。映像・画像はAIで制作しています。`
    : `制作例：${p.brand} の商品で組んだ見本です。ブランドとは関係のない、当方の制作見本です。映像・画像はAIで制作しています。`;
  const contact = p.contactEmail ? `mailto:${p.contactEmail}` : `/${locale}/contact`;
  const bw = new Set(p.feedBW ?? []);

  return (
    <div className="proposal-page relative min-h-screen bg-[#0d0a12] text-white selection:bg-white/20">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 12% 18%, rgba(124,58,237,.30), transparent 70%),' +
            'radial-gradient(ellipse 55% 40% at 90% 60%, rgba(56,110,120,.22), transparent 70%),' +
            'radial-gradient(ellipse 50% 35% at 40% 105%, rgba(168,85,247,.20), transparent 70%)',
        }}
      />
      <style>{`.proposal-page h1,.proposal-page h2,.proposal-page h3{color:rgba(255,255,255,.92)!important}.proposal-page a.pp-ghost{color:rgba(255,255,255,.88)!important}.proposal-page a.pp-solid{color:#0d0a12!important}.proposal-page img.pp-fill{height:100%!important}`}</style>

      <main className="relative mx-auto max-w-6xl px-5 pb-24 pt-14 sm:px-10 sm:pt-20">
        {/* 題 */}
        <p className="text-[11px] uppercase tracking-[0.38em] text-[#b9a8c9]" style={{ fontFamily: SERIF_EN }}>
          VUAL Studio · Reel Production Proposal
        </p>
        <h1 className="mt-6 text-4xl leading-tight tracking-[0.06em] sm:text-6xl" style={{ fontFamily: SERIF_EN }}>
          {p.brand}
        </h1>
        <p className="mt-3 text-xs uppercase tracking-[0.32em] text-white/60" style={{ fontFamily: SERIF_EN }}>
          {p.season} · 3 Looks · {p.place}
        </p>

        {/* 動画と説明 */}
        <section className="mt-12 grid gap-10 border-t border-[#b9a8c9]/30 pt-10 md:grid-cols-[minmax(0,360px)_1fr] md:gap-14">
          <ProposalPlayer streamId={p.streamId} title={`${p.brand} — sample reel`} />
          <div className="flex flex-col">
            <h2 className="text-[19px] leading-relaxed sm:text-3xl" style={{ fontFamily: MINCHO }}>
              1本のリールに、
              <br />
              3コーデ・9カット・3ロケーション。
            </h2>
            <p className="mt-6 text-[15px] leading-loose text-white/75" style={{ fontFamily: MINCHO }}>
              貴社の服でスタイリングを組み、実在の街を舞台に、スタイリングのポイントを一言で添えて、そのまま投稿できる20秒のリールにして納めます。撮影・モデル手配・ロケは要りません。
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {CUTS.map((c) => (
                <div key={c.en} className="border-t border-[#b9a8c9]/40 pt-3">
                  <p className="text-[11px] tracking-[0.3em] text-[#b9a8c9]" style={{ fontFamily: SERIF_EN }}>
                    {c.en}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/70" style={{ fontFamily: MINCHO }}>
                    {c.ja}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-auto flex flex-wrap gap-3 pt-10">
              <a
                href={p.pdf}
                target="_blank"
                rel="noopener"
                className="pp-solid border border-white/80 bg-white px-6 py-3 text-[12px] tracking-[0.25em] text-[#0d0a12] transition hover:bg-white/85"
                style={{ fontFamily: SERIF_EN }}
              >
                PROPOSAL (PDF)
              </a>
              <a
                href={contact}
                className="pp-ghost border border-white/40 px-6 py-3 text-[12px] tracking-[0.25em] text-white/85 transition hover:border-white"
                style={{ fontFamily: SERIF_EN }}
              >
                CONTACT
              </a>
            </div>
          </div>
        </section>

        {/* 3コーデ×3カット */}
        <section className="mt-20">
          <p className="text-[11px] tracking-[0.38em] text-[#b9a8c9]" style={{ fontFamily: SERIF_EN }}>
            3 LOOKS · 9 CUTS
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
            {CUTS.map((c) => (
              <p key={c.en} className="border-b border-[#b9a8c9]/40 pb-1 text-[10px] tracking-[0.3em] text-white/70" style={{ fontFamily: SERIF_EN }}>
                {c.en}
              </p>
            ))}
            {p.looks.flatMap((row, i) =>
              row.map((src, j) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={`${i}-${j}`} src={src} alt={`LOOK ${i + 1} ${CUTS[j].en}`} loading="lazy" className="aspect-[3/5] w-full object-cover" />
              )),
            )}
          </div>
        </section>

        {/* フィード用 */}
        <section className="mt-20">
          <p className="text-[11px] tracking-[0.38em] text-[#b9a8c9]" style={{ fontFamily: SERIF_EN }}>
            OPTION · FEED EDITORIAL
          </p>
          <h2 className="mt-4 text-2xl leading-relaxed" style={{ fontFamily: MINCHO }}>
            同じ服・同じ街で、フィード用に撮り分ける。
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-[1.3fr_1fr_1fr] sm:grid-rows-2 sm:gap-3">
            {p.feed.map((src, i) => (
              <div key={src} className={`relative ${i === 0 ? 'col-span-2 aspect-[3/4] sm:col-span-1 sm:row-span-2 sm:aspect-auto' : 'aspect-[3/4]'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Feed ${i + 1}`} loading="lazy" className="pp-fill absolute inset-0 h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 bg-black/60 px-2 py-1 text-[10px] tracking-[0.2em]" style={{ fontFamily: SERIF_EN }}>
                  {String(i + 1).padStart(2, '0')}
                  {bw.has(i + 1) ? ' · B&W' : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-white/60" style={{ fontFamily: MINCHO }}>
            縦3:4・5枚組。リールとセットのご注文で ＋3万円（税別）。
          </p>
        </section>

        {/* 終わり */}
        <footer className="mt-20 border-t border-[#b9a8c9]/30 pt-8">
          <p className="text-[12px] tracking-[0.3em] text-white/80" style={{ fontFamily: SERIF_EN }}>
            VUAL STUDIO — SACHIO KAWASAKI
          </p>
          <p className="mt-2 text-[12px] text-white/50" style={{ fontFamily: SERIF_EN }}>
            Visual Director | CSM MA Fashion / Ex-Balenciaga | UK / Japan
          </p>
          <p className="mt-1 text-[12px] text-white/50" style={{ fontFamily: MINCHO }}>
            {p.contactEmail ?? 'studio@vual.jp'}　／　運営：株式会社LUFIS
          </p>
          <p className="mt-6 text-[11px] leading-relaxed text-white/40" style={{ fontFamily: MINCHO }}>
            {note}
          </p>
        </footer>
      </main>
    </div>
  );
}
