#!/usr/bin/env python3
"""LATITUDE の街のページ「自分でルートを組む」の、地点どうしの歩く道を、すべての組み合わせで先に計算しておく（2026-11-11）。

見る人が店を押すたびに外の道の計算を呼ばないため（無料の計算の仕組みを大量に使わない）、町ごとに一度だけ回して保存する。
ページ（components/latitude/CityRouteBuilder.tsx）は、2軒以上選ばれた時に初めてこのファイルを読む。

地点：店（lib/latitude-places/<街>.json の coords）＋ 凛の1日の地点（lib/latitude-routes/<街>.json の stops）。
計算：FOSSGIS の OSRM（歩行者 routed-foot。https://routing.openstreetmap.de/）。地図データ © OpenStreetMap contributors。
  1回ずつ間を1秒あけ、User-Agent を付ける。歩きの道は行きと帰りでほぼ同じなので、組み合わせ（順番なし）ごとに1回だけ。
線：地点の印から道の線へまっすぐつなぎ、3m 単位で単純化（Ramer–Douglas–Peucker）して、Google の polyline 形式（精度 1e-5）で詰める。
計算できなかった組み合わせは failed に入れる（ページではまっすぐの点線で「目安」と出す）。

使い方：
  python3 scripts/latitude-route-pairs.py kanazawa
  → public/latitude/routes/kanazawa-pairs.json
  返事は ~/.cache/latitude-route-pairs/<街>.json にためる（止めても続きから。同じ地点で二度叩かない）
  --tol 3   単純化の許容（メートル）
  --sleep 1 1回ごとの間（秒）
"""
import argparse, datetime, json, math, subprocess, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/driving/'
UA = 'LATITUDE-route/1.0 (vual.jp; precomputed once per town)'


def rdp(pts, tol):
    """Ramer–Douglas–Peucker。pts は [(x, y)]（メートル）。残す番号を返す"""
    if len(pts) < 3:
        return list(range(len(pts)))
    keep = {0, len(pts) - 1}
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (x0, y0), (x1, y1) = pts[a], pts[b]
        dx, dy = x1 - x0, y1 - y0
        L = math.hypot(dx, dy) or 1e-9
        i, dmax = -1, -1.0
        for k in range(a + 1, b):
            d = abs(dy * (pts[k][0] - x0) - dx * (pts[k][1] - y0)) / L
            if d > dmax:
                i, dmax = k, d
        if dmax > tol:
            keep.add(i)
            stack += [(a, i), (i, b)]
    return sorted(keep)


def encode(line):
    """Google の polyline 形式（精度 1e-5）。line は [(lat, lon)]"""
    out, plat, plon = [], 0, 0
    for lat, lon in line:
        ilat, ilon = round(lat * 1e5), round(lon * 1e5)
        for v in (ilat - plat, ilon - plon):
            v = ~(v << 1) if v < 0 else v << 1
            while v >= 0x20:
                out.append(chr((0x20 | (v & 0x1f)) + 63))
                v >>= 5
            out.append(chr(v + 63))
        plat, plon = ilat, ilon
    return ''.join(out)


def haversine(a, b):
    R = 6371008.8
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def fetch(a, b, tries=3):
    # 通信は curl で（macOS の古い Python の SSL では、この計算の仕組みにつながらないため）
    url = f'{OSRM}{a[1]},{a[0]};{b[1]},{b[0]}?overview=full&geometries=geojson'
    err = ''
    for k in range(tries):
        try:
            raw = subprocess.run(['curl', '-sS', '-m', '60', '-A', UA, url], capture_output=True, text=True, check=True).stdout
            d = json.loads(raw)
            if d.get('code') == 'Ok' and d.get('routes'):
                rt = d['routes'][0]
                return {'distance': rt['distance'], 'coords': rt['geometry']['coordinates']}
            return {'error': d.get('code', 'unknown')}
        except Exception as e:  # 通信の失敗は少し待って、もう一度
            err = str(e)[:200]
            time.sleep(3 * (k + 1))
    return {'error': err}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--tol', type=float, default=3.0)
    ap.add_argument('--sleep', type=float, default=1.0)
    a = ap.parse_args()

    shops = json.load(open(ROOT / 'lib' / 'latitude-places' / f'{a.slug}.json'))
    points = [{'id': s['name'], 'lat': s['coords'][0], 'lon': s['coords'][1]} for s in shops if s.get('coords')]
    walk = ROOT / 'lib' / 'latitude-routes' / f'{a.slug}.json'
    if walk.exists():
        for k, (lat, lon) in enumerate(json.load(open(walk))['stops']):
            points.append({'id': f'stop:{k + 1}', 'lat': lat, 'lon': lon})
    n = len(points)
    print(f'{a.slug}: {n} points, {n * (n - 1) // 2} pairs', flush=True)

    cache_path = Path.home() / '.cache' / 'latitude-route-pairs' / f'{a.slug}.json'
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache = json.load(open(cache_path)) if cache_path.exists() else {}

    lat0 = sum(p['lat'] for p in points) / n
    KX, KY = 111320 * math.cos(math.radians(lat0)), 110574
    pairs, failed, calls = {}, [], 0
    for i in range(n):
        for j in range(i + 1, n):
            A, B = (points[i]['lat'], points[i]['lon']), (points[j]['lat'], points[j]['lon'])
            key = f'{i}-{j}'
            if haversine(A, B) < 1:  # 同じ場所（凛の地点と同じ所にある店など）
                pairs[key] = [0, encode([A, B])]
                continue
            ck = f'{A[0]},{A[1]}|{B[0]},{B[1]}'
            r = cache.get(ck)
            if r is None or 'error' in r:
                r = fetch(A, B)
                calls += 1
                cache[ck] = r
                if calls % 20 == 0:
                    cache_path.write_text(json.dumps(cache))
                    print(f'  {calls} calls … {key}', flush=True)
                time.sleep(a.sleep)
            if 'error' in r:
                failed.append(key)
                continue
            line = [A] + [(lat, lon) for lon, lat in r['coords']] + [B]
            xy = [((lon - A[1]) * KX, (A[0] - lat) * KY) for lat, lon in line]
            keep = rdp(xy, a.tol)
            pts = [line[k] for k in keep]
            # 印から道までのまっすぐの所も距離に足す（OSRM の距離は道に寄せた位置から）
            extra = haversine(A, line[1]) + haversine(line[-2], B)
            pairs[key] = [round(r['distance'] + extra), encode(pts)]
    cache_path.write_text(json.dumps(cache))

    out = {
        'note': 'Walking routes between every pair of points (shops and the stops of the traveller\'s day), for the '
                '"build your own route" map. Computed once with the FOSSGIS OSRM foot profile (routing.openstreetmap.de) '
                'on OpenStreetMap data (© OpenStreetMap contributors, ODbL). Unordered pairs "i-j" (i<j) index into points; '
                'value is [metres, Google encoded polyline (1e-5) from i to j]. Simplified with Ramer–Douglas–Peucker. '
                'Generated by scripts/latitude-route-pairs.py.',
        'source': 'FOSSGIS OSRM routed-foot (OpenStreetMap)',
        'computed': datetime.date.today().isoformat(),
        'tolerance_m': a.tol,
        'points': [[p['id'], p['lat'], p['lon']] for p in points],
        'pairs': pairs,
        'failed': failed,
    }
    dst = ROOT / 'public' / 'latitude' / 'routes' / f'{a.slug}-pairs.json'
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{dst}  {len(pairs)} pairs  {len(failed)} failed  {calls} calls  {dst.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
