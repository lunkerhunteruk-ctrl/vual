// 2026-11-11 試作：街のページ「自分でルートを組む」。地点どうしの歩く道（scripts/latitude-route-pairs.py が
// FOSSGIS OSRM の歩行者ルートで、すべての組み合わせを一度だけ計算して public/latitude/routes/<街>-pairs.json に保存した物）を読む。
// 見る人が押すたびに外の道の計算は呼ばない。計算できなかった組み合わせ・地点を直した後の組み合わせは、まっすぐの線（目安）にする。

export const WALK_M_PER_MIN = 80; // 歩く速さ（分速80m。不動産の表示と同じ）
export const MAX_STOPS = 10; // 選べる数（Google マップの道案内：出発＋途中8＋到着）

export type PairsFile = {
  points: [string, number, number][]; // [id, 緯度, 経度]
  pairs: Record<string, [number, string]>; // "i-j"（i<j）→ [メートル, i→j の polyline]
  failed: string[];
};

export type Leg = { distance: number; line: [number, number][]; estimate: boolean };
type LatLon = { id: string; key?: string; lat: number; lon: number }; // key：ファイルの中の名前（店の正式名・stop:番号）。無ければ id

// Google の polyline 形式（精度 1e-5）を [緯度, 経度] の列に
export function decodePolyline(s: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < s.length) {
    for (const k of [0, 1]) {
      let shift = 0, v = 0, b: number;
      do { b = s.charCodeAt(i++) - 63; v |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = v & 1 ? ~(v >> 1) : v >> 1;
      if (k === 0) lat += d; else lon += d;
    }
    out.push([lat / 1e5, lon / 1e5]);
  }
  return out;
}

export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371008.8, r = Math.PI / 180;
  const h = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// 読みこんだファイルと、ページの地点を合わせる。位置が変わった地点（店の位置を直した後など）は、その地点の組み合わせを使わない
export function makePairLookup(file: PairsFile | null, pts: LatLon[]) {
  const idx = new Map<string, number>();
  if (file) file.points.forEach(([id, la, lo], k) => {
    const p = pts.find((q) => (q.key ?? q.id) === id);
    if (p && Math.abs(p.lat - la) < 1e-5 && Math.abs(p.lon - lo) < 1e-5) idx.set(p.id, k);
  });
  const byId = new Map(pts.map((p) => [p.id, p]));
  const cache = new Map<string, Leg>();
  return (a: string, b: string): Leg => {
    const ck = `${a}\u0000${b}`;
    const hit = cache.get(ck);
    if (hit) return hit;
    const A = byId.get(a)!, B = byId.get(b)!;
    const ia = idx.get(a), ib = idx.get(b);
    let leg: Leg | null = null;
    if (file && ia !== undefined && ib !== undefined) {
      const v = file.pairs[ia < ib ? `${ia}-${ib}` : `${ib}-${ia}`];
      if (v) {
        const line = decodePolyline(v[1]);
        if (ia > ib) line.reverse();
        // 端は、ページの地点の位置にそろえる（polyline の丸めで 1m ほどずれるため）
        line[0] = [A.lat, A.lon];
        line[line.length - 1] = [B.lat, B.lon];
        leg = { distance: v[0], line, estimate: false };
      }
    }
    // 道が無い時は、まっすぐの線。距離は直線の1.3倍を目安にする（街の中の歩く道は、直線よりふつう2〜4割長い）
    if (!leg) leg = { distance: Math.round(haversine([A.lat, A.lon], [B.lat, B.lon]) * 1.3), line: [[A.lat, A.lon], [B.lat, B.lon]], estimate: true };
    cache.set(ck, leg);
    return leg;
  };
}

// 近い順に並べ替える：最初の1軒は固定、最後は決めない（行きっぱなしの道）。最も近い所へ順に → 2-opt で交差をほどく
export function shortestOrder(ids: string[], dist: (a: string, b: string) => number): string[] {
  if (ids.length <= 2) return ids.slice();
  const left = ids.slice(1);
  const order = [ids[0]];
  while (left.length) {
    const last = order[order.length - 1];
    let k = 0;
    for (let j = 1; j < left.length; j++) if (dist(last, left[j]) < dist(last, left[k])) k = j;
    order.push(left.splice(k, 1)[0]);
  }
  const n = order.length;
  let better = true;
  for (let round = 0; better && round < 50; round++) {
    better = false;
    for (let i = 1; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const before = dist(order[i - 1], order[i]) + (k + 1 < n ? dist(order[k], order[k + 1]) : 0);
        const after = dist(order[i - 1], order[k]) + (k + 1 < n ? dist(order[i], order[k + 1]) : 0);
        if (after < before - 0.5) {
          const seg = order.slice(i, k + 1).reverse();
          order.splice(i, seg.length, ...seg);
          better = true;
        }
      }
    }
  }
  return order;
}

// Google マップの歩きの道案内。q は地点の検索の言葉（店の名前＋住所）。https://developers.google.com/maps/documentation/urls/get-started#directions-action
export function googleWalkUrl(q: string[]) {
  const u = new URLSearchParams({ api: '1', origin: q[0], destination: q[q.length - 1], travelmode: 'walking' });
  if (q.length > 2) u.set('waypoints', q.slice(1, -1).join('|'));
  return `https://www.google.com/maps/dir/?${u.toString()}`;
}
