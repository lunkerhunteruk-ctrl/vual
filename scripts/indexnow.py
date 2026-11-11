#!/usr/bin/env python3
# 2026-10-30 IndexNow：LATITUDE の号を公開したら流す（Bing などへ「このページが新しくなった」と知らせる）。
# 使い方： python3 scripts/indexnow.py vienna           … その号・その人のページ・一覧を知らせる
#          python3 scripts/indexnow.py --all            … 公開中の全部の号と人のページ（初回や大きな直しの時）
#          python3 scripts/indexnow.py --url https://vual.jp/en/...  … 好きなページ
#          python3 scripts/indexnow.py --places nagasaki beppu  … 街の案内（その街の日英のページと、種類・地区のページ。本番の sitemap から拾う）
#          python3 scripts/indexnow.py --places               … 本番に出ている街の案内の全部（2026-11-11 街を本番に出したら必ず流す）
import json, os, re, sys, urllib.request
ROOT = os.path.join(os.path.dirname(__file__), '..')
KEY = re.search(r"INDEXNOW_KEY = '([0-9a-f]+)'", open(os.path.join(ROOT, 'lib', 'indexnow.ts')).read())[1]
src = open(os.path.join(ROOT, 'lib', 'latitude.ts'), encoding='utf-8').read()
issues = {}
for block in re.split(r"\n\s*slug: ", src)[1:]:
    slug = block.split("'")[1]
    if not re.search(r"\bno: \d+", block): continue
    person = re.search(r"person: '([a-z]+)'", block); pub = re.search(r"publishAt: '([^']+)'", block)
    # 公開予約の時刻が過ぎた号は公開中として扱う
    from datetime import datetime, timezone
    issues[slug] = dict(person=person[1] if person else None, scheduled=bool(pub) and datetime.fromisoformat(pub[1]) > datetime.now(timezone.utc))
B = 'https://vual.jp/en/latitude'
args = sys.argv[1:]
if not args: sys.exit(__doc__ or 'slug か --all か --url を渡す')
urls = []
if args[0] == '--url': urls = args[1:]
elif args[0] == '--places':
    sm = urllib.request.urlopen('https://vual.jp/sitemap.xml', timeout=30).read().decode()
    locs = re.findall(r'<loc>(https://vual\.jp/(?:en|ja)/latitude/places[^<]*)</loc>', sm)
    want = args[1:]
    if want:
        missing = [t for t in want if not any(re.search(rf'/latitude/places/{t}(/|$)', u) for u in locs)]
        if missing: sys.exit(f'本番の sitemap にまだ無い街: {missing}（本番に出て数分たってから流す）')
        urls = [u for u in locs if any(re.search(rf'/latitude/places/{t}(/|$)', u) for t in want)]
    else:
        urls = locs
    urls += ['https://vual.jp/en/latitude/places', 'https://vual.jp/ja/latitude/places', 'https://vual.jp/llms.txt']
elif args[0] == '--all':
    live = [s for s, v in issues.items() if not v['scheduled']]
    urls = [B] + [f'{B}/{s}' for s in live] + sorted({f'{B}/people/{issues[s]["person"]}' for s in live if issues[s]['person']})
else:
    for s in args:
        if s not in issues: sys.exit(f'その号は lib/latitude.ts にない: {s}')
        urls += [f'{B}/{s}'] + ([f'{B}/people/{issues[s]["person"]}'] if issues[s]['person'] else [])
    urls.append(B)
urls = list(dict.fromkeys(urls))
body = json.dumps({'host': 'vual.jp', 'key': KEY, 'keyLocation': f'https://vual.jp/{KEY}.txt', 'urlList': urls}).encode()
req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, headers={'Content-Type': 'application/json; charset=utf-8'})
try:
    with urllib.request.urlopen(req, timeout=30) as r: print('status', r.status)
except urllib.error.HTTPError as e: print('status', e.code, e.read()[:200])
for u in urls: print(' ', u)
