// LATITUDE の紙面の色と字（2026-11-14 1か所にまとめた。サーバーの部品からもブラウザの部品からも読む、ただの定数）。
// Instagram のカルーセルと同じ紙・墨・灰を使う
export const PAPER = '#f2eee7';
export const INK = '#1e1d1b';
export const MUTE = '#5f5b54'; // 旧 #78746c。紙の色との濃淡差 4.0 → 5.8
const JA_MINCHO = '"Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "Noto Serif JP", "Noto Serif CJK JP"';
export const SERIF = `var(--font-playfair), "Didot", "Bodoni 72", Georgia, ${JA_MINCHO}, serif`;
export const MINCHO = `${JA_MINCHO}, serif`;

// 2026-11-14 店カードなどの行動（公式サイト・Google マップ・地図で見る・聞く）。字は小さいまま、押せる高さだけ 44px に広げる。
// ACTION_MAIN はいちばん押すもの（Google マップ）。枠の色は使う側で INK を付ける
export const ACTION = 'inline-flex min-h-[44px] items-center text-[12px] uppercase tracking-[0.18em] underline-offset-4 hover:underline';
export const ACTION_MAIN = 'inline-flex min-h-[44px] items-center border px-4 text-[12px] uppercase tracking-[0.18em]';
