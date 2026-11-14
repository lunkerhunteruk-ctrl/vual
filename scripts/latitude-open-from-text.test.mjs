// 2026-11-15 scripts/latitude-open-from-text.mjs の読み方のテスト。動かし方: node --test scripts/latitude-open-from-text.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convert, parseClosed, parseHours } from './latitude-open-from-text.mjs';

const rec = (hours, closed, quoteHours, quoteClosed, url = 'https://example.jp/') => ({ hours: { ja: hours }, closed: { ja: closed }, quoteHours, quoteClosed, url });
const T = (a, b) => [a, b];
const all = (r) => Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, r]));
const reason = (fn) => { try { fn(); return null; } catch (e) { return e.reason ?? e.message; } };

test('single range + one closing day', () => {
  const o = convert(rec('10:00–17:00', '水曜', '営業時間 10:00〜17:00', '定休日 水曜日'), '2026-11-14');
  assert.deepEqual(o.week, { ...all([T('10:00', '17:00')]), wed: [] });
  assert.equal(o.checked, '2026-11-14');
  assert.equal(o.source, 'https://example.jp/');
  assert.equal(o.holiday, undefined); // 書いていない祝日の決まりは付けない
  assert.equal(o.irregular, undefined);
});

test('lunch / dinner pair with L.O. → note', () => {
  const o = convert(rec('11:30–14:00（L.O. 13:30）、17:30–21:00（L.O. 20:30）', '月曜', 'ランチ 11:30-14:00(L.O 13:30) ディナー 17:30-21:00(L.O 20:30)', '月曜定休'), '2026-11-14');
  assert.deepEqual(o.week.tue, [T('11:30', '14:00'), T('17:30', '21:00')]);
  assert.deepEqual(o.week.mon, []);
  assert.deepEqual(o.note, { ja: 'L.O. 13:30、20:30', en: 'Last order 13:30, 20:30' });
});

test('平日 / 土日 split, closing day inside 平日', () => {
  const o = convert(rec('平日 11:00–15:00、土日 10:00–17:00', '水曜', '平日 11時00分~15時00分 土日 10時~17時', '定休日:水曜日'), '2026-11-14');
  assert.deepEqual(o.week, { mon: [T('11:00', '15:00')], tue: [T('11:00', '15:00')], wed: [], thu: [T('11:00', '15:00')], fri: [T('11:00', '15:00')], sat: [T('10:00', '17:00')], sun: [T('10:00', '17:00')] });
});

test('explicit weekday lists', () => {
  const o = convert(rec('月–水 10:00–16:00、木 10:00–17:00、金 10:00–15:00', '土曜・日曜', 'Mon-Wed 10:00 AM - 4:00 PM, Thu 10:00 AM - 5:00 PM, Fri 10 AM - 3 PM', 'Saturday-Sunday: Closed'), '2026-11-14');
  assert.deepEqual(o.week.thu, [T('10:00', '17:00')]);
  assert.deepEqual(o.week.fri, [T('10:00', '15:00')]);
  assert.deepEqual(o.week.sat, []);
  // 「水〜日」と「月曜・火曜」
  const p = convert(rec('水〜日 8:00–17:00', '月曜・火曜', '8:00~17:00', '月・火定休'), '2026-11-14');
  assert.deepEqual(p.week.mon, []);
  assert.deepEqual(p.week.sun, [T('08:00', '17:00')]);
});

test('無休, and 無休（元日を除く） / 元日 / 年末年始のみ', () => {
  assert.deepEqual(convert(rec('9:00–18:00', '無休', '9:00~18:00', '年中無休'), '2026-11-14').week, all([T('09:00', '18:00')]));
  const j = convert(rec('9:00–18:00', '無休（元日を除く）', '9:00~18:00', '年中無休 ※元日をのぞく'), '2026-11-14');
  assert.deepEqual(j.week, all([T('09:00', '18:00')]));
  assert.equal(j.note.ja, '元日は休み');
  assert.equal(convert(rec('10:00–17:00', '年末年始のみ（それ以外は無休）', '10:00~17:00', '店休日:年末年始のみ'), '2026-11-14').note.en, 'Closed over New Year');
});

test('holiday rules only when written', () => {
  assert.equal(convert(rec('10:00–18:00', '水曜（祝日は営業）', '10:00~18:00', '水曜定休（祝日は営業）'), '2026-11-14').holiday, 'open');
  assert.equal(convert(rec('10:00–18:00', '火曜（祝日の場合は翌日）', '10:00~18:00', '火曜定休（祝日の場合は翌日）'), '2026-11-14').holiday, 'shift');
  assert.equal(convert(rec('10:00–18:00', '月曜（祝日の場合は翌火曜）', '10:00~18:00', '月曜日（祝日の場合は翌火曜日）'), '2026-11-14').holiday, 'shift');
  assert.equal(convert(rec('10:00–18:00', '日曜・祝日', '10:00~18:00', '日曜・祝日休み'), '2026-11-14').holiday, 'closed');
  // 「土日祝」が同じ時間なら open と同じ
  assert.equal(convert(rec('平日 10:00–18:00、土日祝 10:00–18:00', '無休', '10:00~18:00', '年中無休 土日祝も営業'), '2026-11-14').holiday, 'open');
});

test('不定休 → irregular', () => {
  const o = convert(rec('10:00–17:00', '不定休', '10:00~17:00', '不定休'), '2026-11-14');
  assert.equal(o.irregular, true);
  assert.deepEqual(o.week, all([T('10:00', '17:00')]));
  assert.equal(convert(rec('10:00–17:00', '火曜・不定休', '10:00~17:00', '火曜日・不定休'), '2026-11-14').irregular, true);
  assert.equal(convert(rec('10:00–17:00', '水曜（不定休あり）', '10:00~17:00', '水曜定休（不定休あり）'), '2026-11-14').irregular, true);
  // 「臨時休業あり」は不定休にしない
  assert.equal(convert(rec('10:00–17:00', '無休（臨時休業あり）', '10:00~17:00', '年中無休 ※臨時休業あり'), '2026-11-14').irregular, undefined);
});

test('rejected: seasonal, reservation, unclear, partial', () => {
  const r = (h, c, qh = h, qc = c) => reason(() => convert(rec(h, c, qh, qc), '2026-11-14'));
  assert.equal(r('3〜10月 10:00–18:00、11〜2月 10:00–17:00', '火曜'), '季節・月で時間が変わる');
  assert.equal(r('平日 11:00–15:00、土日祝 11:00–16:00（夜の部は要予約）', '水曜'), '知らない注記');
  assert.equal(r('9:30–17:00（季節により異なる）', '月曜'), '季節・月で時間が変わる');
  assert.equal(r('9:30–17:00（予約優先）', '月曜'), '知らない注記');
  assert.equal(r('11:30–14:30、17:00–24:00頃', '月曜'), '時刻がはっきりしない（頃・から）');
  assert.equal(r('10:00–17:00', '第1・第3日曜'), '月の何週目かの休み（第1・第3など）');
  assert.equal(r('10:00–17:00', '月曜（祝日により変動あり）'), '休みのかっこの中が読めない');
  assert.equal(r('平日 10:00–17:00、土日祝 10:00–18:00', '水曜'), '祝日は別の時間（その曜日の時間割では表せない）');
  assert.equal(r('平日 11:30–14:00', '火曜'), 'どちらにも書いていない曜日がある');
  assert.equal(r('10:00–17:00', '火曜（大安を除く）'), '休みのかっこの中が読めない');
  assert.equal(r('10:00–17:00（土曜は午前のみ）', '日曜'), '知らない注記');
  assert.equal(r('10:00–17:00 ※冬季短縮', '日曜'), '※の注記');
  assert.equal(reason(() => convert({ hours: { ja: '10:00–17:00' }, quoteHours: '10:00~17:00', url: 'https://x.jp/' }, '2026-11-14')), '休みが無い');
  // 引用に無い時刻・曜日は出さない
  assert.equal(r('10:00–18:00', '水曜', '営業時間 10:00~17:00', '定休日 水曜日'), '時刻が引用に無い');
  assert.equal(r('10:00–18:00', '水曜', '10:00~18:00', '定休日 木曜日'), '休みの曜日が引用に無い');
});

test('parsers on their own', () => {
  assert.deepEqual(parseClosed('火・水曜（祝日は営業）'), { days: new Set(['tue', 'wed']), holiday: 'open', irregular: false, yearEnd: null });
  assert.deepEqual(parseClosed('日曜・月曜・祝日').holiday, 'closed');
  assert.equal(parseHours('水–金 17:30–21:00、土日 12:00–14:00・17:30–21:00').groups.length, 2);
});
