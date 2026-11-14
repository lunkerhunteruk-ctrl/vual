// 2026-11-14 穴場のおすすめ度の小さな部品（地図のカードと穴場のページで使う）。●の数と、12か月の帯
import { INK, MUTE } from '@/lib/latitude-theme';

const MOSS = '#4f6b3a';

export function Dots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-[3px]" aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((k) => <span key={k} className="block h-[7px] w-[7px] rounded-full" style={{ background: k <= n ? MOSS : 'transparent', border: `1px solid ${MOSS}` }} />)}
    </span>
  );
}

// 12か月の帯（高さがおすすめ度）。at の月に印
export function Strip({ score, at, big }: { score: number[]; at?: number; big?: boolean }) {
  const H = big ? 40 : 18;
  return (
    <span className="mt-2 flex items-end gap-[2px]" aria-hidden="true">
      {score.map((v, i) => (
        <span key={i} className="flex flex-1 flex-col items-center gap-[2px]">
          <span className="block w-full" style={{ height: Math.max(2, (v / 5) * H), background: MOSS, opacity: at === i + 1 ? 1 : 0.35 }} />
          {big && <span className="text-[11px] tabular-nums" style={{ color: at === i + 1 ? INK : MUTE }}>{i + 1}</span>}
        </span>
      ))}
    </span>
  );
}
