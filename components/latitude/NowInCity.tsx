import { PLACES } from '@/lib/latitude-map';
import type { NowData } from '@/lib/latitude-now';
import { NowLine } from './NowLine';

// 2026-11-01 「その街のいま」（サーバー側）。Open-Meteo からその街の今の天気と日の出・日の入りを取り、30分ためる。
// 見る人の位置は使わない。取れない時・座標が無い時は何も出さない（ページは崩さない）。

const REVALIDATE = 1800;

async function fetchNow(lat: number, lon: number): Promise<NowData | null> {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m,weather_code,is_day,wind_speed_10m,wind_gusts_10m',
    daily: 'sunrise,sunset',
    timezone: 'auto',
    timeformat: 'unixtime',
    forecast_days: '2',
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, {
      next: { revalidate: REVALIDATE },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const cur = j?.current;
    if (!j?.timezone || typeof cur?.temperature_2m !== 'number' || typeof cur?.weather_code !== 'number') return null;
    const rise: number[] = j.daily?.sunrise ?? [];
    const set: number[] = j.daily?.sunset ?? [];
    return {
      tz: j.timezone,
      at: Date.now(),
      temp: cur.temperature_2m,
      code: cur.weather_code,
      isDay: cur.is_day === 1,
      wind: cur.wind_speed_10m ?? 0,
      gusts: cur.wind_gusts_10m ?? 0,
      suns: rise.map((r, k) => ({ rise: (r || 0) * 1000, set: (set[k] || 0) * 1000 })),
    };
  } catch {
    return null;
  }
}

// place：号の slug（lib/latitude-map.ts の PLACES）か、直接の座標
export async function NowInCity({ place, coords, name, ja, chapters, className }: {
  place?: string;
  chapters?: { time: string }[]; // 号のページだけ：章の時刻（いまが重なる章に小さな印を出す）
  coords?: [number, number];
  name: string; // 表示する街の名前（言語に合わせて渡す）
  ja: boolean;
  className?: string;
}) {
  const at = coords ?? (place ? PLACES[place] : undefined);
  if (!at) return null;
  const data = await fetchNow(at[0], at[1]);
  if (!data) return null;
  return <NowLine data={data} name={name} ja={ja} chapters={chapters} className={className} />;
}
