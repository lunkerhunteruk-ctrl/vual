// LATITUDE の写真・ページの動画を R2（vual-media の latitude/）へ上げる。2026-11-01
// サイトは lib/latitude.ts の LAT_ASSETS（既定は R2 の公開アドレス）から読む。public/latitude は手元の元の置き場。
// 使い方：node --env-file=.env.local scripts/latitude-assets-upload.mjs [public/latitude の中のフォルダ…]
//   引数なし＝全部。中身が同じ（md5 が ETag と一致）物は上げ直さない。--dry で数えるだけ。
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'public', 'latitude');
const BUCKET = process.env.R2_BUCKET_MEDIA || 'vual-media';
const dry = process.argv.includes('--dry');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.json': 'application/json', '.svg': 'image/svg+xml',
};
// 号のページは同じ名前で差し替える事があるので、長く固定しない（1日）
const CACHE = 'public, max-age=86400';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// 2026-11-14 店から言われて外した写真（docs/latitude-photo-takedowns.md の表）は、手元に残っていても上げ直さない
const TAKEN = new Set((await readFile(path.join(process.cwd(), 'docs', 'latitude-photo-takedowns.md'), 'utf8').catch(() => ''))
  .split('\n').filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l)).map((l) => l.split('|').map((c) => c.trim()))
  .flatMap(([, , city, , files]) => files.split(/\s+/).map((f) => `latitude/places/${city}/shops/${f}`)));

const starts = only.length ? only.map((o) => path.join(ROOT, o)) : [ROOT];
const files = [];
for (const s of starts) files.push(...((await stat(s)).isDirectory() ? await walk(s) : [s]));

let up = 0, same = 0, bytes = 0, failed = 0;
const skipped = [];
async function one(f) {
  const ext = path.extname(f).toLowerCase();
  const type = TYPES[ext];
  if (!type) { skipped.push(path.relative(ROOT, f)); return; }
  const key = 'latitude/' + path.relative(ROOT, f).split(path.sep).join('/');
  if (TAKEN.has(key)) { skipped.push(`${path.relative(ROOT, f)}（外した写真）`); return; }
  const body = await readFile(f);
  const md5 = createHash('md5').update(body).digest('hex');
  try {
    const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    if (h.ETag?.replaceAll('"', '') === md5) { same++; return; }
  } catch { /* まだ無い */ }
  if (!dry) await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type, CacheControl: CACHE }));
  up++; bytes += body.length;
}

const queue = [...files];
await Promise.all(Array.from({ length: 8 }, async () => {
  for (let f; (f = queue.shift());) {
    try { await one(f); } catch (e) { failed++; console.error('失敗', path.relative(ROOT, f), e.message); }
  }
}));
console.log(`${dry ? '（数えるだけ）' : ''}上げた ${up}（${(bytes / 1e6).toFixed(1)}MB）・同じなので飛ばした ${same}・失敗 ${failed}・対象外 ${skipped.length}`);
if (skipped.length) console.log('対象外:', skipped.join(', '));
if (failed) process.exit(1);
