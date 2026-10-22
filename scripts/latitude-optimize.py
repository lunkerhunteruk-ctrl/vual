#!/usr/bin/env python3
# LATITUDE のページを軽い形式でも用意する（2026-10-22 ユーザー指定）。元の JPEG / MP4 はそのまま残し、横に置く：
#   NN.jpg → NN.avif（品質60）と NN.webp（品質80）   NN.mp4 → NN.webm（VP9）
# 表示側は <picture> と、ブラウザが再生できる形式を選ぶ仕組みで、対応していれば軽い方を使う。
# 号のページを入れ替えたら、もう一度これを流す（元より新しい物があれば作り直さない）。 使い方：python3 scripts/latitude-optimize.py
import glob, os, subprocess
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', 'public', 'latitude')
def stale(src, dst): return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)
tot = {'jpg': 0, 'avif': 0, 'mp4': 0, 'webm': 0}
for jpg in sorted(glob.glob(os.path.join(root, '*', 'pages', '*.jpg'))):
    base = jpg[:-4]; im = None
    for ext, kw in (('avif', dict(quality=60)), ('webp', dict(quality=80, method=6))):
        if stale(jpg, base + '.' + ext):
            im = im or Image.open(jpg).convert('RGB'); im.save(base + '.' + ext, ext.upper(), **kw)
    tot['jpg'] += os.path.getsize(jpg); tot['avif'] += os.path.getsize(base + '.avif')
for mp4 in sorted(glob.glob(os.path.join(root, '*', 'pages', '*.mp4'))):
    webm = mp4[:-4] + '.webm'
    if stale(mp4, webm):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webm], check=True)
    tot['mp4'] += os.path.getsize(mp4); tot['webm'] += os.path.getsize(webm)
print({k: f'{v // 1024} KB' for k, v in tot.items()})
