// 営業用の見本ページ（vual.jp/ja/for/<slug>）の中身。ブランドごとに1件ずつ足す。
// 写真とPDFは R2（vual-media の proposals/<slug>/）、動画は Cloudflare Stream に置く。
// ページは検索に出さず、サイトのメニューにも載せない（リンクを知っている人だけが見る）。

export type BrandProposal = {
  slug: string;
  brand: string;
  season: string;
  place: string;
  /** true = 相手の商品で作った非公開の見本。false = 一般の制作見本 */
  private: boolean;
  streamId: string;
  /** LOOK1〜3 の順。各 [全身, 中景, 寄り] */
  looks: [string, string, string][];
  /** フィード用の写真。1枚目を大きく出す */
  feed: string[];
  feedBW?: number[];
  pdf: string;
  contactEmail?: string;
};

const CONTACT = 'studio@vual.jp';
const R2 = 'https://pub-63bccf8e4ef949bb8384ab641631a180.r2.dev/proposals';
const img = (slug: string, name: string) => `${R2}/${slug}/img/${name}.jpg`;

function make(p: Omit<BrandProposal, 'looks' | 'feed' | 'pdf'> & { pdfName: string }): BrandProposal {
  const { pdfName, ...rest } = p;
  return {
    contactEmail: CONTACT,
    ...rest,
    looks: [1, 2, 3].map((n) => [img(p.slug, `W${n}`), img(p.slug, `M${n}`), img(p.slug, `D${n}`)]) as [string, string, string][],
    feed: [1, 2, 3, 4, 5].map((n) => img(p.slug, `E${n}`)),
    pdf: `${R2}/${p.slug}/${pdfName}`,
  };
}

export const PROPOSALS: BrandProposal[] = [
  make({
    slug: 'dries-van-noten-k7q2',
    brand: 'DRIES VAN NOTEN',
    season: 'AUTUMN / WINTER 2026',
    place: 'KYOTO',
    private: false,
    streamId: 'cccdd712ff5f7f11aa800dfc3a86cd5a',
    feedBW: [3],
    pdfName: 'VUAL-proposal-DRIES-VAN-NOTEN.pdf',
  }),
];

export function getProposal(slug: string) {
  return PROPOSALS.find((p) => p.slug === slug) ?? null;
}
