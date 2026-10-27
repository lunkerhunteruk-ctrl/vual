#!/usr/bin/env python3
# LATITUDE のリンクの見え方の画像（2026-10-27）：LINE・SNS で送った時に出る 1200×630。
#   号ごと  public/latitude/<slug>/og.jpg … 左にその号の1ページ目（3:4）、右に紙の色で「LATITUDE · No. 06」・大きな緯度・街・号の一行
#   一覧    public/latitude/og.jpg        … 左に新しい2号の表紙、右に LATITUDE の題と「A travelling issue by VUAL」
# 誌面と同じ紙・墨・灰と、細い明朝体（Didot）。号を足したら、もう一度これを流す。 使い方：python3 scripts/latitude-og.py
import os, re, textwrap
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.join(os.path.dirname(__file__), '..')
PUB = os.path.join(ROOT, 'public', 'latitude')
PAPER, INK, MUTE = (242, 238, 231), (30, 29, 27), (120, 116, 108)
DIDOT, SANS = '/System/Library/Fonts/Supplemental/Didot.ttc', '/System/Library/Fonts/HelveticaNeue.ttc'
W, H = 1200, 630
def serif(sz, italic=False): return ImageFont.truetype(DIDOT, sz, index=1 if italic else 0)
def sans(sz): return ImageFont.truetype(SANS, sz)
def spaced(d, xy, text, f, fill, gap):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill); x += d.textlength(ch, font=f) + gap
    return x
def fill(path, w, h):
    im = Image.open(path).convert('RGB'); r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

# 号の一覧は lib/latitude.ts から読む（公開中の号・番号・緯度・街・一行）
src = open(os.path.join(ROOT, 'lib', 'latitude.ts'), encoding='utf-8').read()
issues = []
for block in re.split(r"\n\s*slug: ", src)[1:]:
    g = lambda k: (re.search(k + r": '((?:[^'\\]|\\.)*)'", block) or [None, None])[1]
    no = re.search(r"\bno: (\d+)", block)
    slug = block.split("'")[1]
    if not no or not os.path.exists(os.path.join(PUB, slug, 'pages', '01.jpg')): continue
    future = g('publishAt') and g('publishAt') > __import__('datetime').datetime.utcnow().isoformat()
    issues.append(dict(slug=slug, no=int(no[1]), lat=g('latitude'), city=g('city'), line=g('line').replace("\\'", "'"), live=not future))
issues.sort(key=lambda i: -i['no'])

for i in issues:
    im = Image.new('RGB', (W, H), PAPER)
    PW = H * 3 // 4  # 472
    im.paste(fill(os.path.join(PUB, i['slug'], 'pages', '01.jpg'), PW, H), (0, 0))
    d = ImageDraw.Draw(im); X = PW + 64
    spaced(d, (X, 92), f"LATITUDE  ·  NO. {i['no']:02d}", sans(15), MUTE, 4)
    d.text((X - 4, 140), i['lat'], font=serif(120), fill=INK)
    spaced(d, (X, 300), i['city'].upper(), sans(19), INK, 9)
    y = 368
    for row in textwrap.wrap(i['line'], 34):
        d.text((X, y), row, font=serif(30), fill=INK); y += 42
    spaced(d, (X, H - 82), 'VUAL', sans(14), MUTE, 6)
    im.save(os.path.join(PUB, i['slug'], 'og.jpg'), quality=90)

im = Image.new('RGB', (W, H), PAPER)
CW = H * 9 // 16  # 354
live = [i for i in issues if i['live']]
for k, i in enumerate(live[:2]):
    im.paste(fill(os.path.join(PUB, i['slug'], 'cover.jpg'), CW, H), (k * CW, 0))
d = ImageDraw.Draw(im); X = 2 * CW + 60
d.text((X - 3, 200), 'LATITUDE', font=serif(76), fill=INK)
spaced(d, (X, 312), 'A TRAVELLING ISSUE BY VUAL', sans(14), MUTE, 4)
d.text((X, 370), 'One latitude, one day.', font=serif(30, italic=True), fill=INK)
spaced(d, (X, H - 82), '  ·  '.join(i['lat'] for i in sorted(live, key=lambda i: i['no'])), sans(12), MUTE, 1)
im.save(os.path.join(PUB, 'og.jpg'), quality=90)
print('ok', [i['slug'] for i in issues])
