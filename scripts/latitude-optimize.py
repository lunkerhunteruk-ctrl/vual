#!/usr/bin/env python3
# LATITUDE のページを軽い形式でも用意する（2026-10-22 ユーザー指定）。元の JPEG / MP4 はそのまま残し、横に置く：
#   NN.jpg → NN.avif（品質80。2026-10-23 ユーザー：60は画質が気になる）と NN.webp（品質80）   NN.mp4 → NN.webm（VP9）
# 表示側は <picture> と、ブラウザが再生できる形式を選ぶ仕組みで、対応していれば軽い方を使う。
# 号のページを入れ替えたら、もう一度これを流す（元より新しい物があれば作り直さない）。 使い方：python3 scripts/latitude-optimize.py
import glob, os, subprocess
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', 'public', 'latitude')
def stale(src, dst): return not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src)
tot = {'jpg': 0, 'avif': 0, 'mp4': 0, 'webm': 0}
for jpg in sorted(glob.glob(os.path.join(root, '*', 'pages', '*.jpg'))):
    base = jpg[:-4]; im = None
    for ext, kw in (('avif', dict(quality=80)), ('webp', dict(quality=80, method=6))):
        if stale(jpg, base + '.' + ext):
            im = im or Image.open(jpg).convert('RGB'); im.save(base + '.' + ext, ext.upper(), **kw)
    tot['jpg'] += os.path.getsize(jpg); tot['avif'] += os.path.getsize(base + '.avif')
# 動画の色の札（2026-10-27）：ページの動画は RGB の絵から ffmpeg の既定（BT.601）で作ってあり、札がないと
# ブラウザが明るめに描いて、隣の静止画のページと色の段差が出た（Fårö の2〜3ページの時刻表・空・水）。
# 「BT.601 の行列・BT.709 の原色・sRGB の明るさの曲線・TV レンジ」の札を付けると、Safari も Chrome も静止画と同じ色になる。中身は作り直さない
TAGS = ['-color_primaries', 'bt709', '-color_trc', 'iec61966-2-1', '-colorspace', 'smpte170m', '-color_range', 'tv']
def tagged(f):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-of', 'csv=p=0', f], capture_output=True, text=True)
    return r.stdout.strip() not in ('', 'unknown')
def tag(f, extra):
    tmp = f + '.tag' + os.path.splitext(f)[1]; t = os.path.getmtime(f)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-c', 'copy'] + extra + TAGS + [tmp], check=True)
    os.replace(tmp, f); os.utime(f, (t, t))  # 時刻は変えない（作り直しの判定に使うため）
for mp4 in sorted(glob.glob(os.path.join(root, '*', 'pages', '*.mp4'))):
    if not tagged(mp4):  # MP4 は映像の中の札も書き換える（Safari はこちらを読む）
        tag(mp4, ['-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=13:matrix_coefficients=6:video_full_range_flag=0', '-movflags', '+faststart'])
    webm = mp4[:-4] + '.webm'
    if stale(mp4, webm):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2'] + TAGS + [webm], check=True)
    if not tagged(webm): tag(webm, [])
    tot['mp4'] += os.path.getsize(mp4); tot['webm'] += os.path.getsize(webm)
print({k: f'{v // 1024} KB' for k, v in tot.items()})
