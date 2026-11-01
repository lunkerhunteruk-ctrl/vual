#!/usr/bin/env node
// LATITUDE の街の店の一覧（lib/latitude-places/<街>.json と lib/latitude-places/areas/<街>.json）を確かめる。
//
//   node scripts/latitude-places-check.mjs                    … 一覧の中身だけを確かめる
//   node scripts/latitude-places-check.mjs --base=origin/main … 地区のページの URL が、その版から変わっていないかも確かめる
//
// 確かめる事
//   1. 店の id が全部の街で重ならない（形は <街>-<英字の名前>、小文字の英数字とハイフン）
//   2. 店の areaKey が、その街の areas にある。areaKey は areaEn から作る URL の形（slugify）と同じ。地区の en / ja と店の areaEn / area が同じ
//   3. 地区の parent が、同じ街の areas にある（自分自身・輪になる親は不可）
//   4. lat / lng が正しい範囲にあり、両方そろっていて、coordsSource がある（街の中心から 10 km より遠い物は注意として出す）
//   5. 地区のページの URL の一覧が、今のコード（lib/latitude-places.ts の areasOf：areaEn から作り、AREA_MIN 軒以上）と、areaKey から作った物で同じ
//      --base を付けた時は、その版の JSON から今のコードで作った URL とも比べる
//
// slugify と AREA_MIN は lib/latitude-places.ts と同じ物を使う（AREA_MIN はファイルから読む。slugify を変えたらここも直す）。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'lib', 'latitude-places');
const base = process.argv.find((a) => a.startsWith('--base='))?.slice('--base='.length);

// lib/latitude-places.ts の slugify と同じ
const LETTERS = { 'ø': 'o', 'æ': 'ae', 'ð': 'd', 'þ': 'th', 'ß': 'ss', 'œ': 'oe', 'ł': 'l' };
const slugify = (t) => t.toLowerCase().replace(/[øæðþßœł]/g, (ch) => LETTERS[ch]).normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tsSource = fs.readFileSync(path.join(ROOT, 'lib', 'latitude-places.ts'), 'utf8');
const AREA_MIN = Number(tsSource.match(/export const AREA_MIN = (\d+);/)?.[1]);
if (!AREA_MIN) throw new Error('AREA_MIN が lib/latitude-places.ts に見つからない');

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);

const cities = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

// 今のコードの areasOf と同じ作り方（areaEn から、AREA_MIN 軒以上）
const urlsFromAreaEn = (city, places) => {
  const n = new Map();
  for (const p of places) n.set(slugify(p.areaEn), (n.get(slugify(p.areaEn)) ?? 0) + 1);
  return [...n].filter(([, c]) => c >= AREA_MIN).map(([s]) => `/latitude/places/${city}/area/${s}`);
};
const urlsFromAreaKey = (city, places) => {
  const n = new Map();
  for (const p of places) n.set(p.areaKey, (n.get(p.areaKey) ?? 0) + 1);
  return [...n].filter(([, c]) => c >= AREA_MIN).map(([s]) => `/latitude/places/${city}/area/${s}`);
};

const ids = new Map();
const urlsNow = [];
const urlsByKey = [];
let placeCount = 0, areaCount = 0, coordCount = 0;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

for (const city of cities) {
  const places = readJson(path.join(DIR, `${city}.json`));
  const areasFile = path.join(DIR, 'areas', `${city}.json`);
  if (!Array.isArray(places)) { err(`${city}.json: 配列ではない`); continue; }
  if (!fs.existsSync(areasFile)) { err(`${city}: areas/${city}.json がない`); continue; }
  const areas = readJson(areasFile);
  placeCount += places.length;
  areaCount += areas.length;

  // 地区
  const areaByKey = new Map();
  for (const a of areas) {
    if (!a.key || !a.en || !a.ja) err(`${city}: 地区に key / en / ja が足りない: ${JSON.stringify(a)}`);
    if (areaByKey.has(a.key)) err(`${city}: 地区の key が重なっている: ${a.key}`);
    if (a.key !== slugify(a.en)) err(`${city}: 地区 ${a.key} の key が en（${a.en}）から作る URL の形 ${slugify(a.en)} と違う`);
    areaByKey.set(a.key, a);
  }
  for (const a of areas) {
    if (a.parent === undefined) continue;
    if (a.parent === a.key) err(`${city}: 地区 ${a.key} の parent が自分自身`);
    else if (!areaByKey.has(a.parent)) err(`${city}: 地区 ${a.key} の parent ${a.parent} が areas にない`);
    const seen = new Set([a.key]);
    for (let p = areaByKey.get(a.parent); p; p = areaByKey.get(p.parent)) {
      if (seen.has(p.key)) { err(`${city}: 地区 ${a.key} の parent が輪になっている`); break; }
      seen.add(p.key);
    }
  }

  // 店
  const pts = [];
  for (const p of places) {
    const label = `${city}: ${p.nameEn ?? p.name}`;
    if (typeof p.id !== 'string' || !ID_RE.test(p.id)) err(`${label}: id の形が正しくない（${p.id}）`);
    else if (!p.id.startsWith(`${city}-`)) err(`${label}: id が街の名前（${city}-）で始まっていない（${p.id}）`);
    if (ids.has(p.id)) err(`${label}: id ${p.id} が ${ids.get(p.id)} と重なっている`);
    ids.set(p.id, label);

    const a = areaByKey.get(p.areaKey);
    if (!a) err(`${label}: areaKey ${p.areaKey} が areas にない`);
    if (p.areaKey !== slugify(p.areaEn ?? '')) err(`${label}: areaKey ${p.areaKey} が areaEn（${p.areaEn}）から作る URL の形 ${slugify(p.areaEn ?? '')} と違う`);
    if (a && (a.en !== p.areaEn || a.ja !== p.area)) err(`${label}: 地区の名前が areas と違う（店 ${p.area}/${p.areaEn}、areas ${a.ja}/${a.en}）`);

    const hasLat = p.lat !== undefined, hasLng = p.lng !== undefined;
    if (hasLat !== hasLng) err(`${label}: lat と lng の片方だけある`);
    if (hasLat && hasLng) {
      if (typeof p.lat !== 'number' || !Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) err(`${label}: lat が範囲外（${p.lat}）`);
      if (typeof p.lng !== 'number' || !Number.isFinite(p.lng) || p.lng < -180 || p.lng > 180) err(`${label}: lng が範囲外（${p.lng}）`);
      if (!p.coordsSource) err(`${label}: 座標があるのに coordsSource がない`);
      pts.push([p.lat, p.lng, label]);
      coordCount++;
    } else if (p.coordsSource !== undefined) err(`${label}: 座標がないのに coordsSource がある`);
  }
  // 街の中心（座標のある店の中央値）から遠すぎる店は注意として出す（別の街の同じ住所を拾った時に気づくため）
  if (pts.length >= 3) {
    const med = (xs) => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
    const c = [med(pts.map((x) => x[0])), med(pts.map((x) => x[1]))];
    for (const [lat, lng, label] of pts) {
      const toR = (d) => (d * Math.PI) / 180;
      const h = Math.sin(toR(lat - c[0]) / 2) ** 2 + Math.cos(toR(c[0])) * Math.cos(toR(lat)) * Math.sin(toR(lng - c[1]) / 2) ** 2;
      const km = 2 * 6371 * Math.asin(Math.sqrt(h));
      if (km > 10) warnings.push(`${label}: 街の中心から ${km.toFixed(1)} km 離れている。座標を確かめる`);
    }
  }

  // 地区のページの URL
  const now = urlsFromAreaEn(city, places).sort();
  const byKey = urlsFromAreaKey(city, places).sort();
  if (now.join() !== byKey.join()) err(`${city}: areaKey から作る地区の URL が今のコードと違う（今 ${now.join(' ')} / areaKey ${byKey.join(' ')}）`);
  urlsNow.push(...now);
  urlsByKey.push(...byKey);
}

// --base：その版の JSON から今のコードで作った URL と比べる
if (base) {
  const baseUrls = [];
  const list = execFileSync('git', ['ls-tree', '--name-only', `${base}:lib/latitude-places/`], { cwd: ROOT, encoding: 'utf8' })
    .split('\n').filter((f) => f.endsWith('.json'));
  for (const f of list) {
    const places = JSON.parse(execFileSync('git', ['show', `${base}:lib/latitude-places/${f}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }));
    baseUrls.push(...urlsFromAreaEn(f.replace(/\.json$/, ''), places));
  }
  const a = new Set(baseUrls), b = new Set(urlsNow);
  const gone = [...a].filter((u) => !b.has(u)), added = [...b].filter((u) => !a.has(u));
  if (gone.length || added.length) err(`地区のページの URL が ${base} と違う。なくなった: ${gone.join(' ') || 'なし'} / 増えた: ${added.join(' ') || 'なし'}`);
  else console.log(`地区のページの URL は ${base} と同じ（${a.size} 本）`);
}

console.log(`街 ${cities.length}・店 ${placeCount}・id ${ids.size}・地区 ${areaCount}・座標のある店 ${coordCount}・地区のページ ${urlsNow.length} 本`);
console.log(urlsNow.sort().map((u) => `  ${u}`).join('\n'));
for (const w of warnings) console.log(`注意: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`NG: ${e}`);
  process.exit(1);
}
console.log('OK');
