// 2026-11-01 LATITUDE「その街のいま」：街のページと号のページの題の近くに出す、その街のいまの時刻・気温・天気。
// 天気は Open-Meteo（鍵なし・無料）をサーバーで取り、30分ためる（components/latitude/NowInCity.tsx）。
// このファイルは、サーバーと見る人のブラウザの両方で使う、計算だけの部品（取得はしない）。
// 色の決め方：いまの時間帯（夜明け・昼・夕暮れ・夜）で地の色を決め、空模様（くもり・雨・雪・霧・雷）の色を混ぜる。

export type NowData = {
  tz: string; // その街のタイムゾーン（Open-Meteo の timezone=auto が返す IANA の名前）
  at: number; // サーバーで描いた時刻（ミリ秒）。最初の描画はこれで描き、ブラウザで今の時刻に置きかえる（描画のずれを出さない）
  temp: number; // °C
  code: number; // WMO の天気コード
  isDay: boolean;
  wind: number; // km/h
  gusts: number; // km/h
  suns: { rise: number; set: number }[]; // 今日と明日の日の出・日の入り（ミリ秒）。白夜・極夜の日は 0
};

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export type Sky = 'clear' | 'cloud' | 'overcast' | 'fog' | 'rain' | 'snow' | 'storm';

const MIN = 60_000;

// 時間帯：日の出の45分前〜1時間後＝夜明け／日の入りの75分前〜45分後＝夕暮れ／その間＝昼／ほか＝夜
export function phaseAt(now: number, d: Pick<NowData, 'suns' | 'isDay'>): Phase {
  const valid = d.suns.filter((s) => s.rise && s.set && s.set > s.rise);
  for (const { rise, set } of valid) {
    if (now >= rise - 45 * MIN && now < rise + 60 * MIN) return 'dawn';
    if (now >= set - 75 * MIN && now < set + 45 * MIN) return 'dusk';
    if (now >= rise + 60 * MIN && now < set - 75 * MIN) return 'day';
  }
  if (valid.length) return 'night';
  return d.isDay ? 'day' : 'night'; // 白夜・極夜
}

// 次の日の出か日の入り
export function nextSun(now: number, d: Pick<NowData, 'suns'>): { kind: 'sunrise' | 'sunset'; t: number } | null {
  const ev = d.suns
    .flatMap((s) => [
      { kind: 'sunrise' as const, t: s.rise },
      { kind: 'sunset' as const, t: s.set },
    ])
    .filter((e) => e.t > now)
    .sort((a, b) => a.t - b.t);
  return ev[0] ?? null;
}

// WMO の天気コード → 短い言葉（英語は小文字の一語二語、日本語は天気予報の言い方）
const WORDS: [number[], Sky, string, string][] = [
  [[0], 'clear', 'clear', '晴れ'],
  [[1], 'clear', 'mostly clear', 'おおむね晴れ'],
  [[2], 'cloud', 'partly cloudy', '晴れ時々くもり'],
  [[3], 'overcast', 'overcast', 'くもり'],
  [[45], 'fog', 'fog', '霧'],
  [[48], 'fog', 'freezing fog', '霧氷'],
  [[51], 'rain', 'light drizzle', '霧雨'],
  [[53], 'rain', 'drizzle', '霧雨'],
  [[55], 'rain', 'heavy drizzle', '強い霧雨'],
  [[56, 57], 'rain', 'freezing drizzle', '凍る霧雨'],
  [[61], 'rain', 'light rain', '小雨'],
  [[63], 'rain', 'rain', '雨'],
  [[65], 'rain', 'heavy rain', '強い雨'],
  [[66, 67], 'rain', 'freezing rain', '凍る雨'],
  [[71], 'snow', 'light snow', '小雪'],
  [[73], 'snow', 'snow', '雪'],
  [[75], 'snow', 'heavy snow', '大雪'],
  [[77], 'snow', 'snow grains', '霧雪'],
  [[80], 'rain', 'light showers', 'にわか雨'],
  [[81], 'rain', 'showers', 'にわか雨'],
  [[82], 'rain', 'heavy showers', '強いにわか雨'],
  [[85], 'snow', 'snow showers', 'にわか雪'],
  [[86], 'snow', 'heavy snow showers', '強いにわか雪'],
  [[95], 'storm', 'thunderstorm', '雷雨'],
  [[96, 99], 'storm', 'thunderstorm, hail', '雷雨とひょう'],
];

export function weatherOf(code: number): { sky: Sky; en: string; ja: string } | null {
  const w = WORDS.find(([codes]) => codes.includes(code));
  return w ? { sky: w[1], en: w[2], ja: w[3] } : null;
}

// 風は強い時だけ言う（ふだんは黙る）
export function windOf(d: Pick<NowData, 'wind' | 'gusts'>): { en: string; ja: string } | null {
  if (d.gusts >= 55) return { en: `gusts ${Math.round(d.gusts)} km/h`, ja: `突風 ${Math.round(d.gusts)}km/h` };
  if (d.wind >= 28) return { en: `windy, ${Math.round(d.wind)} km/h`, ja: `風が強い ${Math.round(d.wind)}km/h` };
  return null;
}

export const PHASE_WORD: Record<Phase, { en: string; ja: string }> = {
  dawn: { en: 'first light', ja: '夜明け' },
  day: { en: 'daytime', ja: '昼' },
  dusk: { en: 'dusk', ja: '夕暮れ' },
  night: { en: 'night', ja: '夜' },
};

// 時間帯の色（紙 #f2eee7 の上にうすく敷く色）
const PHASE_TONE: Record<Phase, string> = {
  dawn: '#c39a8e', // 薄紅の灰
  day: '#b7a27a', // 明るい砂
  dusk: '#b0743c', // 琥珀
  night: '#25304a', // 紺
};
// 空模様の色と、混ぜる量
const SKY_TONE: Record<Sky, [string, number]> = {
  clear: ['#000000', 0],
  cloud: ['#8d8a83', 0.25],
  overcast: ['#8d8a83', 0.45],
  fog: ['#a7a39a', 0.6],
  rain: ['#5f7383', 0.6], // 灰青
  snow: ['#c7ced6', 0.55],
  storm: ['#3b4150', 0.7],
};

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, w: number) => {
  const [x, y] = [hex(a), hex(b)];
  return '#' + x.map((v, i) => Math.round(v * (1 - w) + y[i] * w).toString(16).padStart(2, '0')).join('');
};

// 欄の色：chip＝小さな四角と左の細い帯の色、wash＝地にうすく敷くグラデーションの濃さ
export function toneOf(phase: Phase, sky: Sky): { chip: string; wash: string } {
  const [c, w] = SKY_TONE[sky];
  // 夜は紺を残す（雨の夜は紺に灰青が少し、雪の夜は少し明るい紺）
  const chip = mix(PHASE_TONE[phase], c, phase === 'night' ? w * 0.45 : w);
  const [r, g, b] = hex(chip);
  const a = phase === 'night' ? 0.16 : phase === 'dusk' ? 0.12 : 0.09;
  return { chip, wash: `linear-gradient(90deg, rgba(${r},${g},${b},${a}) 0%, rgba(${r},${g},${b},${a * 0.35}) 55%, rgba(${r},${g},${b},0) 100%)` };
}

// その街の時刻（24時間・HH:MM）
export function clockIn(tz: string, t: number) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
  } catch {
    return '';
  }
}

// 気温（四捨五入。マイナスは本物のマイナス記号。-0 は 0）
export const tempText = (c: number) => {
  const n = Math.round(c);
  return n < 0 ? `−${-n}` : `${n === 0 ? 0 : n}`;
};

// 号の街の日本語名（号には日本語の街の名前が無いので、ここで持つ。街のページがある街は CITIES の nameJa を使う）
export const ISSUE_CITY_JA: Record<string, string> = {
  iceland: 'レイキャビク',
  copenhagen: 'コペンハーゲン',
  london: 'ロンドン',
  edinburgh: 'エディンバラ',
  milan: 'ミラノ',
  faro: 'フォーレ島',
  klippan: 'クリッパン',
  vienna: 'ウィーン',
  kanazawa: '金沢',
  haworth: 'ハワース',
};
// 号の city が国の名前などの時に、時刻と天気を取る街の名前で言い直す
export const ISSUE_CITY_EN: Record<string, string> = { iceland: 'Reykjavík' };
