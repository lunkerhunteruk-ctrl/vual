'use client';
import { useSyncExternalStore } from 'react';
import { INK, MUTE } from '@/lib/latitude-theme';
import { openStatus, statusText, type OpenHours, type TownZone } from '@/lib/latitude-open';

// 2026-11-15 店カードの「時間割では営業時間内か」の1行（オーナー決定 2026-11-15。言葉と決まりは lib/latitude-open.ts）。
// 時計で変わるので、ここだけブラウザで描く。ページは前もって作ってあるので、サーバーの HTML ではこの行の高さだけ取っておき（形がずれない）、
// 開いてから字を入れる。open の無い店では、この部品を置かない（今のカードと同じ）。
// 1分ごとに描き直す（画面が見えている間だけ。全部のカードで1つの時計を使う）。時刻はその町の時刻（見る人の時刻に直さない）

const OPEN_DOT = '#4f6b3a'; // 日本のページの月のリンクと同じ、くすんだオリーブ
const MINUTE = 60_000;

// 全部のカードで1つの「いまの分」
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
const tick = () => listeners.forEach((f) => f());
function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!listeners.size || document.visibilityState !== 'visible') return;
  timer = setTimeout(() => { tick(); schedule(); }, MINUTE - (Date.now() % MINUTE) + 50);
}
const onVisible = () => { if (document.visibilityState === 'visible') tick(); schedule(); };
function subscribe(f: () => void) {
  listeners.add(f);
  if (listeners.size === 1) document.addEventListener('visibilitychange', onVisible);
  schedule();
  return () => {
    listeners.delete(f);
    if (!listeners.size) { document.removeEventListener('visibilitychange', onVisible); schedule(); }
  };
}
const minuteNow = () => Math.floor(Date.now() / MINUTE);
const serverMinute = () => -1; // サーバーと、開いた直後の描画では「まだ分からない」
export const useMinute = () => useSyncExternalStore(subscribe, minuteNow, serverMinute);
// on の間だけ時計を動かす（地図の「いま営業時間内」を押した時だけ）。off の間は -1
const noSubscribe = () => () => {};
export const useMinuteIf = (on: boolean) => useSyncExternalStore(on ? subscribe : noSubscribe, on ? minuteNow : serverMinute, serverMinute);

// 状態の字と点（色が無くても言葉で分かる）。分からない時は null
export function OpenNowText({ open, zone, ja, minute }: { open: OpenHours; zone: TownZone | null; ja: boolean; minute: number }) {
  // 不定休は時計に関係なく同じ字なので、サーバーでも描く
  const line = open.irregular
    ? statusText({ state: 'unknown', reason: 'irregular' }, ja)
    : minute < 0 ? null : statusText(openStatus(open, new Date(minute * MINUTE), zone), ja);
  if (!line) return null;
  return (
    <>
      {line.tone !== 'note' && (
        <span aria-hidden="true" className="block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: line.tone === 'open' ? OPEN_DOT : MUTE }} />
      )}
      <span className="min-w-0 truncate" style={{ color: line.tone === 'note' ? MUTE : INK }}>{line.text}</span>
    </>
  );
}

export default function OpenNow({ open, zone, ja, className = 'mt-1' }: { open: OpenHours; zone: TownZone | null; ja: boolean; className?: string }) {
  const minute = useMinute();
  // 高さは1行ぶん（20px）で固定。長い字は「…」で切る（行が増えて下がずれないように）
  return (
    <p className={`${className} flex h-5 min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[13px] leading-5`} style={{ color: MUTE }}>
      <OpenNowText open={open} zone={zone} ja={ja} minute={minute} />
    </p>
  );
}

// 行の中に置く形（地図の下の「ここから近い順」など。ブラウザだけで出る所なので、高さは取っておかない）。分からない時は何も描かない
export function OpenNowInline({ open, zone, ja, className }: { open: OpenHours; zone: TownZone | null; ja: boolean; className?: string }) {
  const minute = useMinute();
  const inner = OpenNowText({ open, zone, ja, minute });
  return inner ? <span className={className}>{inner}</span> : null;
}
