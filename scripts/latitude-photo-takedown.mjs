// 2026-11-14 ③-5 店から「写真を外して」と言われた時に、その店の写真を1つのコマンドで外す。
// 方針（docs/latitude-ui-instructions.md 0-3b）：店の写真は使う。苦情が来た時だけ、その写真をすぐに止める。
//
// 使い方（街の slug と、店の名前。日本語でも英語でもよい）：
//   node --env-file=.env.local scripts/latitude-photo-takedown.mjs kanazawa "今井金箔 本店" --from "店主 今井さん（メール）" --note "写真を外してほしい"
//   既定は「何が変わるかを見せるだけ」。本当に外すのは --yes を付けた時だけ。
//   --no-remote：R2 の物は消さない（試す時用。手で消す手順を出す）
//
// 写真の置き場（2026-11-14 に確かめた）：
//   ・どの店にどの写真か … lib/latitude-shop-photos.json（街 → 日本語の店名 → ファイル名）。店からもらった写真なら店のデータの photo（lib/latitude-places/<街>.json）
//   ・画像そのもの     … R2 の vual-media バケットの latitude/places/<街>/shops/<ファイル>。サイトは lib/latitude-assets.ts の LAT_ASSETS（R2 の公開アドレス）から読む
//   ・手元の元の置き場 … public/latitude/places/<街>/shops/（git には入れていない。この手元に無いこともある）
//   JSON から消しただけでは、画像のアドレスを直接開くとまだ見える。だから R2 と手元のファイルも消す。
// このスクリプトは git のコミットも push もしない。最後に、人がする残りの手順を出す。

import { readFile, writeFile, readdir, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PHOTOS = path.join(ROOT, 'lib', 'latitude-shop-photos.json');
const PLACES_DIR = path.join(ROOT, 'lib', 'latitude-places');
const LOG = path.join(ROOT, 'docs', 'latitude-photo-takedowns.md');
const PUBLIC = path.join(ROOT, 'public', 'latitude');
const BUCKET = process.env.R2_BUCKET_MEDIA || 'vual-media'; // scripts/latitude-assets-upload.mjs と同じ
const rel = (p) => path.relative(ROOT, p);

// ---- 引数 ----
const argv = process.argv.slice(2);
const flags = new Set();
const opts = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--from' || a === '--note') opts[a.slice(2)] = argv[++i] ?? '';
  else if (a.startsWith('--')) flags.add(a.slice(2));
  else pos.push(a);
}
const USAGE = 'Usage: node --env-file=.env.local scripts/latitude-photo-takedown.mjs <city-slug> "<shop name (ja or en)>" [--from "<who>"] [--note "<what they said>"] [--yes] [--no-remote]';
if (flags.has('help') || pos.length !== 2) {
  console.log(USAGE);
  console.log('Default is a dry run (shows what would change). --yes makes the changes. --no-remote skips deleting from R2.');
  process.exit(flags.has('help') ? 0 : 2);
}
const unknownFlags = [...flags].filter((f) => !['yes', 'no-remote'].includes(f));
if (unknownFlags.length) { console.error(`Unknown option: --${unknownFlags.join(', --')}\n${USAGE}`); process.exit(2); }
const [citySlug, shopArg] = pos;
const YES = flags.has('yes');
const NO_REMOTE = flags.has('no-remote');

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };
const norm = (s) => String(s ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
// 近い候補を出すための、ゆるい近さ（同じ字の並びが多いほど近い）
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const near = (q, items, key, n = 8) => {
  const nq = norm(q);
  return items
    .map((it) => {
      const ks = key(it).map(norm);
      const sub = ks.some((k) => k.includes(nq) || (k.length >= 2 && nq.includes(k)));
      return { it, d: sub ? 0 : Math.min(...ks.map((k) => lev(nq, k) / Math.max(nq.length, k.length, 1))) };
    })
    .filter((x) => x.d < 0.6)
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.it);
};

// ---- 記録（docs/latitude-photo-takedowns.md の表）を読む ----
async function readLog() {
  let t = '';
  try { t = await readFile(LOG, 'utf8'); } catch { return { text: '', rows: [] }; }
  const rows = t.split('\n').filter((l) => /^\|\s*\d{4}-\d{2}-\d{2}\s*\|/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .map(([date, city, shop, file, from, note]) => ({ date, city, shop, file, from, note }));
  return { text: t, rows };
}

// ---- 街と店を探す ----
const cityFiles = (await readdir(PLACES_DIR)).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
if (!cityFiles.includes(citySlug)) {
  const c = near(citySlug, cityFiles, (s) => [s], 5);
  fail(`Unknown city "${citySlug}". ${c.length ? `Did you mean: ${c.join(', ')}?` : `Cities: ${cityFiles.join(', ')}`}`);
}
const placesFile = path.join(PLACES_DIR, `${citySlug}.json`);
const placesText = await readFile(placesFile, 'utf8');
const shops = JSON.parse(placesText);
const photosText = await readFile(PHOTOS, 'utf8');
const photos = JSON.parse(photosText);
const cityPhotos = photos[citySlug] ?? {};
const log = await readLog();

const matches = shops.filter((s) => norm(s.name) === norm(shopArg) || norm(s.nameEn) === norm(shopArg));
if (matches.length !== 1) {
  const list = matches.length ? matches : near(shopArg, shops, (s) => [s.name, s.nameEn]);
  const lines = list.map((s) => `    ${s.name}  /  ${s.nameEn}${cityPhotos[s.name] || s.photo ? '   (has a photo)' : ''}`).join('\n');
  fail(matches.length
    ? `"${shopArg}" matches ${matches.length} shops in ${citySlug}; use the exact Japanese name:\n${lines}`
    : `No shop "${shopArg}" in ${citySlug}.${list.length ? ` Near matches:\n${lines}` : ` Shops with a photo here: ${Object.keys(cityPhotos).join('、') || '(none)'}`}`);
}
const shop = matches[0];
const already = log.rows.filter((r) => r.city === citySlug && r.shop === shop.name);

// ---- 写真の出どころ ----
const mapFile = cityPhotos[shop.name];
const fieldFile = shop.photo;
if (!mapFile && !fieldFile) {
  fail(`${citySlug} / ${shop.name} (${shop.nameEn}) has no photo.${already.length ? ` It was taken down on ${already.map((r) => r.date).join(', ')}.` : ''}`);
}
const SAFE = /^[\w.-]+\.(webp|jpe?g|png|avif)$/i; // 変な値でほかの所を消さない
const files = [...new Set([mapFile, fieldFile].filter(Boolean))];
for (const f of files) if (!SAFE.test(f)) fail(`Unexpected file name "${f}" — stopping (nothing changed).`);

// 同じ街のほかの店が同じファイルを使っていたら、ファイルは消さない（その店の写真まで消えるため）
const usersInCity = (f) => [
  ...Object.entries(cityPhotos).filter(([n, v]) => v === f && n !== shop.name).map(([n]) => n),
  ...shops.filter((s) => s.photo === f && s.name !== shop.name).map((s) => s.name),
];
// ほかの街で同じファイル名（同じ画像）を使っている店（置き場は別。知らせるだけ）
const usersElsewhere = (f) => Object.entries(photos).filter(([c]) => c !== citySlug)
  .flatMap(([c, m]) => Object.entries(m).filter(([, v]) => v === f).map(([n]) => `${c} / ${n}`));

// 公開アドレスの頭（lib/latitude-assets.ts の既定と同じ。NEXT_PUBLIC_LATITUDE_ASSETS があればそちら）
const assetsTs = await readFile(path.join(ROOT, 'lib', 'latitude-assets.ts'), 'utf8');
const BASE = (process.env.NEXT_PUBLIC_LATITUDE_ASSETS || assetsTs.match(/\|\|\s*'([^']+)'/)?.[1] || '').replace(/\/$/, '');
const publicUrl = (f) => (BASE.startsWith('http') ? `${BASE}/places/${citySlug}/shops/${f}` : null);
const remoteKey = (f) => `latitude/places/${citySlug}/shops/${f}`;
const localPath = (f) => path.join(PUBLIC, 'places', citySlug, 'shops', f);
const exists = async (p) => access(p).then(() => true, () => false);
async function urlStatus(u) {
  if (!u) return 'n/a';
  try {
    const r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(8000), cache: 'no-store' });
    return String(r.status);
  } catch (e) { return `could not check (${e.name})`; }
}
// 店のデータの photo の行（手で直す所を示すため。TS や JSON を正規表現で書き換えはしない）
function photoLine() {
  const lines = placesText.split('\n');
  const at = lines.findIndex((l) => l.includes(JSON.stringify(shop.name).slice(1, -1)) && /"name"\s*:/.test(l));
  for (let i = Math.max(at, 0); i < lines.length; i++) if (/"photo"\s*:/.test(lines[i])) return i + 1;
  return null;
}

// ---- 何をするかを並べる ----
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(new Date()); // 日本の日付 YYYY-MM-DD
const clean = (s) => String(s ?? '').replace(/[|\r\n]+/g, ' ').trim() || '—';
const row = `| ${today} | ${citySlug} | ${clean(shop.name)} | ${files.join(' ')} | ${clean(opts.from)} | ${clean(opts.note)} |`;

console.log(`\nLATITUDE photo takedown — ${citySlug} / ${shop.name} (${shop.nameEn})${YES ? '' : '   [DRY RUN]'}`);
if (already.length) console.log(`  ! This shop is already in the takedown log (${already.map((r) => r.date).join(', ')}) — its photo has come back.`);
const plan = [];
if (mapFile) plan.push(`remove entry from ${rel(PHOTOS)}:  "${citySlug}" → "${shop.name}": "${mapFile}"`);
if (fieldFile) plan.push(`BY HAND: remove "photo": "${fieldFile}" from ${rel(placesFile)}:${photoLine() ?? '?'} (the script does not edit data files)`);
const perFile = [];
for (const f of files) {
  const shared = usersInCity(f);
  const other = usersElsewhere(f);
  const lp = localPath(f);
  const st = await urlStatus(publicUrl(f));
  perFile.push({ f, shared, lp, hasLocal: await exists(lp) });
  if (shared.length) plan.push(`KEEP file ${f}: also used by ${shared.join('、')} in ${citySlug} (only the entry is removed)`);
  else {
    plan.push(`delete local file ${rel(lp)}  (${perFile.at(-1).hasLocal ? 'present' : 'not in this checkout'})`);
    plan.push(`delete R2 object  ${BUCKET}/${remoteKey(f)}  (public URL now: ${st})${NO_REMOTE ? '  — skipped (--no-remote)' : ''}`);
  }
  if (other.length) plan.push(`note: the same image name is also used by ${other.join('、')} (separate file; not touched)`);
}
plan.push(`append to ${rel(LOG)}:  ${row}`);
plan.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
if (!opts.from || !opts.note) console.log(`  (tip: add --from "<who>" --note "<what they said>" so the log says who asked and why)`);

if (!YES) {
  console.log('\nDry run — nothing changed. Run again with --yes to do it.\n');
  process.exit(0);
}

// ---- 実際に外す ----
const done = [];
const todo = [];
// 1. JSON から消す（並びと字下げは今のまま。街に1軒も残らなければ街ごと消す）
if (mapFile) {
  delete photos[citySlug][shop.name];
  if (!Object.keys(photos[citySlug]).length) delete photos[citySlug];
  const out = JSON.stringify(photos, null, 1) + (photosText.endsWith('\n') ? '\n' : '');
  await writeFile(PHOTOS, out);
  done.push(`removed the entry from ${rel(PHOTOS)}`);
}
if (fieldFile) todo.push(`Remove "photo": "${fieldFile}" from ${rel(placesFile)}:${photoLine() ?? '?'} by hand.`);

// 2. 手元のファイル
for (const p of perFile.filter((x) => !x.shared.length)) {
  if (p.hasLocal) { await unlink(p.lp); done.push(`deleted ${rel(p.lp)}`); }
}

// 3. R2 の物（upload と同じ鍵の名前・同じ認証）。消せない時は、手で消す手順を出す
const manual = (f) => `Delete R2 object ${BUCKET}/${remoteKey(f)} by hand: Cloudflare dashboard → R2 → ${BUCKET} → ${remoteKey(f)} → Delete` +
  `\n     (or: npx wrangler r2 object delete ${BUCKET}/${remoteKey(f)} --remote)`;
const remoteFiles = perFile.filter((x) => !x.shared.length).map((x) => x.f);
const haveCreds = ['CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every((k) => process.env[k]);
if (remoteFiles.length && NO_REMOTE) {
  remoteFiles.forEach((f) => todo.push(manual(f)));
} else if (remoteFiles.length && !haveCreds) {
  console.log('\n  R2 credentials are not set (run with: node --env-file=.env.local …). R2 was not touched.');
  remoteFiles.forEach((f) => todo.push(manual(f)));
} else if (remoteFiles.length) {
  const { S3Client, DeleteObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  for (const f of remoteFiles) {
    const Key = remoteKey(f);
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key }));
      let gone = false;
      try { await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key })); } catch (e) { gone = e?.$metadata?.httpStatusCode === 404 || e?.name === 'NotFound'; }
      if (gone) done.push(`deleted R2 object ${BUCKET}/${Key} (public URL now: ${await urlStatus(publicUrl(f))})`);
      else todo.push(`R2 object ${BUCKET}/${Key} still answers after delete — check it.\n     ${manual(f)}`);
    } catch (e) {
      todo.push(`Could not delete R2 object (${e?.name ?? 'error'}).\n     ${manual(f)}`);
    }
  }
}

// 4. 記録に1行（表の最後に足す）
const logText = log.text || (await readFile(LOG, 'utf8'));
await writeFile(LOG, logText.replace(/\n*$/, '\n') + row + '\n');
done.push(`added a line to ${rel(LOG)}`);

console.log('\nDone:');
done.forEach((d) => console.log(`  ✓ ${d}`));
console.log('\nStill to do (by a person):');
[...todo,
  'Check the change: git diff (lib/latitude-shop-photos.json, docs/latitude-photo-takedowns.md).',
  'Commit, and merge to main — the site updates only after main is deployed (Vercel). This script does not commit or push.',
  'Viewers who already loaded the photo may still see it from their browser cache for up to a day (Cache-Control max-age=86400).',
].forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
console.log('');
