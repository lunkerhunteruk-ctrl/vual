import { INK, MUTE, PAPER } from '@/components/latitude/Latitude';

// 号を開く時の待ち画面（2026-10-27）：号のページは毎回その場で作るので、届くまで 1 秒前後かかる。
// その間なにも変わらないと「押しても反応しない」と思われたので、押した瞬間に紙の色の画面と細い線を出す
export default function LatitudeIssueLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center" style={{ background: PAPER, color: INK }}>
      <style>{'@keyframes latitude-load{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}'}</style>
      <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: MUTE }}>Latitude</p>
      <div className="mt-5 h-px w-24 overflow-hidden" style={{ background: 'rgba(30,29,27,0.12)' }}>
        <div className="h-full w-1/3" style={{ background: INK, animation: 'latitude-load 1.1s ease-in-out infinite' }} />
      </div>
    </div>
  );
}
