#!/usr/bin/env node
// 2026-11-15 LATITUDE 営業時間の字（調べる人が書いた hours / closed）から、決まった時間割（open）の「案」を作る。厳しく：全部読めた店だけ。
//   node scripts/latitude-open-from-text.mjs --checked 2026-11-14 --out <案.json> <VERIFIED.json か OUT-*.json か そのフォルダ> …
// 入力（読むだけ）: vault.vual.jp/docs/latitude-shop-hours/VERIFIED.json（引用を機械で確かめた後の物）か、raw/OUT-*.json。
//   VERIFIED: {"<町>|<店>": {"hours": {"ja","en"}, "closed": {"ja","en"}, "quoteHours", "quoteClosed", "url", "checked"}}
//   OUT:      {"<町>|<店>": {"hoursJa", "hoursEn", "closedJa", "closedEn", "quoteHours", "quoteClosed", "url"}}
// 出すもの: --out のファイルに {"<町>|<店>": {"open": {...}, "from": {字と引用}}}（scripts/latitude-open-check.mjs --file で確かめられる）。
//   lib/latitude-places/*.json には書かない（データに入れるのは別の作業）。読めなかった店は理由つきで数える（--skipped <ファイル> で一覧を書く）。
// 決まり（docs/latitude-open-hours-format.md）:
//   ・hours と closed の両方が、知っている形で最後まで読めた時だけ案を出す。季節・予約・「頃」・知らない注記・読み残しがあれば出さない
//   ・祝日の決まりは書いてある時だけ（「（祝日は営業）」→ open、「（祝日の場合は翌日）」など → shift、「日曜・祝日」→ closed）。書いていなければ holiday を付けない
//   ・不定休 → irregular: true（店が自分で「不定休」と書いている時だけ）。「臨時休業あり」は不定休にしない
//   ・時刻と休みの曜日が、写した引用（quoteHours / quoteClosed）にも本当にあるかを確かめる。無ければ出さない
//   ・source は url、checked は --checked の日（無ければ VERIFIED の checked）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_CH = { 月: 'mon', 火: 'tue', 水: 'wed', 木: 'thu', 金: 'fri', 土: 'sat', 日: 'sun' };
const CH_OF = Object.fromEntries(Object.entries(DAY_CH).map(([k, v]) => [v, k]));
const EN_DAY = { mon: /\bmon/i, tue: /\btue/i, wed: /\bwed/i, thu: /\bthu/i, fri: /\bfri/i, sat: /\bsat/i, sun: /\bsun/i };
const nextDay = (d) => DAYS[(DAYS.indexOf(d) + 1) % 7];

class Skip extends Error {
  constructor(reason, detail) { super(reason); this.reason = reason; this.detail = detail; }
}
const skip = (reason, detail) => { throw new Skip(reason, detail); };

const tidy = (s) => String(s ?? '').trim().replace(/[～~]/g, '〜').replace(/[‐‑−－—]/g, '–').replace(/\s+/g, ' ');

// 時刻「9:00」「17:30」「24:00」→「09:00」形（データの形）。読めなければ null
function hhmm(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m || +m[1] > 24 || +m[2] > 59 || (+m[1] === 24 && +m[2] !== 0)) return null;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// ── 曜日の言い方 ─────────────────────────────────────────
// 「平日」「土日」「土日祝」「毎日」「火–日」「水〜土曜」「金土」「水木日」「月–木・日」「金〜日・祝」
// → { days: [...], holiday: true/false（祝日がこのまとまりに入っている） }
export function parseDays(spec) {
  const out = new Set();
  let holiday = false;
  for (const tok0 of spec.split('・')) {
    let tok = tok0.replace(/曜日?$/, '');
    if (!tok) skip('曜日が読めない', spec);
    if (tok === '平日') { ['mon', 'tue', 'wed', 'thu', 'fri'].forEach((d) => out.add(d)); continue; }
    if (tok === '毎日') { DAYS.forEach((d) => out.add(d)); continue; }
    if (tok === '祝' || tok === '祝日' || tok === '祝祭日') { holiday = true; continue; }
    if (tok.endsWith('祝')) { holiday = true; tok = tok.slice(0, -1); }
    const r = /^([月火水木金土日])曜?[〜–]([月火水木金土日])$/.exec(tok);
    if (r) {
      let i = DAYS.indexOf(DAY_CH[r[1]]);
      const j = DAYS.indexOf(DAY_CH[r[2]]);
      for (let n = 0; n < 7; n++) { out.add(DAYS[i]); if (i === j) break; i = (i + 1) % 7; }
      continue;
    }
    if (/^[月火水木金土日]+$/.test(tok)) { for (const ch of tok) out.add(DAY_CH[ch]); continue; }
    skip('曜日が読めない', spec);
  }
  return { days: DAYS.filter((d) => out.has(d)), holiday };
}

// ── 営業時間 ───────────────────────────────────────────
// 範囲1つ「11:00–14:00」＋かっこの注記（L.O. と「なくなり次第終了」だけ知っている）
const SOLD_OUT = /^(なくなり次第終了|売り切れ次第終了|売切れ次第終了|売切次第終了|完売次第終了|売り切れ次第閉店|売切次第閉店)$/;
function parseRange(s, notes) {
  const m = /^(\d{1,2}:\d{2})–(\d{1,2}:\d{2})(?:（([^（）]*)）)?$/.exec(s);
  if (!m) skip(/頃|〜$|–$|^\d{1,2}:\d{2}〜/.test(s) ? '時刻がはっきりしない（頃・から）' : '時間の形が読めない', s);
  const a = hhmm(m[1]);
  const b = hhmm(m[2]);
  if (!a || !b || a === '24:00') skip('時刻が読めない', s);
  if (m[3] !== undefined) {
    for (const part of m[3].split('、')) {
      const lo = /^L\.O\. ?(\d{1,2}:\d{2})$/.exec(part);
      if (lo && hhmm(lo[1])) notes.lo.push(lo[1]);
      else if (SOLD_OUT.test(part)) notes.soldOut = true;
      else skip('知らない注記', `（${m[3]}）`);
    }
  }
  return [a, b];
}
// 「、」で分けた1つ（曜日つきなら新しいまとまり）。「・」は同じまとまりの昼と夜
export function parseHours(text) {
  const t = tidy(text);
  if (!t) skip('営業時間が無い');
  if (/※/.test(t)) skip('※の注記', t);
  if (/\d+月|冬季|夏季|冬期|夏期|季節/.test(t)) skip('季節・月で時間が変わる', t);
  const notes = { lo: [], soldOut: false };
  const groups = []; // { days|null, holiday, ranges }
  for (const seg of splitTop(t, '、')) {
    const hd = /^([^\d\s（][^\s]*) (.+)$/.exec(seg); // 頭が数字でなく、空白の前まで＝曜日
    if (hd) {
      const d = parseDays(hd[1]);
      groups.push({ days: d.days, holiday: d.holiday, ranges: splitTop(hd[2], '・').map((r) => parseRange(r, notes)) });
    } else {
      const ranges = splitTop(seg, '・').map((r) => parseRange(r, notes));
      if (!groups.length) groups.push({ days: null, holiday: false, ranges });
      else if (groups.length === 1 && groups[0].days === null) groups[0].ranges.push(...ranges);
      else skip('曜日の無い時間が、曜日つきの後に続く', seg);
    }
  }
  if (groups.some((g) => g.days === null) && groups.length > 1) skip('曜日の無い時間と曜日つきの時間が混ざる', t);
  for (const g of groups) {
    const ms = g.ranges.map(([a, b]) => [toMin(a), toMin(b) <= toMin(a) ? toMin(b) + 1440 : toMin(b)]);
    for (let k = 1; k < ms.length; k++) if (ms[k][0] < ms[k - 1][1]) skip('範囲が重なるか、順番が逆', t);
  }
  return { groups, notes };
}
// かっこの外の区切りだけで分ける（「11:00–14:00（L.O. 13:30、なくなり次第終了）」の中の「、」では分けない）
function splitTop(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '（') depth++;
    if (ch === '）') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
const toMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3);

// ── 休み ─────────────────────────────────────────────
const YEAR_END = /^(年末年始|元日|元旦|1月1日|12月31日・1月1日|12\/31・1\/1)$/;
const P_OPEN = /^(祝日は営業|祝祭日は営業|祝日の場合は営業|祝日を除く|祝日は除く|祝祭日を除く|祝日除く)$/;
const P_CLOSED = /^(祝日も休業|祝日も休み|祝日は休業|祝日は休み)$/; // 「月曜（祝日を除く）」＝祝日の月曜は開く＝「祝日は営業」と同じ
const P_SHIFT = /^(祝日の場合は翌日|祝祭日の場合は翌日|祝日の場合は翌日休|祝日は翌日休|祝日の場合は直後の平日|祝日の場合は翌平日)$/;
const P_IRREGULAR = /^(不定休あり|他不定休あり|その他不定休あり)$/;
const P_IGNORE = /^(臨時休業あり|年数回臨時休業あり)$/; // 臨時休業はどの店にもある（サイトの「行く前に確かめて」の1行がそれ）。不定休にはしない
const P_YE = /^(年末年始休|年末年始を除く|年末年始除く|元日を除く|元旦を除く|元日除く|1月1日を除く|1月1日除く|元日のみ休)$/;
export function parseClosed(text) {
  let t = tidy(text);
  if (!t) skip('休みが無い');
  const res = { days: new Set(), holiday: undefined, irregular: false, yearEnd: null };
  const setHoliday = (h, src) => {
    if (res.holiday && res.holiday !== h) skip('祝日の決まりが2つ', src);
    res.holiday = h;
  };
  const yearEndOf = (s) => (/年末年始/.test(s) ? 'year' : 'jan1');
  // まるごとの形
  let m;
  if ((m = /^(.+?)(のみ)?（それ以外は無休）$/.exec(t)) && YEAR_END.test(m[1])) { res.yearEnd = yearEndOf(m[1]); return res; }
  if (YEAR_END.test(t)) { res.yearEnd = yearEndOf(t); return res; }
  // かっこ（どこにあっても）。中身は「、」で分けて、あとで読む
  const parts = [];
  if (/（[^）]*（|）[^（]*）/.test(t)) skip('休みのかっこが入れ子', text);
  t = t.replace(/（([^（）]*)）/g, (_, inner) => { parts.push(...(inner === '祝日は営業、翌日休' ? ['祝日の場合は翌日休'] : inner.split('、'))); return ''; });
  if (/[（）]/.test(t)) skip('休みのかっこが閉じていない', text);
  const body = t;
  // 本体
  if (body === '無休' || body === '年中無休') {
    // 曜日なし
  } else if (body === '不定休') {
    res.irregular = true;
  } else {
    for (const tok0 of body.split(/[・、]/)) {
      const tok = tok0.trim();
      if (!tok) skip('休みの形が読めない', text);
      if (/^第/.test(tok) || /^[1-5１-５]/.test(tok) && /曜/.test(tok)) skip('月の何週目かの休み（第1・第3など）', text);
      if (tok === '祝日' || tok === '祝祭日' || tok === '祝') { setHoliday('closed', text); continue; }
      if (tok === '不定休' || tok === 'その他不定休' || tok === '他不定休') { res.irregular = true; continue; }
      if (YEAR_END.test(tok)) { res.yearEnd = yearEndOf(tok); continue; }
      let t2 = tok;
      if (t2.endsWith('祝')) { setHoliday('closed', text); t2 = t2.slice(0, -1); }
      const r = /^([月火水木金土日])曜?[〜–]([月火水木金土日])曜日?$/.exec(t2);
      if (r) { for (const d of parseDays(`${r[1]}〜${r[2]}`).days) res.days.add(d); continue; }
      const d = /^([月火水木金土日]+)(曜日?)?$/.exec(t2);
      if (!d) skip('休みの形が読めない', text);
      if (d[1].length > 1 && !d[2] && !/^土日$|^日月$/.test(d[1])) skip('休みの形が読めない', text);
      for (const ch of d[1]) res.days.add(DAY_CH[ch]);
    }
  }
  // かっこの中
  for (const p0 of parts) {
    const p = p0.trim();
    if (p === '祝日・年末年始除く' || p === '祝日・年末年始を除く') { setHoliday('open', text); res.yearEnd = 'year'; } else if (P_OPEN.test(p)) setHoliday('open', text);
    else if (P_CLOSED.test(p)) setHoliday('closed', text);
    else if (P_SHIFT.test(p)) setHoliday('shift', text);
    else if ((m = /^祝日の場合は翌?([月火水木金土日])曜日?休?$/.exec(p))) {
      // 「月曜（祝日の場合は翌火曜）」：休みの次の日のことなら shift
      const ds = [...res.days];
      if (ds.length !== 1 || nextDay(ds[0]) !== DAY_CH[m[1]]) skip('祝日の決まりが読めない', text);
      setHoliday('shift', text);
    } else if (P_IRREGULAR.test(p)) res.irregular = true;
    else if (P_IGNORE.test(p)) { /* 何もしない */ } else if (P_YE.test(p)) res.yearEnd = yearEndOf(p);
    else skip('休みのかっこの中が読めない', `（${p0}）`);
  }
  // 「祝日は営業」と書いた日の後ろの「祝日の場合は翌日休」は同じ文で shift（上で扱う）。
  if (res.holiday === 'shift' && !res.days.size) skip('祝日の決まりの曜日が無い', text);
  return res;
}

// ── 引用と照らす ───────────────────────────────────────
// 引用の時刻の書き方をそろえる（全角の数字・「11時00分」・「09:00」）
// 英語の店の書き方（10:00 AM / 5.30pm / 07.00 / 8-16）も 24時間の H:MM に
const h24 = (h, ap) => (ap ? ((+h % 12) + (/p/i.test(ap) ? 12 : 0)) : +h);
function normQuote(q) {
  return String(q ?? '').normalize('NFKC').replace(/(\d) ?: ?(\d)/g, '$1:$2')
    .replace(/(午前|午後)(\d{1,2})時(\d{2})分/g, (_, x, h, m) => `${h24(h, x === '午後' ? 'p' : 'a')}:${m}`)
    .replace(/(午前|午後)(\d{1,2})時半/g, (_, x, h) => `${h24(h, x === '午後' ? 'p' : 'a')}:30`)
    .replace(/(午前|午後)(\d{1,2})時/g, (_, x, h) => `${h24(h, x === '午後' ? 'p' : 'a')}:00`)
    .replace(/(午前|午後)(\d{1,2}):(\d{2})/g, (_, x, h, m) => `${h24(h, x === '午後' ? 'p' : 'a')}:${m}`)
    .replace(/(?<![a-z])([ap])\.?m\.? ?(\d{1,2})(?::(\d{2}))?/gi, (_, ap, h, m) => `${h24(h, ap)}:${m ?? '00'}`)
    .replace(/(\d{1,2})時(\d{2})分/g, '$1:$2').replace(/(\d{1,2})時半/g, '$1:30').replace(/(\d{1,2})時(?!\d)/g, '$1:00')
    .replace(/(?<![\d:.])(\d{1,2})[.:](\d{2}) ?([ap])\.?m\.?/gi, (_, h, m, ap) => `${h24(h, ap)}:${m}`)
    .replace(/(?<![\d:.])(\d{1,2}) ?([ap])\.?m\.?/gi, (_, h, ap) => `${h24(h, ap)}:00`)
    .replace(/(?<![\d:.])(\d{1,2})\.(\d{2})(?![\d])/g, '$1:$2')
    .replace(/(?<![\d:.])(\d{1,2}) ?[-–] ?(\d{1,2})(?![\d:.])/g, '$1:00-$2:00')
    .replace(/(?<!\d)0(\d):/g, '$1:');
}
const timeInQuote = (q, t) => new RegExp(`(?<!\\d)${t.replace(/^0/, '')}(?!\\d)`).test(q);

// ── 1軒 ─────────────────────────────────────────────
export function convert(rec, checkedArg) {
  const hoursJa = rec.hours?.ja ?? rec.hoursJa;
  const closedJa = rec.closed?.ja ?? rec.closedJa;
  if (!hoursJa) skip('営業時間が無い');
  if (!closedJa) skip('休みが無い');
  const url = rec.url;
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) skip('url が無い');
  const checked = checkedArg ?? rec.checked;
  if (!checked || !/^\d{4}-\d{2}-\d{2}$/.test(checked)) skip('確かめた日が無い');

  const h = parseHours(hoursJa);
  const c = parseClosed(closedJa);

  // 時間割を組む
  const week = Object.fromEntries(DAYS.map((d) => [d, []]));
  const anyHoliday = h.groups.some((g) => g.holiday);
  if (h.groups.length === 1 && h.groups[0].days === null) {
    for (const d of DAYS) if (!c.days.has(d)) week[d] = h.groups[0].ranges;
  } else {
    const seen = new Set();
    for (const g of h.groups) {
      for (const d of g.days) {
        if (seen.has(d)) skip('同じ曜日が2回', hoursJa);
        seen.add(d);
        if (c.days.has(d)) {
          // 「平日」「土日」「毎日」のような大きなまとまりの中の休みは、休みが勝つ。「火–土」と書いて火曜が休みなら食い違い
          continue;
        }
        week[d] = g.ranges;
      }
    }
    // 曜日のくくりがはっきり休みと食い違うか（例：時間「月–金」・休み「水曜」）。大きなまとまり（平日・土日・毎日）は除く
    const coarse = new Set(['平日', '土日', '土日祝', '毎日']);
    for (const seg of splitTop(tidy(hoursJa), '、')) {
      const hd = /^([^\d\s（][^\s]*) /.exec(seg);
      for (const tok of hd ? hd[1].split('・') : []) {
        if (coarse.has(tok) || /^祝(日|祭日)?$/.test(tok)) continue;
        for (const d of parseDays(tok).days) if (c.days.has(d)) skip('時間の曜日と休みの曜日が食い違う', `${hoursJa} ／ ${closedJa}`);
      }
    }
    for (const d of DAYS) if (!seen.has(d) && !c.days.has(d)) skip('どちらにも書いていない曜日がある', `${CH_OF[d]}曜`);
  }
  if (DAYS.every((d) => !week[d].length)) skip('営業する日が無い');

  // 祝日：時間の方の「祝」（例：土日祝 …）は、全部の営業日が同じ時間の時だけ「その曜日の時間で営業」と同じ意味
  let holiday = c.holiday;
  if (anyHoliday) {
    const sigs = new Set(DAYS.filter((d) => week[d].length).map((d) => JSON.stringify(week[d])));
    if (sigs.size !== 1) skip('祝日は別の時間（その曜日の時間割では表せない）', hoursJa);
    if (holiday && holiday !== 'open') skip('祝日の決まりが2つ', `${hoursJa} ／ ${closedJa}`);
    holiday = 'open';
  }

  // 引用と照らす
  const qh = normQuote(rec.quoteHours);
  for (const d of DAYS) for (const [a, b] of week[d]) for (const t of [a, b]) if (!timeInQuote(qh, t)) skip('時刻が引用に無い', t);
  for (const t of h.notes.lo) if (!timeInQuote(qh, hhmm(t))) skip('L.O. の時刻が引用に無い', t);
  const qc = normQuote(rec.quoteClosed);
  for (const d of c.days) if (!qc.includes(CH_OF[d]) && !EN_DAY[d].test(qc)) skip('休みの曜日が引用に無い', `${CH_OF[d]}曜`);
  if (c.irregular && !/不定/.test(qc)) skip('「不定休」が引用に無い');
  if (holiday && !/祝|祭日|holiday/i.test(qc + qh)) skip('祝日の決まりが引用に無い');
  if (!c.days.size && !c.irregular && !c.yearEnd && !/無休|休まず|年中|(定休日|休業日|店休日)\s*[:：]?\s*\n?\s*なし|定休日なし|open daily|daily|7 days a week|every day|seven days/i.test(qc)) skip('「無休」が引用に無い');

  // 注記
  const noteJa = [];
  const noteEn = [];
  if (h.notes.lo.length) { noteJa.push(`L.O. ${h.notes.lo.join('、')}`); noteEn.push(`Last order ${h.notes.lo.join(', ')}`); }
  if (h.notes.soldOut) { noteJa.push('なくなり次第終了'); noteEn.push('Closes when sold out'); }
  if (c.yearEnd === 'year') { noteJa.push('年末年始は休み'); noteEn.push('Closed over New Year'); }
  if (c.yearEnd === 'jan1') { noteJa.push('元日は休み'); noteEn.push('Closed on 1 January'); }

  const open = {
    week,
    ...(holiday ? { holiday } : {}),
    ...(c.irregular ? { irregular: true } : {}),
    ...(noteJa.length ? { note: { ja: noteJa.join('。'), en: noteEn.join('. ') } } : {}),
    checked,
    source: url,
  };
  return open;
}

// ── 読みこみと実行 ─────────────────────────────────────
function readInputs(paths) {
  const all = {};
  const files = [];
  for (const p of paths) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      for (const f of fs.readdirSync(p).filter((x) => /^OUT-.*\.json$/.test(x)).sort()) files.push(path.join(p, f));
    } else files.push(p);
  }
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [k, v] of Object.entries(data)) if (!(k in all)) all[k] = v;
  }
  return { all, files };
}

function main() {
  const args = process.argv.slice(2);
  const take = (flag) => { const i = args.indexOf(flag); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  const out = take('--out');
  const checked = take('--checked');
  const skippedOut = take('--skipped');
  const sample = take('--sample');
  if (!out || !args.length) {
    console.error('使い方: node scripts/latitude-open-from-text.mjs --out <案.json> [--checked YYYY-MM-DD] [--skipped <読めなかった店.json>] [--sample 10] <VERIFIED.json | OUT-*.json | フォルダ> …');
    process.exit(2);
  }
  if (checked && !/^\d{4}-\d{2}-\d{2}$/.test(checked)) { console.error('--checked は YYYY-MM-DD'); process.exit(2); }
  const libDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../lib');
  if (path.resolve(out).startsWith(libDir + path.sep)) { console.error('lib/ の中には書かない（データに入れるのは別の作業）'); process.exit(2); }

  const { all, files } = readInputs(args);
  const proposals = {};
  const skipped = {};
  const reasons = new Map();
  let irregular = 0;
  for (const [key, rec] of Object.entries(all)) {
    try {
      const open = convert(rec, checked ?? undefined);
      if (open.irregular) irregular++;
      proposals[key] = {
        open,
        from: { hours: rec.hours?.ja ?? rec.hoursJa, closed: rec.closed?.ja ?? rec.closedJa, quoteHours: rec.quoteHours, quoteClosed: rec.quoteClosed, url: rec.url },
      };
    } catch (e) {
      if (!(e instanceof Skip)) throw e;
      skipped[key] = { reason: e.reason, detail: e.detail ?? null, hours: rec.hours?.ja ?? rec.hoursJa ?? null, closed: rec.closed?.ja ?? rec.closedJa ?? null };
      reasons.set(e.reason, (reasons.get(e.reason) ?? 0) + 1);
    }
  }
  fs.writeFileSync(out, JSON.stringify(proposals, null, 1) + '\n');
  if (skippedOut) fs.writeFileSync(skippedOut, JSON.stringify(skipped, null, 1) + '\n');
  const n = Object.keys(all).length;
  const conv = Object.keys(proposals).length;
  console.log(`読んだファイル: ${files.join(', ')}`);
  console.log(`店: ${n} ／ 案にできた: ${conv}（うち不定休 ${irregular}、時間割で状態が出る ${conv - irregular}） ／ 読めなかった: ${n - conv}`);
  console.log('読めなかった理由:');
  for (const [r, k] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${k}  ${r}`);
  console.log(`案: ${out}${skippedOut ? ` ／ 読めなかった店: ${skippedOut}` : ''}`);
  if (sample) {
    const keys = Object.keys(proposals);
    const pick = [];
    let seed = 20261115;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    while (pick.length < Math.min(+sample, keys.length)) { const k = keys[Math.floor(rnd() * keys.length)]; if (!pick.includes(k)) pick.push(k); }
    for (const k of pick) {
      const p = proposals[k];
      console.log(`\n■ ${k}\n  字:   ${p.from.hours} ／ 休み：${p.from.closed}\n  引用: ${JSON.stringify(p.from.quoteHours)} ／ ${JSON.stringify(p.from.quoteClosed)}\n  案:   ${JSON.stringify(p.open.week)}${p.open.holiday ? ` holiday=${p.open.holiday}` : ''}${p.open.irregular ? ' irregular' : ''}${p.open.note ? ` note=${p.open.note.ja}` : ''}`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
