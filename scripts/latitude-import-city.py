#!/usr/bin/env python3
"""2026-11-11 LATITUDE の「街の案内」を、すでに集めて確かめた町から足す（金沢・盛岡と同じ形）。

元のデータ（読むだけ・書き換えない。--src で場所を変えられる。既定 /tmp/claude-501）：
  city-shops5/<町>/PLACES.json        店の一覧と説明（category・industry・area・address・url・whatJa・whatEn・factsForNote …）と industries
  city-shops5/<町>/VERIFY-sonnet.json 2026年の営業の確かめ（verdict keep／doubt・openedUrl・quote・fixes）。サイトに出すのは keep だけ
  city-maps/<町>/geo.json             店の位置（coords）
  city-maps/<町>/config.json          地図の範囲（center・home・clip・labels・mainRivers・latLabel・nameEn・nameJa）
  city-maps/<町>/osm*.json            地図の土台の OpenStreetMap の線（--map の時だけ使う）

編集の文（凛の一言・何の店か・英語の名前・地区・紹介文・見る所）は data/latitude-import/<町>.json に書く。
元のデータから作れない物（凛の一言など）は、ここに人（か編集の担当）が書く。この台本は文を作らない。

使い方（町を足すたびに同じ手順）：
  1. python3 scripts/latitude-import-city.py <町> --skeleton
       → data/latitude-import/<町>.json の下書き（keep の店ごとの欄・元の説明と確かめの直し _src・町の欄）。すでにある文は消さない
  2. data/latitude-import/<町>.json を埋める（note/noteEn・what/whatEn・nameEn・地区・tags・city の紹介文・locator・industries の about・sights）
       _src は参考（出力には入らない）。url を null にすると公式サイトの欄を出さない（記事・まとめ・予約サイトしか無い店）
  3. python3 scripts/latitude-import-city.py <町> --map --pairs
       → lib/latitude-places/<町>.json（keep の店だけ）・lib/latitude-sights/<町>.json・lib/latitude-places-imported.ts（CITIES に足す分）
         --map  ：scripts/latitude-citymap-towns.json に地図の設定を書き、scripts/latitude-citymap.py で public/latitude/citymaps/<町>.json
         --pairs：scripts/latitude-route-pairs.py で店・見る所どうしの歩く道（public/latitude/routes/<町>-pairs.json。数分かかる）
     欄が足りない時は書き出さずに止まり、足りない所を並べる。

号のない町なので、凛の1日の段（映像・点線）は出ない。ページは「凛のおすすめ」までで、訪ねたとは書かない。
"""
import argparse, datetime, json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDIT_DIR = ROOT / 'data' / 'latitude-import'
TOWNS_CFG = ROOT / 'scripts' / 'latitude-citymap-towns.json'
GEN_TS = ROOT / 'lib' / 'latitude-places-imported.ts'

# 元の種類 → サイトの5つの種類（＋細かい違いの tags）
CATEGORY = {
    'local': ('local', []), 'craft': ('craft', []), 'wear': ('wear', []), 'sweets': ('sweets', []), 'food': ('food', []),
    'coffee': ('cafe', ['coffee']), 'matcha': ('cafe', ['matcha']), 'cafe': ('cafe', []),
}
PLACE_KEYS = ['name', 'nameEn', 'category', 'industry', 'tags', 'area', 'areaEn', 'address', 'url', 'instagram',
              'what', 'whatEn', 'note', 'noteEn', 'verifiedAt', 'coords', 'coordsApprox']
SIGHT_KEYS = ['name', 'nameEn', 'kind', 'area', 'areaEn', 'address', 'url', 'what', 'whatEn', 'coords', 'notice', 'noticeEn', 'verifiedAt']
NEED_PLACE = ['nameEn', 'area', 'areaEn', 'what', 'whatEn', 'note', 'noteEn']
NEED_CITY = ['name', 'nameJa', 'latitude', 'country', 'countryJa', 'intro', 'introJa', 'coords']
PREF = re.compile(r'^(北海道|東京都|大阪府|京都府|.{2,3}県)')


def load(p):
    return json.loads(Path(p).read_text())


def sources(src, slug):
    shop = src / 'city-shops5' / slug
    m = src / 'city-maps' / slug
    places = load(shop / 'PLACES.json')
    vpath = shop / 'VERIFY-sonnet.json'
    verify = {x['name']: x for x in load(vpath)['checked']}
    geo = {x['name']: x for x in load(m / 'geo.json')['places']} if (m / 'geo.json').exists() else {}
    cfg = load(m / 'config.json') if (m / 'config.json').exists() else {}
    # 確かめた日＝営業の確かめ（VERIFY-sonnet.json）を書いた日
    checked = datetime.date.fromtimestamp(vpath.stat().st_mtime).isoformat()
    return places, verify, geo, cfg, checked, m


def split(places, verify):
    keep, drop = [], []
    for x in places['places']:
        v = verify.get(x['name'])
        (keep if v and v.get('verdict') == 'keep' else drop).append((x, v))
    return keep, drop


def skeleton(slug, src):
    places, verify, geo, cfg, checked, _ = sources(src, slug)
    keep, drop = split(places, verify)
    path = EDIT_DIR / f'{slug}.json'
    ed = load(path) if path.exists() else {}
    ed.setdefault('slug', slug)
    city = ed.setdefault('city', {})
    lat = cfg.get('center', [None])[0]
    for k, v in {
        'name': cfg.get('nameEn', ''), 'nameJa': cfg.get('nameJa', ''), 'latitude': cfg.get('latLabel', ''),
        'country': '', 'countryJa': '', 'person': 'rin', 'coords': cfg.get('center'),
        'intro': '', 'introJa': '', 'locator': {'en': '', 'ja': ''},
    }.items():
        city.setdefault(k, v)
    have = {i['key'] for i in city.get('industries', [])}
    used = {x.get('industry') for x, _ in keep if x.get('category') == 'local'}
    inds = city.setdefault('industries', [])
    for i in places.get('industries', []):
        if i['key'] in have or i['key'] not in used:  # keep の店が無い産業は出さない（題に入るため）
            continue
        inds.append({'key': i['key'], 'en': i['en'], 'ja': i['ja'], 'about': '', 'aboutJa': '', '_src': i.get('why', '')})
    pe = ed.setdefault('places', {})
    for x, v in keep:
        e = pe.setdefault(x['name'], {})
        for k, d in {'nameEn': '', 'area': x.get('areaJa', ''), 'areaEn': x.get('area', ''), 'tags': CATEGORY[x['category']][1],
                     'what': '', 'whatEn': '', 'note': '', 'noteEn': ''}.items():
            e.setdefault(k, d)
        e['_src'] = {
            'category': x['category'], 'industry': x.get('industry'), 'nameKana': x.get('nameKana'), 'address': x.get('address'),
            'url': x.get('url'), 'whatJa': x.get('whatJa'), 'whatEn': x.get('whatEn'), 'facts': x.get('factsForNote'),
            'weak': x.get('weakPoints'), 'verifiedBy': v.get('openedUrl'), 'quote': v.get('quote'), 'fixes': v.get('fixes'),
            'coords': geo.get(x['name'], {}).get('coords'),
        }
    ed.setdefault('sights', [])
    ed['_dropped'] = [{'name': x['name'], 'verdict': (v or {}).get('verdict'), 'reason': (v or {}).get('reason', '')} for x, v in drop]
    EDIT_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(ed, ensure_ascii=False, indent=1) + '\n')
    print(f'{path}  keep {len(keep)}  doubt/dropped {len(drop)}  (checked {checked})')


def build(slug, src):
    places, verify, geo, cfg, checked, mapdir = sources(src, slug)
    keep, drop = split(places, verify)
    ed = load(EDIT_DIR / f'{slug}.json')
    pe, city = ed.get('places', {}), ed.get('city', {})
    missing = [f'city.{k}' for k in NEED_CITY if not city.get(k)]
    if not (city.get('locator') or {}).get('ja'):
        missing.append('city.locator')
    out = []
    for x, v in keep:
        e = pe.get(x['name'])
        if e is None:
            missing.append(f'places["{x["name"]}"]（--skeleton で欄を作る）')
            continue
        missing += [f'places["{x["name"]}"].{k}' for k in NEED_PLACE if not e.get(k)]
        cat, tags = CATEGORY[x['category']]
        cat = e.get('category', cat)
        p = {
            'name': e.get('name', x['name']),
            'nameEn': e.get('nameEn'),
            'category': cat,
            'industry': e.get('industry', x.get('industry')) if cat == 'local' else None,
            'tags': e.get('tags', tags) or None,
            'area': e.get('area'), 'areaEn': e.get('areaEn'),
            # 住所は県名を外す（金沢・盛岡と同じ）。確かめで直した住所は編集の欄の address
            'address': e.get('address') or PREF.sub('', x.get('address', '')),
            'url': e['url'] if 'url' in e else x.get('url'),
            'instagram': e.get('instagram'),
            'what': e.get('what'), 'whatEn': e.get('whatEn'), 'note': e.get('note'), 'noteEn': e.get('noteEn'),
            'verifiedAt': e.get('verifiedAt', checked),
            'coords': e.get('coords') or geo.get(x['name'], {}).get('coords'),
            'coordsApprox': e.get('coordsApprox'),
        }
        out.append({k: p[k] for k in PLACE_KEYS if p.get(k) not in (None, '', [])})
    for i in city.get('industries', []):
        if not i.get('about') or not i.get('aboutJa'):
            missing.append(f'city.industries[{i["key"]}].about/aboutJa')
    sights = []
    for s in ed.get('sights', []):
        miss = [k for k in ('name', 'nameEn', 'kind', 'area', 'areaEn', 'address', 'url', 'what', 'whatEn', 'coords', 'verifiedAt') if not s.get(k)]
        if miss:
            missing.append(f'sights["{s.get("name")}"].{",".join(miss)}')
        sights.append({k: s[k] for k in SIGHT_KEYS if s.get(k)})
    if missing:
        print('欄が足りないので書き出していません：\n  ' + '\n  '.join(missing), file=sys.stderr)
        sys.exit(1)
    known = {i['key'] for i in city.get('industries', [])}
    bad = [p['name'] for p in out if p['category'] == 'local' and p.get('industry') not in known]
    if bad:
        print(f'industry が city.industries に無い店：{bad}', file=sys.stderr)
        sys.exit(1)

    for d, data in ((ROOT / 'lib' / 'latitude-places', out), (ROOT / 'lib' / 'latitude-sights', sights)):
        d.mkdir(parents=True, exist_ok=True)
        (d / f'{slug}.json').write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    print(f'lib/latitude-places/{slug}.json  {len(out)} places (keep)  · {len(drop)} not kept: {[x["name"] for x, _ in drop]}')
    print(f'lib/latitude-sights/{slug}.json  {len(sights)} sights')

    # 地図の土台の設定（scripts/latitude-citymap.py が読む）
    if cfg:
        towns = load(TOWNS_CFG) if TOWNS_CFG.exists() else {}
        towns[slug] = {k: cfg[k] for k in ('nameEn', 'nameJa', 'center', 'home', 'clip', 'mainRivers', 'labels') if k in cfg}
        TOWNS_CFG.write_text(json.dumps(dict(sorted(towns.items())), ensure_ascii=False, indent=1) + '\n')
    write_ts()
    return mapdir


def write_ts():
    """data/latitude-import/*.json の町を、lib/latitude-places-imported.ts（CITIES に足す分）に書く"""
    towns = []
    for p in sorted(EDIT_DIR.glob('*.json')):
        ed = load(p)
        slug = ed['slug']
        if not (ROOT / 'lib' / 'latitude-places' / f'{slug}.json').exists():
            continue
        towns.append(ed)
    var = lambda s: re.sub(r'[^A-Za-z0-9]', '_', s)
    lines = [
        '// 自動で作るファイル（scripts/latitude-import-city.py）。手で直さない：文は data/latitude-import/<町>.json を直して、台本を回し直す。',
        '// 号のない町の「街の案内」。店は編集部が2026年の営業を確かめた物（keep）だけ。凛のおすすめで、凛が訪ねたとは書かない。',
        "import type { CityPlace, CitySight, LatitudeCity } from './latitude-places';",
    ]
    for t in towns:
        s = t['slug']
        lines.append(f"import {var(s)}Places from './latitude-places/{s}.json';")
        lines.append(f"import {var(s)}Sights from './latitude-sights/{s}.json';")
    lines.append('')
    lines.append('export const IMPORTED_CITIES: LatitudeCity[] = [')
    for t in towns:
        s, c = t['slug'], t['city']
        meta = {
            'slug': s, 'name': c['name'], 'nameJa': c['nameJa'], 'latitude': c['latitude'], 'country': c['country'], 'countryJa': c['countryJa'],
            **({'countryCode': c['countryCode']} if c.get('countryCode') else {}),
            'person': c.get('person', 'rin'), 'coords': c['coords'], 'intro': c['intro'], 'introJa': c['introJa'],
            'images': [], 'locator': c['locator'],
            **({'issue': c['issue']} if c.get('issue') else {}),   # 2026-11-12 号のある町（鳥取）：号へのリンク
            **({'route': c['route']} if c.get('route') else {}),   # 凛の1日の回り方（lib/latitude-places.ts の route と同じ形）
            'industries': [{k: i[k] for k in ('key', 'en', 'ja', 'about', 'aboutJa')} for i in c.get('industries', [])],
            'shopMap': (ROOT / 'public' / 'latitude' / 'citymaps' / f'{s}.json').exists(),
            'routeBuilder': (ROOT / 'public' / 'latitude' / 'routes' / f'{s}-pairs.json').exists(),
        }
        js = lambda v: json.dumps(v, ensure_ascii=False)
        lines.append('  {')
        for k, v in meta.items():
            if k == 'industries':
                lines.append('    industries: [')
                lines += [f'      {js(i)},' for i in v]
                lines.append('    ],')
            else:
                lines.append(f'    {k}: {js(v)},')
        lines.append(f'    places: {var(s)}Places as CityPlace[],')
        lines.append(f'    sights: {var(s)}Sights as CitySight[],')
        lines.append('  },')
    lines.append('];')
    GEN_TS.write_text('\n'.join(lines) + '\n')
    print(f'{GEN_TS.relative_to(ROOT)}  {len(towns)} towns: {[t["slug"] for t in towns]}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--src', default='/tmp/claude-501')
    ap.add_argument('--skeleton', action='store_true')
    ap.add_argument('--map', action='store_true')
    ap.add_argument('--pairs', action='store_true')
    a = ap.parse_args()
    src = Path(a.src)
    if a.skeleton:
        skeleton(a.slug, src)
        return
    mapdir = build(a.slug, src)
    if a.map:
        osm = sorted(str(p) for p in mapdir.glob('osm*.json'))
        if not osm:
            sys.exit(f'{mapdir} に osm*.json がありません')
        subprocess.run([sys.executable, str(ROOT / 'scripts' / 'latitude-citymap.py'), a.slug, *osm], check=True)
    if a.pairs:
        subprocess.run([sys.executable, str(ROOT / 'scripts' / 'latitude-route-pairs.py'), a.slug], check=True)
    if a.map or a.pairs:
        write_ts()  # shopMap・routeBuilder を、できたファイルに合わせる


if __name__ == '__main__':
    main()
