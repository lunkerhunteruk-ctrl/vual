// 営業用の見本ページ（vual.jp/ja/for/<slug>）の中身。ブランドごとに1件ずつ足す。
// 写真とPDFは public/proposals/<slug>/、動画は Cloudflare Stream に置く。
// ページは検索に出さず、サイトのメニューにも載せない（リンクを知っている人だけが見る）。

export type BrandProposal = {
  slug: string;
  brand: string;
  season: string;
  place: string;
  /** true = 相手の商品で作った非公開の見本。false = 一般の制作見本 */
  private: boolean;
  /** true = 凛のアカウントでも同じ服を出している。注意書きから「公開はしていません」を外す */
  postedOnRin?: boolean;
  streamId: string;
  /** LOOK1〜3 の順。各 [全身, 中景, 寄り] */
  looks: [string, string, string][];
  /** フィード用の写真。1枚目を大きく出す */
  feed: string[];
  feedBW?: number[];
  pdf: string;
  contactEmail?: string;
  /** 営業メールを送った日（日本時間 YYYY-MM-DD）。入れると、その日から validDays 日でページが終わる */
  sentAt?: string;
  /** 案内の有効日数。既定14日（大手の傘下は21日） */
  validDays?: number;
  /** true = Stream の動画を期限付きの署名URLで出す（動画側も requireSignedURLs にしておく）。既定は private と同じ */
  signedVideo?: boolean;
};

const CONTACT = 'studio@vual.jp';
const R2 = '/proposals';
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

/** 案内の最終日（日本時間のその日の終わり）。sentAt が無ければ null（期限なし） */
export function proposalExpiry(p: BrandProposal): Date | null {
  if (!p.sentAt) return null;
  const end = new Date(`${p.sentAt}T23:59:59+09:00`);
  end.setUTCDate(end.getUTCDate() + (p.validDays ?? 14));
  return end;
}

export function isProposalExpired(p: BrandProposal, now = Date.now()) {
  const end = proposalExpiry(p);
  return !!end && now > end.getTime();
}

/** 署名付き動画の有効期限（UNIX秒）。Stream は最長24時間なので、ページを開くたびに作り直す。案内の最終日を越えない */
export function proposalTokenExp(p: BrandProposal, now = Date.now()) {
  const dayLater = now + 23 * 3600000;
  const end = proposalExpiry(p)?.getTime();
  return Math.floor(Math.min(dayLater, end ?? dayLater) / 1000);
}
