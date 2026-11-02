// VUAL オリジナル（VAULT のカタログでブランド「VUAL」の服）を、スタイリスト用ページ（/stylist）へ出す。2026-11-02
// 写真を2つの大きさ（一覧用 card 640px・拡大用 large 1400px）にして R2 の originals/<id>/ へ上げ、一覧 originals/index.json を書く。
// 使い方：node --env-file=.env.local scripts/vual-originals-publish.mjs [--dry]
//   作り変えの係が服を登録したら、これを1回回すとページに出る（デプロイはいらない）。中身が同じ写真は上げ直さない。
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const VAULT = process.env.VAULT_ROOT || path.resolve(process.cwd(), '..', 'vault.vual.jp');
const CATALOG = path.join(VAULT, '.production', 'catalog');
const BUCKET = process.env.R2_BUCKET_MEDIA || 'vual-media';
const dry = process.argv.includes('--dry');

// カタログの種類 → ページの列。並びの順もこの順
const GROUPS = {
  outer: ['Coat', 'Jacket', 'Outer'],
  tops: ['Tops', 'Knit'],
  cardigan: ['Cardigan'],
  dress: ['Dress'],
  bottoms: ['Pants', 'Skirt'],
  shoes: ['Shoes'],
  bag: ['Bag'],
  accessory: ['Accessory', 'Scarf', 'Socks'],
};
const groupOf = (c) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(c)) || 'accessory';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function put(key, body, type, cache) {
  const md5 = createHash('md5').update(body).digest('hex');
  try {
    const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    if (h.ETag?.replaceAll('"', '') === md5) return false;
  } catch { /* まだ無い */ }
  if (!dry) await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type, CacheControl: cache }));
  return true;
}

const raw = JSON.parse(await readFile(path.join(CATALOG, 'products.json'), 'utf8'));
const all = Array.isArray(raw) ? raw : raw.products || Object.values(raw);
const vual = all.filter((p) => String(p.brand || '').toUpperCase() === 'VUAL' && p.images?.[0]?.filename);

const items = [];
let up = 0;
for (const p of vual) {
  const src = await readFile(path.join(CATALOG, 'products', p.images[0].filename));
  // 白い背景のまま、正方形に収める（服が切れないように contain）
  const card = await sharp(src).resize(640, 640, { fit: 'contain', background: '#ffffff' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const large = await sharp(src).resize(1400, 1400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  // 写真が変わったら住所も変わるように、中身の指紋を付ける（古い写真が残って見えるのを防ぐ）
  const v = createHash('sha1').update(src).digest('hex').slice(0, 10);
  const cache = 'public, max-age=31536000, immutable';
  if (await put(`originals/${p.id}/${v}-card.jpg`, card, 'image/jpeg', cache)) up++;
  if (await put(`originals/${p.id}/${v}-large.jpg`, large, 'image/jpeg', cache)) up++;
  items.push({
    id: p.id,
    name: p.name,
    category: p.declaredCategory || p.category || '',
    group: groupOf(p.declaredCategory || p.category),
    color: p.color || '',
    family: p.productFamilyId || p.id,
    card: `${p.id}/${v}-card.jpg`,
    large: `${p.id}/${v}-large.jpg`,
  });
}
items.sort((a, b) => Object.keys(GROUPS).indexOf(a.group) - Object.keys(GROUPS).indexOf(b.group)
  || a.family.localeCompare(b.family) || a.color.localeCompare(b.color, 'ja'));
const index = Buffer.from(JSON.stringify({ updatedAt: new Date().toISOString(), count: items.length, items }));
await put('originals/index.json', index, 'application/json', 'public, max-age=300');

const byGroup = Object.fromEntries(Object.keys(GROUPS).map((g) => [g, items.filter((i) => i.group === g).length]));
console.log(`${dry ? '（試し）' : ''}VUAL オリジナル ${items.length}点・上げた写真 ${up}枚`, JSON.stringify(byGroup));
