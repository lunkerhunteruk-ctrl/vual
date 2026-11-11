#!/usr/bin/env python3
"""2026-11-11 LATITUDE の街のページの「店の地図」（components/latitude/CityShopMap.tsx）の土台を作る。

OpenStreetMap のデータ（Overpass で取った JSON）から、道・川・水・線路・公園を、街の中心からのメートルの
SVG の線にして public/latitude/citymaps/<街>.json に書く（画面が開いてから読む）。外部の地図サービス（タイル・API キー）は使わない。
描き方は号のカルーセルの「動く地図」（vault.vual.jp docs/LATITUDE-ROUTE-MAP.md）と同じ：紙の地に灰の道・青灰の川・黒い線路。

使い方：
  python3 scripts/latitude-citymap.py kanazawa osm.json [osm2.json ...]
Overpass の問い合わせ（金沢の例。混んでいる時は https://overpass.kumi.systems/api/interpreter）：
  広い範囲（太い道・線路・川・水）と、店の多い真ん中（細い道・公園）と、離れた店のまわり（細い道）を、
  [out:json]; ( way["highway"~"^(motorway|trunk|primary|secondary|tertiary|..._link)$"](広い範囲); way["railway"="rail"](..);
  way["waterway"~"^(river|canal)$"](..); way["natural"="water"](..); relation["natural"="water"](..);
  way["highway"~"^(residential|unclassified|living_street|pedestrian|footway|steps|service)$"](真ん中);
  way["leisure"~"^(park|garden)$"]["name"](真ん中); way["historic"="castle"](真ん中); node["railway"="station"]["name"](真ん中); ); out geom;
"""
import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 街ごとの設定。center＝メートルの原点。home＝最初に見せる範囲（南・西・北・東）。labels＝地図の上に置く目印（店の名前は置かない）
CITIES = {
    'kanazawa': {
        'center': (36.565, 136.657),
        'home': (36.5535, 136.6455, 36.5795, 136.6695),
        'clip': (36.505, 136.615, 36.588, 136.692),  # これより外の線は描かない（離れた店・大額まで入る広さ）
        'labels': [
            {'ja': '金沢駅', 'en': 'Kanazawa Sta.', 'station': '金沢'},
            {'ja': '金沢城公園', 'en': 'Castle Park', 'park': '金沢城公園'},
            {'ja': '兼六園', 'en': 'Kenrokuen', 'park': '兼六園'},
            {'ja': '浅野川', 'en': 'Asano River', 'river': '浅野川', 'near': (36.5735, 136.6625), 'kind': 'water'},
            {'ja': '犀川', 'en': 'Sai River', 'river': '犀川', 'near': (36.5545, 136.6535), 'kind': 'water'},
        ],
        'rivers': ('犀川', '浅野川'),  # 太い線で描く川（ほかの川・用水は細い線）
    },
    # 2026-11-11 盛岡：駅（西）〜材木町（北西）〜紺屋町（東）の店が入る広さ。home は駅から紺屋町・岩手公園まで
    'morioka': {
        'center': (39.702, 141.148),
        'home': (39.6935, 141.1305, 39.7105, 141.1640),
        'clip': (39.67, 141.105, 39.735, 141.195),
        'labels': [
            {'ja': '盛岡駅', 'en': 'Morioka Sta.', 'station': '盛岡', 'at': (39.70150, 141.13655)},
            {'ja': '岩手公園', 'en': 'Castle Park', 'park': '岩手公園'},
            {'ja': '北上川', 'en': 'Kitakami River', 'river': '北上川', 'near': (39.7048, 141.1455), 'kind': 'water'},
            {'ja': '中津川', 'en': 'Nakatsu River', 'river': '中津川', 'near': (39.7040, 141.1530), 'kind': 'water'},
        ],
        'rivers': ('北上川', '中津川'),
    },
}

# 2026-11-11 号のない町（scripts/latitude-import-city.py が足す）の設定は scripts/latitude-citymap-towns.json。
# 形は集めた時の config.json と同じ（center・home・clip は [南, 西, 北, 東]、labels は {ja, en, at}、mainRivers は太く描く川）。
# 川の名前の目印（「〜川」）は水の色の字にする
TOWNS = Path(__file__).resolve().parent / 'latitude-citymap-towns.json'
if TOWNS.exists():
    for _slug, _c in json.loads(TOWNS.read_text()).items():
        CITIES.setdefault(_slug, {
            'center': tuple(_c['center']), 'home': tuple(_c['home']), 'clip': tuple(_c['clip']),
            'labels': [{'ja': L['ja'], 'en': L['en'], 'at': tuple(L['at']), **({'kind': 'water'} if L['ja'].endswith('川') else {})} for L in _c.get('labels', [])],
            'rivers': tuple(_c.get('mainRivers', [])),
        })

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

def join_rings(segs):
    """multipolygon の外側の線は、何本かに分かれている事がある。端がつながる物をつないで、閉じた輪にして返す（閉じない物は返さない）"""
    key = lambda p: (p['lat'], p['lon'])
    chains = [list(s) for s in segs if len(s) >= 2]
    rings = []
    while chains:
        cur = chains.pop()
        while key(cur[0]) != key(cur[-1]):
            hit = None
            for i, c in enumerate(chains):
                if key(c[0]) == key(cur[-1]): hit = (i, c)
                elif key(c[-1]) == key(cur[-1]): hit = (i, c[::-1])
                elif key(c[-1]) == key(cur[0]): hit = (i, c, 'pre')
                elif key(c[0]) == key(cur[0]): hit = (i, c[::-1], 'pre')
                if hit: break
            if not hit: break
            chains.pop(hit[0])
            cur = hit[1] + cur[1:] if len(hit) == 3 else cur + hit[1][1:]
        if key(cur[0]) == key(cur[-1]) and len(cur) > 3: rings.append(cur)
    return rings

def main():
    slug, files = sys.argv[1], sys.argv[2:]
    cfg = CITIES[slug]
    lat0, lon0 = cfg['center']
    KX = 111320 * math.cos(math.radians(lat0)); KY = 110574
    P = lambda lat, lon: ((lon - lon0) * KX, (lat0 - lat) * KY)
    els, seen = [], set()
    for f in files:
        for e in json.load(open(f))['elements']:
            k = (e['type'], e['id'])
            if k in seen: continue
            seen.add(k); els.append(e)
    # coast：海岸線（2026-11-11 萩・函館のような海の町。線だけで、海は塗らない）
    layers = {k: [] for k in ('water', 'park', 'river', 'stream', 'path', 'minor', 'major', 'rail', 'coast')}
    tol = {'water': 3, 'park': 3, 'river': 3, 'stream': 3, 'path': 2, 'minor': 1.5, 'major': 2.5, 'rail': 3, 'coast': 3}

    cs, cw, cn, ce = cfg['clip']
    def add(layer, geom, closed=False):
        if not any(cs <= p['lat'] <= cn and cw <= p['lon'] <= ce for p in geom if p): return
        pts = [P(p['lat'], p['lon']) for p in geom if p]
        if len(pts) < 2: return
        if closed or pts[0] == pts[-1]:
            # 閉じた形は、始まりと終わりが同じ点なので、いちばん遠い点で2つに分けてから単純化する
            far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
            pts = rdp(pts[: far + 1], tol[layer])[:-1] + rdp(pts[far:], tol[layer]) if 0 < far < len(pts) - 1 else pts
        else:
            pts = rdp(pts, tol[layer])
        q = [(round(x), round(y)) for x, y in pts]
        s = f'M{q[0][0]} {q[0][1]}' + ''.join(f'l{b[0]-a[0]} {b[1]-a[1]}' for a, b in zip(q, q[1:]) if b != a)
        layers[layer].append(s + ('z' if closed else ''))

    def area(geom):
        pts = [P(p['lat'], p['lon']) for p in geom]
        return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(pts, pts[1:] + pts[:1]))) / 2

    parks, rivers, stations = {}, {}, {}
    for e in els:
        t = e.get('tags', {}); g = e.get('geometry')
        if e['type'] == 'node':
            if t.get('railway') == 'station': stations[t.get('name')] = P(e['lat'], e['lon'])
            continue
        if e['type'] == 'relation':
            if t.get('natural') == 'water' or t.get('waterway') == 'riverbank':
                for ring in join_rings([m['geometry'] for m in e.get('members', []) if m.get('role') == 'outer' and m.get('geometry')]):
                    add('water', ring, True)
            continue
        if not g: continue
        hw = t.get('highway')
        if t.get('natural') == 'coastline': add('coast', g)
        elif (t.get('natural') == 'water' or t.get('waterway') == 'riverbank') and len(g) > 3 and (g[0]['lat'], g[0]['lon']) == (g[-1]['lat'], g[-1]['lon']): add('water', g, True)
        elif t.get('waterway') in ('river', 'canal'):
            add('river' if t.get('waterway') == 'river' and t.get('name') in cfg['rivers'] else 'stream', g)
            rivers.setdefault(t.get('name'), []).extend(P(p['lat'], p['lon']) for p in g)
        elif t.get('leisure') in ('park', 'garden') or t.get('historic') == 'castle':
            a = area(g)
            if t.get('name'):
                xs = [P(p['lat'], p['lon']) for p in g]
                parks[t['name']] = (sum(x for x, _ in xs) / len(xs), sum(y for _, y in xs) / len(xs), a)
            if a > 15000: add('park', g, True)
        elif t.get('railway') == 'rail' and not t.get('service'): add('rail', g)
        elif hw in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link'): add('major', g)
        elif hw in ('residential', 'unclassified', 'living_street'): add('minor', g)
        elif hw == 'service' and t.get('service') not in ('parking_aisle', 'driveway', 'drive-through'): add('minor', g)
        elif hw in ('pedestrian', 'footway', 'steps'): add('path', g)

    labels = []
    for L in cfg['labels']:
        if 'at' in L: x, y = P(*L['at'])  # 駅の点が1つに決まらない街は、位置を直接書く
        elif 'station' in L: x, y = stations[L['station']]
        elif 'park' in L: x, y, _ = parks[L['park']]
        else:
            nx, ny = P(*L['near'])
            x, y = min(rivers[L['river']], key=lambda p: (p[0] - nx) ** 2 + (p[1] - ny) ** 2)
        labels.append({'x': round(x), 'y': round(y), 'ja': L['ja'], 'en': L['en'], **({'kind': L['kind']} if 'kind' in L else {})})

    s, w, n, e = cfg['home']
    hx0, hy0 = P(n, w); hx1, hy1 = P(s, e)
    out = {
        'note': 'Generated by scripts/latitude-citymap.py from OpenStreetMap data (© OpenStreetMap contributors, ODbL). Units: metres from center; y points south.',
        'center': [lat0, lon0],
        'k': [round(KX, 3), KY],
        'home': [round(hx0), round(hy0), round(hx1 - hx0), round(hy1 - hy0)],
        'labels': labels,
        'layers': {k: ''.join(v) for k, v in layers.items() if v or k != 'coast'},
    }
    dst = ROOT / 'public' / 'latitude' / 'citymaps' / f'{slug}.json'  # 画面で fetch する（ページの HTML に入れると重いため）
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    print(dst, f'{dst.stat().st_size / 1024:.0f} KB', {k: f'{len(v) / 1024:.0f}KB' for k, v in out['layers'].items()})

if __name__ == '__main__':
    main()
