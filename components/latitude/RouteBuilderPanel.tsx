'use client';
import { useMemo, useState } from 'react';
import { km, mins } from '@/lib/latitude-routes/format';
import { MAX_STOPS, WALK_M_PER_MIN, googleWalkUrl, shortestOrder, type Leg } from '@/lib/latitude-routes/pairs';
import { markStyle, type MarkKind } from '@/lib/latitude-markers';

// 2026-11-11 試作（金沢）：店の地図の「自分でルートを組む」の下の段。選んだ順・区間の距離・合計（分速80m）・
// 近い順に並べ替え（最初の1軒は固定）・リセット・Google マップの歩きの道案内・名前から選ぶ。
// 基本は押した順。並べ替えると 300m 以上短くなる時だけ、ボタンのそばに「並べ替えると約○km短くなります」（ユーザー確認済み）。

export type BuildPoint = {
  id: string;
  key: string; // 組み合わせのファイルの中の名前
  name: string;
  sub: string; // 種類（凛の地点は「凛の1日 n」）
  lat: number;
  lon: number;
  gq: string; // Google マップに渡す言葉
  color: string;
  cat: string;
  kind: MarkKind; // 店・凛の地点・アート・名所
};

const INK = '#1e1d1b';
const MUTE = '#78746c';
const PAPER = '#f2eee7';
const LINE = 'rgba(30,29,27,0.14)';
const SERIF = 'var(--font-playfair), "Didot", "Bodoni 72", Georgia, serif';
const SAVE_MIN = 300; // これ以上短くなる時だけ知らせる（メートル）

export default function RouteBuilderPanel({ points, visible, route, setRoute, leg, ready, ja, who, onToggle, onReset, rinIds }: {
  points: BuildPoint[];
  visible: BuildPoint[]; // 種類のスイッチで出している地点（名前から選ぶ）
  route: string[];
  setRoute: (r: string[]) => void;
  leg: (a: string, b: string) => Leg;
  ready: boolean; // 組み合わせの道を読み終えた
  ja: boolean;
  who: string;
  onToggle: (id: string) => void;
  onReset: () => void;
  rinIds: string[];
}) {
  const [listOpen, setListOpen] = useState(false);
  const byId = useMemo(() => new Map(points.map((p) => [p.id, p])), [points]);
  const stops = route.map((id) => byId.get(id)).filter(Boolean) as BuildPoint[];
  const legs = ready ? route.slice(1).map((id, k) => leg(route[k], id)) : [];
  const total = legs.reduce((v, l) => v + l.distance, 0);
  const estimate = legs.some((l) => l.estimate);
  const lengthOf = (r: string[]) => r.slice(1).reduce((v, id, k) => v + leg(r[k], id).distance, 0);
  const best = useMemo(() => (ready && route.length >= 3 ? shortestOrder(route, (a, b) => leg(a, b).distance) : route), [ready, route, leg]);
  const saving = ready && route.length >= 3 ? total - lengthOf(best) : 0;
  const sameOrder = best.every((id, k) => id === route[k]);
  const gmaps = stops.length >= 2 ? googleWalkUrl(stops.map((s) => s.gq)) : null;
  const minutes = (m: number) => mins((m / WALK_M_PER_MIN) * 60, ja);

  const btn = 'inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 px-4 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:cursor-default disabled:opacity-35';

  return (
    <div className="mt-4 flex flex-col gap-5" style={{ color: INK }}>
      {/* 選んだ順（番号・名前・外す）と、区間の距離 */}
      {stops.length === 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[14px] leading-relaxed" style={{ color: MUTE }}>
            {ja ? `まだ選んでいません。地図の丸を押すか、下の「名前から選ぶ」から。最大${MAX_STOPS}か所まで。` : `Nothing chosen yet. Tap the dots, or pick by name below. Up to ${MAX_STOPS} stops.`}
          </p>
          {rinIds.length > 1 && (
            <button type="button" onClick={() => setRoute(rinIds.slice(0, MAX_STOPS))} className={`${btn} self-start hover:bg-[rgba(30,29,27,0.06)]`} style={{ border: `1px solid ${LINE}` }}>
              {ja ? `${who}の1日の道から始める` : `Start from ${who}'s day`}
            </button>
          )}
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={ja ? '選んだ順' : 'Your route, in order'}>
          {stops.map((s, k) => (
            <li key={s.id} className="flex items-center gap-1">
              {k > 0 && (
                <span className="px-1 text-[10px] tabular-nums tracking-[0.12em]" style={{ color: legs[k - 1]?.estimate ? '#a0645c' : MUTE }}
                  title={legs[k - 1]?.estimate ? (ja ? 'まっすぐの線の目安' : 'straight-line estimate') : undefined}>
                  {legs[k - 1] ? `${legs[k - 1].estimate ? '≈' : ''}${legs[k - 1].distance < 1000 ? `${Math.round(legs[k - 1].distance / 10) * 10} m` : km(legs[k - 1].distance)}` : '…'} →
                </span>
              )}
              <span className="flex items-center gap-1.5 py-1 pl-1.5 pr-0.5" style={{ border: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.35)' }}>
                <span className="flex shrink-0 items-center justify-center text-[12px] leading-none tabular-nums" style={{ ...markStyle(s.kind, 20, s.color, true), color: PAPER, fontFamily: SERIF }}>{k + 1}</span>
                <span className="text-[13px]" style={{ fontFamily: SERIF }}>{s.name}</span>
                <button type="button" onClick={() => onToggle(s.id)} aria-label={ja ? `${s.name}を外す` : `Remove ${s.name}`}
                  className="flex h-[30px] w-[28px] cursor-pointer items-center justify-center text-[16px] leading-none" style={{ color: MUTE }}>×</button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* 合計 */}
      {stops.length >= 2 && (
        <p className="text-[13px] leading-relaxed tabular-nums" role="status">
          {ready
            ? (ja
              ? <>{stops.length}か所・歩いて約{km(total)}・{minutes(total)}<span style={{ color: MUTE }}>（分速80m・寄り道なし{estimate ? '・≈ の区間はまっすぐの線の目安' : ''}）</span></>
              : <>{stops.length} stops · about {km(total)} on foot · {minutes(total)}<span style={{ color: MUTE }}> (80 m a minute, no stops{estimate ? '; ≈ legs are straight-line estimates' : ''})</span></>)
            : <span style={{ color: MUTE }}>{ja ? '道を読みこんでいます…' : 'Loading the walking routes…'}</span>}
        </p>
      )}

      {/* 並べ替え・リセット・Google マップ */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!ready || route.length < 3 || sameOrder} onClick={() => setRoute(best)}
            className={`${btn} hover:bg-[rgba(30,29,27,0.06)]`} style={{ border: `1px solid ${INK}` }}>
            {ja ? '近い順に並べ替え' : 'Shortest order'}
          </button>
          <button type="button" disabled={!route.length} onClick={onReset} className={`${btn} hover:bg-[rgba(30,29,27,0.06)]`} style={{ border: `1px solid ${INK}` }}>
            {ja ? 'リセット' : 'Reset'}
          </button>
        </div>
        {saving >= SAVE_MIN && !sameOrder && (
          <p className="text-[12px] leading-snug" style={{ color: '#7a241e' }}>
            {ja ? `並べ替えると約${km(saving)}短くなります（最初の1か所はそのまま）` : `Reordering saves about ${km(saving)} (the first stop stays first)`}
          </p>
        )}
        <a href={gmaps ?? undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!gmaps}
          onClick={(e) => { if (!gmaps) e.preventDefault(); }}
          className={`${btn} md:ml-auto ${gmaps ? 'hover:bg-[rgba(30,29,27,0.06)]' : 'pointer-events-none opacity-35'}`}
          style={{ border: `1px solid ${INK}`, color: INK }}>
          {ja ? 'Google マップで、この順に開く' : 'Open this order in Google Maps'}&nbsp;↗
        </a>
      </div>
      {stops.length > 5 && (
        <p className="-mt-2 text-[11px] leading-relaxed" style={{ color: MUTE }}>
          {ja ? 'スマホのブラウザで開くと、途中の地点が減ることがあります。Google マップのアプリで開くと、全部の地点を通ります。' : 'In a phone browser Google Maps may drop some middle stops; the Google Maps app keeps them all.'}
        </p>
      )}

      {/* 名前から選ぶ（種類のスイッチで出している物だけ） */}
      <div>
        <button type="button" onClick={() => setListOpen((v) => !v)} aria-expanded={listOpen}
          className="min-h-[36px] cursor-pointer text-[10px] uppercase tracking-[0.3em] underline underline-offset-4" style={{ color: INK }}>
          {ja ? `名前から選ぶ（${visible.length}）` : `Pick by name (${visible.length})`} {listOpen ? '▴' : '▾'}
        </button>
        {listOpen && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {visible.map((p) => {
              const k = route.indexOf(p.id);
              const dim = k < 0 && route.length >= MAX_STOPS;
              return (
                <li key={p.id}>
                  <button type="button" aria-pressed={k >= 0} onClick={() => onToggle(p.id)}
                    className="flex min-h-[36px] cursor-pointer items-center gap-2 px-3 text-[13px]"
                    style={{ border: `1px solid ${k >= 0 ? INK : LINE}`, opacity: dim ? 0.4 : 1, fontFamily: SERIF }}>
                    {k >= 0
                      ? <span className="flex items-center justify-center text-[11px] leading-none" style={{ ...markStyle(p.kind, 18, p.color, true), color: PAPER }}>{k + 1}</span>
                      : <span className="block shrink-0" style={markStyle(p.kind, 9, p.color)} />}
                    {p.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
