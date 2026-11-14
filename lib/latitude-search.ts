// 2026-11-14 ③-3 「場所から探す」（/latitude/places）の頭の検索欄。探す元の形と、照らし合わせ方。
// 探す元は /api/latitude/search（ビルドの時に lib/latitude-places.ts から作る小さな JSON。外の検索サービスは使わない）。
// このファイルはデータを読まない（ブラウザの部品からも読むので、店の一覧を抱えこまない）。

// 探す元の JSON。字数を減らすため配列で持つ。同じ字（種類・地区）は labels に1度だけ置き、番号で指す
export type SearchIndex = {
  v: 1;
  labels: [en: string, ja: string][];
  // 街：slug・英語の名前・日本語の名前・県や国（英語・日本語）
  towns: [slug: string, name: string, nameJa: string, where: string, whereJa: string][];
  // 店：街の番号（towns の何番目）・日本語の店名・英語の店名（日本語と同じなら ''）・種類（labels の番号）・地区（labels の番号）・カードの id（placeAnchor と同じ）
  shops: [town: number, name: string, nameEn: string, cat: number, area: number, anchor: string][];
};

// 大文字・小文字、全角・半角（NFKC）、ひらがな・カタカナ、アクセント記号（é・ø）の違いを消し、記号と空白は1つの空白に
const LETTERS: Record<string, string> = { 'ø': 'o', 'æ': 'ae', 'ð': 'd', 'þ': 'th', 'ß': 'ss', 'œ': 'oe', 'ł': 'l', 'đ': 'd' };
export function fold(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[øæðþßœłđ]/g, (ch) => LETTERS[ch])
    .normalize('NFKD').replace(/[̀-ͯ]/g, '').normalize('NFC') // ラテン文字のアクセントだけ外す（濁点 U+3099 は残る）
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60)) // カタカナ → ひらがな
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// ひらがなだけの入力（変換前の「かなざわ」など）を、ローマ字（ヘボン式）にして英語の名前とも照らす。
// データに読みがなは無いので、読みを作るのではなく、入力の方をローマ字にするだけ
const KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ゔ: 'vu',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};
const SMALL_Y: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const SMALL_V: Record<string, string> = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };
export function kanaToRomaji(s: string): string {
  let out = '';
  let double = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === 'っ') { double = true; continue; }
    if (ch === 'ー') continue;
    let r = KANA[ch] ?? (SMALL_Y[ch] ? `y${SMALL_Y[ch]}` : '');
    const next = s[i + 1];
    if (r.length > 1 && next && SMALL_Y[next]) {
      // きゃ → kya、しゃ → sha、ちゃ → cha、じゃ → ja
      const stem = r.slice(0, -1);
      r = (/(sh|ch|j)$/.test(stem) ? stem : `${stem}y`) + SMALL_Y[next];
      i++;
    } else if (r.length > 1 && next && SMALL_V[next]) {
      // ふぁ → fa、てぃ → ti
      r = r.slice(0, -1) + SMALL_V[next];
      i++;
    }
    if (double && r) r = r[0] + r;
    double = false;
    out += r;
  }
  return out;
}

// 照らし合わせる前の形（空白で区切った形・空白を詰めた形・2つめ以降の語から始めて詰めた形）
export type Prepared = { w: string; c: string; tails: string[] };
export const prepare = (s: string): Prepared => {
  const w = fold(s);
  const words = w.split(' ');
  return { w, c: words.join(''), tails: words.slice(1).map((_, k) => words.slice(k + 1).join('')) };
};

// 0：名前の頭から合う／1：名前の中の語の頭から合う／2：名前の途中で合う／-1：合わない。
// 空白や「-」の有る無しは問わない（nishichaya で Nishi-chaya）。ただし途中で合う時は、語の境をまたがない（Nabeshima Imaemon に imai は合わない）
export function rank(f: Prepared, q: Prepared): number {
  if (!q.c) return -1;
  if (f.c.startsWith(q.c)) return 0;
  if (f.tails.some((t) => t.startsWith(q.c))) return 1;
  if (f.w.includes(q.w)) return 2;
  return -1;
}

export type Query = { q: Prepared; romaji: Prepared[] };
export function makeQuery(raw: string): Query {
  const q = prepare(raw);
  const romaji: Prepared[] = [];
  // ひらがなだけで2字以上の時だけ（1字のローマ字は合う物が多すぎる）。長い音（おう・うう）は英語の綴りで落ちることが多いので、落とした形も
  if (q.c.length >= 2 && /^[ぁ-ゖー]+$/.test(q.c)) {
    const r = kanaToRomaji(q.c);
    for (const v of new Set([r, r.replace(/ou/g, 'o').replace(/uu/g, 'u')])) if (v) romaji.push({ w: v, c: v, tails: [] });
  }
  return { q, romaji };
}

// その物の名前（日本語・英語）のうち、いちばん良い合い方。ローマ字にした入力で合った時は、そのままの入力で合った物より下に（+3）
export function best(names: Prepared[], latin: Prepared[], query: Query): { r: number; via: number } {
  let r = -1;
  let via = -1;
  names.forEach((n, k) => {
    const x = rank(n, query.q);
    if (x >= 0 && (r < 0 || x < r)) { r = x; via = k; }
  });
  if (r < 0) {
    for (const rq of query.romaji) latin.forEach((n) => {
      const x = rank(n, rq);
      if (x >= 0 && (r < 0 || x + 3 < r)) { r = x + 3; via = names.indexOf(n); }
    });
  }
  return { r, via };
}

export const MAX_TOWNS = 5;
export const MAX_SHOPS = 10;
