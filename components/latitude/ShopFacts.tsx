import CopyText from '@/components/latitude/CopyText';
import { MUTE, TAP_INLINE } from '@/lib/latitude-theme';
import type { CityPlace } from '@/lib/latitude-places';

// 2026-11-14 ②-3 店カードの、日本語の店名と住所（街のページの横に流すカード・種類／地区のページの行・店の地図の下から出るカードで同じ形）。
// 看板と見比べる・タクシーで見せる・Google マップに貼るため。オーナー決定：住所は日本語版にも出す。ただし店名や説明より目立たせない（1行・13px・灰色）。
// 住所の文言は足さない（ラベルなしで住所だけ）。字はサーバーで描く（このファイルに 'use client' は付けない。コピーのボタンだけがブラウザの部品）

const hasJa = (s: string) => /[぀-ヿ㐀-鿿]/.test(s); // ひらがな・カタカナ・漢字

// 英語のページだけ、英語の店名のすぐ下に日本語の店名。同じ名前（外国の店など）なら出さない
export function JaName({ name, nameEn, ja }: { name?: string; nameEn: string; ja: boolean }) {
  if (ja || !name || name === nameEn) return null;
  return <p lang={hasJa(name) ? 'ja' : undefined} className="mt-1 text-[14px]" style={{ color: MUTE }}>{name}</p>;
}

// 2026-11-14 ②-4 営業時間・休み・予約・現金のみ。データがある項目だけを1行に（無ければ何も出さない）。データは編集部が公式で確かめた物だけ
export type ShopFactsData = Pick<CityPlace, 'hours' | 'closed' | 'reserve' | 'cashOnly'>;
const RESERVE = {
  required: { ja: '予約が必要', en: 'Reservation required' },
  recommended: { ja: '予約がおすすめ', en: 'Reservation recommended' },
  no: { ja: '予約不可', en: 'No reservations' },
} as const;
export function FactsLine({ facts, ja, className = 'mt-2' }: { facts?: ShopFactsData; ja: boolean; className?: string }) {
  if (!facts) return null;
  const items = [
    facts.hours && (ja ? facts.hours.ja : facts.hours.en),
    facts.closed && (ja ? `休み：${facts.closed.ja}` : `Closed: ${facts.closed.en}`),
    facts.reserve && (ja ? RESERVE[facts.reserve].ja : RESERVE[facts.reserve].en),
    facts.cashOnly && (ja ? '現金のみ' : 'Cash only'),
  ].filter(Boolean);
  if (!items.length) return null;
  return <p className={`${className} text-[13px] leading-snug`} style={{ color: MUTE }}>{items.join('  ·  ')}</p>;
}

// 住所1行と「コピー」。長い住所は1行に収め（…で切る）、全部はコピーと title で。コピーの押せる高さは 44px（行の高さは変えない）
export function AddressLine({ address, ja, className = 'mt-2' }: { address?: string; ja: boolean; className?: string }) {
  if (!address) return null;
  return (
    <p className={`${className} flex min-w-0 items-baseline gap-3 text-[13px] leading-snug`} style={{ color: MUTE }}>
      <span lang={hasJa(address) ? 'ja' : 'en'} className="min-w-0 truncate" title={address}>{address}</span>
      <CopyText text={address} label={ja ? 'コピー' : 'Copy'} done={ja ? 'コピー ✓' : 'Copy ✓'}
        className={`${TAP_INLINE} shrink-0 cursor-pointer text-[12px] uppercase tracking-[0.18em] underline underline-offset-4 [&:lang(ja)]:tracking-[0.08em]`}
        style={{ color: MUTE }} />
    </p>
  );
}
