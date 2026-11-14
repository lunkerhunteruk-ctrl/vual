#!/usr/bin/env node
// 2026-11-15 LATITUDE 決まった時間割（店の open）を確かめる。読むだけ（何も書かない）。
//   node scripts/latitude-open-check.mjs                 … lib/latitude-places/*.json のすべての店
//   node scripts/latitude-open-check.mjs --file <x.json>  … 案のファイル（{"<町>|<店>": open} か {"<町>|<店>": {"open": …}}）
// 問題は「町 / 店: 何が悪いか」の1行ずつ。最後に、open のある店の数（町ごと）。問題があれば終わりのコードは 1。
// 書き方は docs/latitude-open-hours-format.md。表示の決まりは lib/latitude-open.ts（ここの時刻の読み方と同じ）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KEYS = new Set(['week', 'holiday', 'irregular', 'note', 'checked', 'source']);
const HOLIDAY = new Set(['open', 'closed', 'shift']);
const TIME = /^([01]\d|2[0-4]):([0-5]\d)$/;

const args = process.argv.slice(2);
const fileArg = args.includes('--file') ? args[args.indexOf('--file') + 1] : null;
if (args.includes('--file') && !fileArg) { console.error('--file にファイルを渡してください'); process.exit(2); }

const time = (s) => {
  const m = typeof s === 'string' ? TIME.exec(s) : null;
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v > 1440 ? null : v;
};
const today = new Date().toISOString().slice(0, 10);
const validDate = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
};

// 1軒の open を確かめる → [問題（エラー）, 注意] の文の配列
export function checkOpen(o) {
  const err = [];
  const warn = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) return [['open がオブジェクトではない'], warn];
  for (const k of Object.keys(o)) if (!KEYS.has(k)) err.push(`知らない項目 "${k}"`);
  const w = o.week;
  if (!w || typeof w !== 'object' || Array.isArray(w)) err.push('week が無い');
  else {
    for (const k of Object.keys(w)) if (!DAYS.includes(k)) err.push(`week に知らない曜日 "${k}"`);
    const spans = []; // [曜日の番号, 開く分, 閉まる分（翌日なら +1440）]
    for (const [i, d] of DAYS.entries()) {
      const rs = w[d];
      if (!Array.isArray(rs)) { err.push(`week.${d} が無い（定休日なら []）`); continue; }
      const day = [];
      for (const r of rs) {
        if (!Array.isArray(r) || r.length !== 2) { err.push(`week.${d}: 範囲は ["開く","閉まる"] の2つ（${JSON.stringify(r)}）`); continue; }
        const a = time(r[0]);
        const b = time(r[1]);
        if (a === null || b === null) { err.push(`week.${d}: 時刻は HH:MM（00:00〜24:00、例 "09:30"）（${JSON.stringify(r)}）`); continue; }
        if (a >= 1440) { err.push(`week.${d}: 開く時刻に 24:00 は使えない（${JSON.stringify(r)}）`); continue; }
        day.push([a, b <= a ? b + 1440 : b, r]);
      }
      for (let k = 1; k < day.length; k++) {
        if (day[k][0] < day[k - 1][0]) err.push(`week.${d}: 範囲は早い順に（${JSON.stringify(day[k - 1][2])} の前に ${JSON.stringify(day[k][2])}）`);
        else if (day[k][0] < day[k - 1][1]) err.push(`week.${d}: 範囲が重なっている（${JSON.stringify(day[k - 1][2])} と ${JSON.stringify(day[k][2])}）`);
        else if (day[k][0] === day[k - 1][1]) warn.push(`week.${d}: 範囲が続いている（1つにまとめられる: ${JSON.stringify(day[k - 1][2])} ${JSON.stringify(day[k][2])}）`);
      }
      for (const [a, b] of day) spans.push([i, a, b]);
    }
    // 夜中を越える範囲が、次の日の最初の範囲と重ならないか
    for (const [i, , b] of spans) {
      if (b <= 1440) continue;
      const next = DAYS[(i + 1) % 7];
      for (const [j, a] of spans) if (j === (i + 1) % 7 && a < b - 1440) err.push(`week.${DAYS[i]} の夜中を越える範囲が、week.${next} の ${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')} からの範囲と重なっている`);
    }
    if (Array.isArray(w.mon) && DAYS.every((d) => Array.isArray(w[d]) && !w[d].length)) err.push('7日とも定休日（[]）になっている。分からないなら open を書かない');
  }
  if ('holiday' in o && !HOLIDAY.has(o.holiday)) err.push(`holiday は "open" / "closed" / "shift" のどれか（今: ${JSON.stringify(o.holiday)}）。分からなければ書かない`);
  if ('irregular' in o && typeof o.irregular !== 'boolean') err.push('irregular は true か false');
  if ('note' in o && (!o.note || typeof o.note.ja !== 'string' || typeof o.note.en !== 'string' || !o.note.ja || !o.note.en || Object.keys(o.note).some((k) => k !== 'ja' && k !== 'en'))) err.push('note は {"ja": "…", "en": "…"}（両方）');
  if (!validDate(o.checked)) {
    err.push(`checked（確かめた日 YYYY-MM-DD）が無いか読めない（${JSON.stringify(o.checked)}）`);
  } else {
    if (o.checked > today) err.push(`checked が未来の日付（${o.checked}）`);
    const limit = `${+o.checked.slice(0, 4) + 1}${o.checked.slice(4)}`;
    if (today > limit) warn.push(`checked が12か月より前（${o.checked}）。サイトでは状態を出さない。確かめ直す`);
  }
  if (typeof o.source !== 'string' || !/^https?:\/\/\S+$/.test(o.source)) err.push(`source（確かめた公式のページの URL）が無いか URL ではない（${JSON.stringify(o.source)}）`);
  return [err, warn];
}

function safeChecked(o) {
  try { return checkOpen(o); } catch (e) { return [[`読めない（${e.message}）`], []]; }
}

const items = []; // { town, shop, open }
if (fileArg) {
  const data = JSON.parse(fs.readFileSync(path.resolve(fileArg), 'utf8'));
  for (const [key, v] of Object.entries(data)) {
    const [town, ...rest] = key.split('|');
    items.push({ town, shop: rest.join('|') || key, open: v && typeof v === 'object' && 'open' in v && !('week' in v) ? v.open : v });
  }
} else {
  const dir = path.join(ROOT, 'lib/latitude-places');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const town = f.replace(/\.json$/, '');
    let list;
    try { list = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log(`${town}: JSON が読めない（${e.message}）`); process.exitCode = 1; continue; }
    for (const x of list) if (x && 'open' in x) items.push({ town, shop: x.name, open: x.open });
  }
}

let errors = 0;
let warnings = 0;
const perTown = new Map();
for (const { town, shop, open } of items) {
  perTown.set(town, (perTown.get(town) ?? 0) + 1);
  const [err, warn] = safeChecked(open);
  for (const e of err) { console.log(`${town} / ${shop}: ${e}`); errors++; }
  for (const w of warn) { console.log(`${town} / ${shop}: （注意）${w}`); warnings++; }
}
const irregular = items.filter((x) => x.open && x.open.irregular === true).length;
console.log('');
console.log(`open のある店: ${items.length} 軒（不定休 ${irregular}）${fileArg ? ` — ${fileArg}` : ''}`);
for (const [t, n] of [...perTown].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) console.log(`  ${t}: ${n}`);
console.log(`問題 ${errors} ／ 注意 ${warnings}`);
if (errors) process.exitCode = 1;
