#!/usr/bin/env python3
"""2026-11-11 LATITUDE の街のページの「国の形の小さな位置の図」（components/latitude/CityLocator.tsx）の輪郭を作る。

Natural Earth 50m の国（vault.vual.jp outputs/latitude-magazine/geo/ne50.geojson）から、国コードで国を選び、
緯度の真ん中で縦横をそろえた正距円筒図法で幅 W の SVG の線にして lib/latitude-locator-shapes.ts に書く。
遠い小さな島は、範囲（clip）の外の形を落とす（例 日本は沖縄・小笠原を入れず、本州・北海道・四国・九州と近くの島）。
国を足す時は COUNTRIES に1行足して、もう一度回す：python3 scripts/latitude-locator.py <ne50.geojson>
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
W = 160
# 国コード → 範囲（西・南・東・北）
COUNTRIES = {
    'JP': (128.4, 30.8, 146.0, 45.6),
}

def rdp(pts, tol):
    if len(pts) < 3: return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0; L = math.hypot(dx, dy) or 1e-9
    i, dmax = 0, -1.0
    for k in range(1, len(pts) - 1):
        d = abs(dy * (pts[k][0] - x0) - dx * (pts[k][1] - y0)) / L
        if d > dmax: i, dmax = k, d
    if dmax <= tol: return [pts[0], pts[-1]]
    return rdp(pts[: i + 1], tol)[:-1] + rdp(pts[i:], tol)

def ring_area(p):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(p, p[1:] + p[:1]))) / 2

def main():
    src = json.load(open(sys.argv[1]))
    out = {}
    for code, (w, s, e, n) in COUNTRIES.items():
        f = next(x for x in src['features'] if x['properties'].get('ISO_A2') == code)
        kx = math.cos(math.radians((s + n) / 2))
        sc = W / ((e - w) * kx)
        H = round((n - s) * sc, 1)
        P = lambda lon, lat: ((lon - w) * kx * sc, (n - lat) * sc)
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        d = ''
        for poly in polys:
            ring = poly[0]
            if not any(w <= lon <= e and s <= lat <= n for lon, lat in ring): continue
            pts = [P(lon, lat) for lon, lat in ring]
            if ring_area(pts) < 0.6: continue  # 幅160で1px にも満たない島は落とす
            far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
            pts = rdp(pts[: far + 1], 0.25)[:-1] + rdp(pts[far:], 0.25)
            q = [(round(x, 1), round(y, 1)) for x, y in pts]
            d += f'M{q[0][0]} {q[0][1]}' + ''.join(f'L{x} {y}' for x, y in q[1:]) + 'Z'
        out[code] = {'w': W, 'h': H, 'west': w, 'north': n, 'kx': round(kx * sc, 4), 'ky': round(sc, 4), 'd': d}
    dst = ROOT / 'lib' / 'latitude-locator-shapes.ts'
    body = ',\n'.join(f"  {c}: {{ w: {v['w']}, h: {v['h']}, west: {v['west']}, north: {v['north']}, kx: {v['kx']}, ky: {v['ky']}, d: '{v['d']}' }}" for c, v in out.items())
    dst.write_text(
        '// 2026-11-11 国の形の小さな位置の図の輪郭（scripts/latitude-locator.py で作る。手で直さない）。\n'
        '// Natural Earth 50m（public domain）。x = (経度 - west) * kx、y = (north - 緯度) * ky。\n'
        'export type CountryShape = { w: number; h: number; west: number; north: number; kx: number; ky: number; d: string };\n'
        f'export const COUNTRY_SHAPES: Record<string, CountryShape> = {{\n{body},\n}};\n')
    print(dst, dst.stat().st_size, 'bytes', {c: v['h'] for c, v in out.items()})

if __name__ == '__main__':
    main()
