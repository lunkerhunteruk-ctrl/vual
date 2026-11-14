// 2026-11-15 lib/latitude-open.ts のテスト（node:test。このリポジトリには決まったテストの道具が無いので、Node だけで動かす）。
// 動かし方: node --test lib/latitude-open.test.mjs
// （Node 23.6 以上は .ts をそのまま読める。見る人のタイムゾーンに左右されない事は、下の1つで TZ=America/New_York の子プロセスでも確かめる）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openStatus, statusText, weekText, checkedText, townZone, JP_HOLIDAYS } from './latitude-open.ts';

const JP = townZone('JP');
const GB = townZone('GB');
const jst = (s) => new Date(`${s}+09:00`);
const base = (week, extra = {}) => ({ week: { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [], ...week }, checked: '2026-11-10', source: 'https://example.jp/', ...extra });
const ten17 = [['10:00', '17:00']];
// 月曜定休、火〜日 10:00–17:00
const cafe = base({ tue: ten17, wed: ten17, thu: ten17, fri: ten17, sat: ten17, sun: ten17 });
const lunchDinner = [['11:30', '14:00'], ['17:00', '21:00']];
const diner = base({ mon: lunchDinner, tue: lunchDinner, wed: lunchDinner, thu: lunchDinner, fri: lunchDinner, sat: lunchDinner, sun: lunchDinner });
const txt = (s, ja = true) => statusText(s, ja)?.text ?? null;

// 2026-11-17 火 / 11-16 月 / 11-23 月（勤労感謝の日）/ 11-03 火（文化の日）
test('inside a range', () => {
  const s = openStatus(cafe, jst('2026-11-17T12:00'), JP);
  assert.deepEqual(s, { state: 'open', until: '17:00', closingSoon: false });
  assert.equal(txt(s), '営業時間内 · 17:00まで');
  assert.equal(txt(s, false), 'Usually open now · until 17:00');
});

test('before opening', () => {
  const s = openStatus(cafe, jst('2026-11-17T08:15'), JP);
  assert.deepEqual(s, { state: 'closed-now', next: { when: 'today', day: 'tue', time: '10:00' } });
  assert.equal(txt(s), '営業時間外 · 本日10:00から');
  assert.equal(txt(s, false), 'Usually closed now · opens 10:00 today');
});

test('between lunch and dinner', () => {
  const s = openStatus(diner, jst('2026-11-17T15:00'), JP);
  assert.deepEqual(s, { state: 'closed-now', next: { when: 'today', day: 'tue', time: '17:00' } });
  assert.equal(txt(s), '営業時間外 · 本日17:00から');
});

test('after closing → next is tomorrow', () => {
  const s = openStatus(cafe, jst('2026-11-17T17:00'), JP); // 17:00 ちょうどは閉まっている
  assert.deepEqual(s, { state: 'closed-now', next: { when: 'tomorrow', day: 'wed', time: '10:00' } });
  assert.equal(txt(s), '営業時間外 · 明日10:00から');
  assert.equal(txt(s, false), 'Usually closed now · opens 10:00 tomorrow');
});

test('after closing, tomorrow is the closing day → named weekday', () => {
  const s = openStatus(cafe, jst('2026-11-15T18:00'), JP); // 日曜の夜、月曜定休
  assert.deepEqual(s, { state: 'closed-now', next: { when: 'later', day: 'tue', time: '10:00' } });
  assert.equal(txt(s), '営業時間外 · 火曜10:00から');
  assert.equal(txt(s, false), 'Usually closed now · opens Tue 10:00');
});

test('closing day → next open is a named weekday', () => {
  const s = openStatus(cafe, jst('2026-11-16T12:00'), JP);
  assert.deepEqual(s, { state: 'closed-today', holiday: false, next: { when: 'tomorrow', day: 'tue', time: '10:00' } });
  assert.equal(txt(s), '本日は定休日 · 次は火曜10:00から');
  assert.equal(txt(s, false), 'Closed today · next open Tue 10:00');
  // 月・火定休なら、次は水曜
  const two = base({ wed: [['09:00', '17:00']], thu: ten17, fri: ten17, sat: ten17, sun: ten17 });
  assert.equal(txt(openStatus(two, jst('2026-11-16T12:00'), JP)), '本日は定休日 · 次は水曜9:00から');
  assert.equal(txt(openStatus(two, jst('2026-11-16T12:00'), JP), false), 'Closed today · next open Wed 9:00');
});

test('past midnight', () => {
  const bar = base({ fri: [['18:00', '01:00']], sat: [], thu: [['18:00', '24:00']] }, { holiday: 'closed' }); // 11-23（月）が祝日なので holiday を決めておく
  // 土曜 0:40（金曜の夜の続き。閉まるまで20分）
  let s = openStatus(bar, jst('2026-11-21T00:40'), JP);
  assert.deepEqual(s, { state: 'open', until: '1:00', closingSoon: true });
  // 土曜 0:00 ちょうども開いている
  assert.equal(openStatus(bar, jst('2026-11-21T00:00'), JP).state, 'open');
  // 土曜 2:00 は、土曜が定休日なので closed-today
  s = openStatus(bar, jst('2026-11-21T02:00'), JP);
  assert.equal(s.state, 'closed-today');
  assert.deepEqual(s.next, { when: 'later', day: 'thu', time: '18:00' });
  // 金曜 23:00 は 1:00 まで
  assert.deepEqual(openStatus(bar, jst('2026-11-20T23:00'), JP), { state: 'open', until: '1:00', closingSoon: false });
  // 24:00 も読める
  assert.deepEqual(openStatus(bar, jst('2026-11-19T23:00'), JP), { state: 'open', until: '24:00', closingSoon: false });
});

test('closing soon (≤30 minutes)', () => {
  assert.deepEqual(openStatus(cafe, jst('2026-11-17T16:30'), JP), { state: 'open', until: '17:00', closingSoon: true });
  assert.deepEqual(openStatus(cafe, jst('2026-11-17T16:29'), JP), { state: 'open', until: '17:00', closingSoon: false });
  assert.equal(txt(openStatus(cafe, jst('2026-11-17T16:45'), JP)), 'まもなく終了 · 17:00まで');
  assert.equal(txt(openStatus(cafe, jst('2026-11-17T16:45'), JP), false), 'Closing soon · until 17:00');
});

test('holiday: closed', () => {
  const s = openStatus({ ...cafe, holiday: 'closed' }, jst('2026-11-03T12:00'), JP);
  assert.deepEqual(s, { state: 'closed-today', holiday: true, next: { when: 'tomorrow', day: 'wed', time: '10:00' } });
  assert.equal(txt(s), '本日は祝日で休み · 次は水曜10:00から');
  assert.equal(txt(s, false), 'Closed today · next open Wed 10:00');
  // 前の日の夜：次に開くのは祝日の次の日
  assert.deepEqual(openStatus({ ...cafe, holiday: 'closed' }, jst('2026-11-02T20:00'), JP).next, { when: 'later', day: 'wed', time: '10:00' });
});

test('holiday: open', () => {
  assert.equal(openStatus({ ...cafe, holiday: 'open' }, jst('2026-11-03T12:00'), JP).state, 'open');
  // 定休日（月）が祝日で "open"：その日の時間が分からないので unknown
  assert.deepEqual(openStatus({ ...cafe, holiday: 'open' }, jst('2026-11-23T12:00'), JP), { state: 'unknown', reason: 'holiday' });
});

test('holiday: missing → unknown, with the holiday line', () => {
  const s = openStatus(cafe, jst('2026-11-03T12:00'), JP);
  assert.deepEqual(s, { state: 'unknown', reason: 'holiday' });
  assert.equal(txt(s), '祝日は営業時間が変わることがあります');
  assert.equal(txt(s, false), 'Hours may differ on public holidays');
  // 次に開く日を探す途中に分からない祝日があれば、次の時刻は言わない
  assert.deepEqual(openStatus(cafe, jst('2026-11-02T20:00'), JP), { state: 'closed-today', holiday: false, next: null });
  assert.equal(txt(openStatus(cafe, jst('2026-11-02T20:00'), JP)), '本日は定休日');
  // 振替休日・国民の休日も祝日
  assert.equal(openStatus(diner, jst('2026-05-06T12:00'), JP).state, 'unknown');
  assert.equal(openStatus(diner, jst('2026-09-22T12:00'), JP).state, 'unknown');
  assert.equal(openStatus(diner, jst('2027-03-22T12:00'), JP).state, 'unknown');
});

test('holiday: shift → unknown on the holiday and the day after', () => {
  const shift = { ...cafe, holiday: 'shift' };
  assert.deepEqual(openStatus(shift, jst('2026-11-23T12:00'), JP), { state: 'unknown', reason: 'holiday' });
  assert.deepEqual(openStatus(shift, jst('2026-11-24T12:00'), JP), { state: 'unknown', reason: 'holiday' });
  assert.equal(openStatus(shift, jst('2026-11-25T12:00'), JP).state, 'open');
  // 祝日でない月曜はふつうの定休日
  assert.equal(openStatus(shift, jst('2026-11-16T12:00'), JP).state, 'closed-today');
});

test('irregular closing days', () => {
  const s = openStatus({ ...cafe, irregular: true }, jst('2026-11-17T12:00'), JP);
  assert.deepEqual(s, { state: 'unknown', reason: 'irregular' });
  assert.equal(txt(s), '不定休あり');
  assert.equal(txt(s, false), 'Irregular closing days');
});

test('checked: stale or missing', () => {
  assert.deepEqual(openStatus({ ...cafe, checked: '2025-11-16' }, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'stale' });
  assert.equal(openStatus({ ...cafe, checked: '2025-11-17' }, jst('2026-11-17T12:00'), JP).state, 'open'); // ちょうど12か月は、まだ使う
  assert.deepEqual(openStatus({ ...cafe, checked: undefined }, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
  assert.deepEqual(openStatus({ ...cafe, checked: '2026-02-30' }, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
  assert.equal(statusText({ state: 'unknown', reason: 'stale' }, true), null);
});

test('year-end (Dec 29 – Jan 3) → unknown', () => {
  for (const d of ['2026-12-29T12:00', '2026-12-31T12:00', '2027-01-03T12:00']) {
    assert.deepEqual(openStatus(cafe, jst(d), JP), { state: 'unknown', reason: 'year-end' });
  }
  assert.equal(txt(openStatus(cafe, jst('2026-12-30T12:00'), JP)), '年末年始は営業時間が変わることがあります');
  assert.equal(openStatus(cafe, jst('2027-01-05T12:00'), JP).state, 'open');
  // 12/28 の夜：次に開く時刻は、年末年始のせいで言わない
  assert.deepEqual(openStatus(cafe, jst('2026-12-28T20:00'), JP), { state: 'closed-today', holiday: false, next: null });
  // 年末年始は日本の外の町でも unknown
  assert.deepEqual(openStatus(cafe, new Date('2026-12-31T12:00:00Z'), GB), { state: 'unknown', reason: 'year-end' });
});

test('beyond the holiday table → unknown (Japan)', () => {
  assert.deepEqual(openStatus({ ...cafe, checked: '2028-01-20' }, jst('2028-02-01T12:00'), JP), { state: 'unknown', reason: 'beyond-table' });
  assert.deepEqual(openStatus({ ...cafe, checked: '2025-06-01' }, jst('2025-06-03T12:00'), JP), { state: 'unknown', reason: 'beyond-table' });
  // 表の最後の日の夜：次に開くのは表の外なので言わない（2027-12-28 は火曜。翌日から年末年始）
  assert.equal(openStatus({ ...cafe, checked: '2027-12-01' }, jst('2027-12-28T20:00'), JP).next, null);
});

test('a town outside Japan ignores Japanese holidays and uses its own clock', () => {
  // 2026-11-03 12:00 in London（日本の文化の日。holiday が無くても曜日の時間割で出す）
  const s = openStatus(cafe, new Date('2026-11-03T12:00:00Z'), GB);
  assert.deepEqual(s, { state: 'open', until: '17:00', closingSoon: false });
  // 同じ瞬間、日本の町なら 21:00 の祝日 → unknown
  assert.equal(openStatus(cafe, new Date('2026-11-03T12:00:00Z'), JP).state, 'unknown');
  // 夏時間（2026-07-01 は BST = UTC+1）：09:30Z はロンドンの 10:30
  assert.equal(openStatus(cafe, new Date('2026-07-01T09:30:00Z'), GB).state, 'open');
  assert.equal(openStatus(cafe, new Date('2026-07-01T08:30:00Z'), GB).state, 'closed-now');
  // 2028 年でも日本の外は祝日の表を見ない
  assert.equal(openStatus({ ...cafe, checked: '2028-01-20' }, new Date('2028-02-01T12:00:00Z'), GB).state, 'open');
  // タイムゾーンが分からない国は unknown
  assert.equal(townZone('US'), null);
  assert.deepEqual(openStatus(cafe, new Date(), null), { state: 'unknown', reason: 'no-zone' });
});

test('the viewer’s own time zone does not matter (TZ=America/New_York)', () => {
  const at = '2026-11-17T23:30:00Z'; // 東京は 11-18（水）8:30、ニューヨークは 11-17（火）18:30
  const here = openStatus(cafe, new Date(at), JP);
  assert.deepEqual(here, { state: 'closed-now', next: { when: 'today', day: 'wed', time: '10:00' } });
  const mod = fileURLToPath(new URL('./latitude-open.ts', import.meta.url));
  const code = `import(${JSON.stringify(mod)}).then((m) => { const s = m.openStatus(${JSON.stringify(cafe)}, new Date(${JSON.stringify(at)}), m.townZone('JP')); console.log(JSON.stringify({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone, local: new Date(${JSON.stringify(at)}).getDate(), s })); })`;
  const out = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, TZ: 'America/New_York' } }).toString());
  assert.equal(out.tz, 'America/New_York');
  assert.equal(out.local, 17); // 子プロセスの時計は本当にニューヨーク
  assert.deepEqual(out.s, here);
});

test('bad data → unknown', () => {
  assert.deepEqual(openStatus(base({ tue: [['9:00', '17:00']] }), jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
  assert.deepEqual(openStatus({ ...cafe, week: { ...cafe.week, sun: undefined } }, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
  assert.deepEqual(openStatus({ ...cafe, source: '' }, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
  assert.deepEqual(openStatus(undefined, jst('2026-11-17T12:00'), JP), { state: 'unknown', reason: 'bad-data' });
});

test('never says 営業中 / Open now', () => {
  const all = [
    { state: 'open', until: '17:00', closingSoon: false }, { state: 'open', until: null, closingSoon: false },
    { state: 'open', until: '17:00', closingSoon: true },
  ];
  for (const s of all) for (const ja of [true, false]) {
    const t = statusText(s, ja).text;
    assert.ok(!t.includes('営業中') && !/^Open now/.test(t), t);
  }
});

test('text from the week', () => {
  assert.deepEqual(weekText(cafe, true), { hours: '10:00–17:00', closed: '月曜' });
  assert.deepEqual(weekText(cafe, false), { hours: '10:00–17:00', closed: 'Mondays' });
  assert.deepEqual(weekText(diner, true), { hours: '11:30–14:00、17:00–21:00' });
  assert.deepEqual(weekText(diner, false), { hours: '11:30–14:00, 17:00–21:00' });
  const split = base({ mon: [['11:00', '15:00']], tue: [['11:00', '15:00']], wed: [['11:00', '15:00']], thu: [['11:00', '15:00']], fri: [['11:00', '15:00']], sat: ten17, sun: ten17 });
  assert.deepEqual(weekText(split, true), { hours: '平日 11:00–15:00、土日 10:00–17:00' });
  assert.deepEqual(weekText(split, false), { hours: 'Weekdays 11:00–15:00, weekends 10:00–17:00' });
  // 水曜定休で、木〜火（週をまたぐ）
  const wed = base({ mon: ten17, tue: ten17, thu: ten17, fri: ten17, sat: ten17, sun: ten17 });
  assert.deepEqual(weekText(wed, true), { hours: '10:00–17:00', closed: '水曜' });
  // 日によって違う昼と夜
  const mixed = base({ wed: [['17:30', '21:00']], thu: [['17:30', '21:00']], fri: [['17:30', '21:00']], sat: [['12:00', '14:00'], ['17:30', '21:00']], sun: [['12:00', '14:00'], ['17:30', '21:00']] });
  assert.deepEqual(weekText(mixed, true), { hours: '水〜金 17:30–21:00、土日 12:00–14:00・17:30–21:00', closed: '月曜・火曜' });
  assert.deepEqual(weekText(mixed, false), { hours: 'Wed–Fri 17:30–21:00, weekends 12:00–14:00 & 17:30–21:00', closed: 'Mondays, Tuesdays' });
  // 夜中を越える
  assert.deepEqual(weekText(base({ fri: [['18:00', '01:00']], sat: [['18:00', '01:00']] }), true), { hours: '18:00–1:00', closed: '月曜・火曜・水曜・木曜・日曜' });
});

test('checked date text', () => {
  assert.equal(checkedText('2026-11-15', true), '2026年11月確認');
  assert.equal(checkedText('2026-11-15', false), 'checked Nov 2026');
  assert.equal(checkedText('2026-13-01', true), null);
});

test('holiday table: 2026 and 2027, with substitute and citizens’ holidays', () => {
  const ks = Object.keys(JP_HOLIDAYS);
  assert.equal(ks.filter((k) => k.startsWith('2026')).length, 18);
  assert.equal(ks.filter((k) => k.startsWith('2027')).length, 17);
  for (const k of ['2026-05-06', '2026-09-22', '2027-03-22']) assert.ok(k in JP_HOLIDAYS, k);
});
