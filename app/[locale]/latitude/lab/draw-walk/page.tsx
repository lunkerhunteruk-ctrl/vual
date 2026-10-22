import type { Metadata } from 'next';
import { DrawWalk } from '@/components/latitude/DrawWalk';

// 試作（公開していない）：ロンドン3枚目の地図の上で、線が描かれて歩き出す。動画を使わない版
export const metadata: Metadata = { title: 'LATITUDE lab', robots: { index: false, follow: false } };

export default function DrawWalkLab() {
  // 地図のページ（1080×1440）の上の、歩く絵の場所（x600 y640、高さ587。絵は 493×692 の比）
  const h = 587, w = Math.round((587 * 493) / 692); // 4コマの枠 493×692
  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: '#0c0c0b' }}>
      <div className="relative" style={{ aspectRatio: '3 / 4', width: 'min(100vw - 2rem, 75svh)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/latitude/london/pages/03.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute" style={{ left: `${(600 / 1080) * 100}%`, top: `${(640 / 1440) * 100}%`, width: `${(w / 1080) * 100}%`, height: `${(h / 1440) * 100}%` }}>
          <DrawWalk base="/latitude/london/drawwalk" draw={false} />
        </div>
      </div>
    </div>
  );
}
