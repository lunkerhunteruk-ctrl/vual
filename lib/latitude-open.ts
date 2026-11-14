// 2026-11-15 LATITUDE 営業時間の「いま」（オーナー決定 2026-11-15）。
// 店の決まった時間割（open.week）から「いまは営業時間内か」を出す、計算だけの部品。React もデータの読みこみも使わない（テストは latitude-open.test.mjs）。
// 決まり:
//  ・「営業中」とは言い切らない。言えるのは「時間割では営業時間内」まで（臨時休業は分からない）。分からない時は何も出さない（unknown）
//  ・時刻の計算は、見る人の時計ではなく、その町の時刻（Intl.DateTimeFormat の timeZone）。日付のライブラリは使わない
//  ・unknown にする時（安全側）: 不定休／確かめた日が無い・12か月より前／年末年始（12/29〜1/3）／日本の町で、祝日の表の外の年・
//    祝日なのに holiday が無い・holiday が "shift" で今日か昨日が祝日・holiday が "open" なのにその曜日が定休日
//  ・日本の外の町は祝日を見ない（曜日の時間割だけ）
// 書き方は docs/latitude-open-hours-format.md。データの確かめは scripts/latitude-open-check.mjs

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export type OpenRange = [string, string]; // ["10:00","17:00"]。閉まる時刻が開く時刻と同じか前なら、夜中の0時を越える。"24:00" も可

export type OpenHours = {
  week: Record<DayKey, OpenRange[]>; // 7つの曜日すべて。[] は定休日。昼と夜で分かれる店は2つ以上
  holiday?: 'open' | 'closed' | 'shift'; // 日本の祝日: open＝その曜日の時間割で営業（定休日でも営業）／closed＝休み／shift＝定休日が祝日なら営業し、次の平日が休み。無い＝分からない
  irregular?: boolean; // 不定休がある
  note?: { ja: string; en: string };
  checked: string; // 確かめた日 YYYY-MM-DD
  source: string; // 確かめた公式のページの URL
};

export type NextOpen = { when: 'today' | 'tomorrow' | 'later'; day: DayKey; time: string };
export type UnknownReason = 'irregular' | 'stale' | 'holiday' | 'year-end' | 'beyond-table' | 'bad-data' | 'no-zone';
export type OpenStatus =
  | { state: 'open'; until: string | null; closingSoon: boolean } // until が null＝7日先まで閉まらない
  | { state: 'closed-now'; next: NextOpen | null } // 今日は開く日だが、いまは時間外
  | { state: 'closed-today'; holiday: boolean; next: NextOpen | null } // 今日は定休日（holiday: 祝日の休み）
  | { state: 'unknown'; reason: UnknownReason };

// ── 日本の祝日 ──────────────────────────────────────────────
// 出どころ: 内閣府「国民の祝日について」https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html
// （同じページの CSV https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv とも突き合わせた。2026-11-14 取得）。
// 振替休日（祝日法第3条第2項）と国民の休日（第3条第3項）を含む。表は 2027年まで（2028年は内閣府が 2027年2月に出す）。
// 表の外の年は、日本の町では unknown（何も出さない）。年を足す時は HOLIDAY_LAST_YEAR も変える
export const HOLIDAY_FIRST_YEAR = 2026;
export const HOLIDAY_LAST_YEAR = 2027;
export const JP_HOLIDAYS: Record<string, string> = {
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '休日（振替休日）',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-22': '休日（国民の休日）',
  '2026-09-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
  '2027-01-01': '元日',
  '2027-01-11': '成人の日',
  '2027-02-11': '建国記念の日',
  '2027-02-23': '天皇誕生日',
  '2027-03-21': '春分の日',
  '2027-03-22': '休日（振替休日）',
  '2027-04-29': '昭和の日',
  '2027-05-03': '憲法記念日',
  '2027-05-04': 'みどりの日',
  '2027-05-05': 'こどもの日',
  '2027-07-19': '海の日',
  '2027-08-11': '山の日',
  '2027-09-20': '敬老の日',
  '2027-09-23': '秋分の日',
  '2027-10-11': 'スポーツの日',
  '2027-11-03': '文化の日',
  '2027-11-23': '勤労感謝の日',
};

// ── 町のタイムゾーン ─────────────────────────────────────────
// 町の国（LatitudeCity.countryCode。無ければ日本）から。タイムゾーンが1つの国だけ。無い国の町は状態を出さない
const ZONES: Record<string, string> = {
  JP: 'Asia/Tokyo',
  GB: 'Europe/London',
  IE: 'Europe/Dublin',
  DK: 'Europe/Copenhagen',
  IT: 'Europe/Rome',
  IS: 'Atlantic/Reykjavik',
  AT: 'Europe/Vienna',
  SE: 'Europe/Stockholm',
  NO: 'Europe/Oslo',
  FI: 'Europe/Helsinki',
  DE: 'Europe/Berlin',
  FR: 'Europe/Paris',
  BE: 'Europe/Brussels',
  NL: 'Europe/Amsterdam',
  CH: 'Europe/Zurich',
  KR: 'Asia/Seoul',
  TW: 'Asia/Taipei',
};
export type TownZone = { tz: string; jp: boolean };
export function townZone(countryCode?: string): TownZone | null {
  const cc = (countryCode ?? 'JP').toUpperCase();
  const tz = ZONES[cc];
  return tz ? { tz, jp: cc === 'JP' } : null;
}

// ── 時刻 ─────────────────────────────────────────────────────
const TIME = /^([01]\d|2[0-4]):([0-5]\d)$/;
export function parseTime(s: unknown): number | null {
  if (typeof s !== 'string') return null;
  const m = TIME.exec(s);
  if (!m) return null;
  const v = +m[1] * 60 + +m[2];
  return v > 1440 ? null : v;
}
// 範囲 → [開く分, 閉まる分]（その日の0時から）。閉まる時刻が開く時刻と同じか前なら翌日（+1440）。開く時刻に 24:00 は使えない
export function rangeMinutes(r: unknown): [number, number] | null {
  if (!Array.isArray(r) || r.length !== 2) return null;
  const a = parseTime(r[0]);
  const b = parseTime(r[1]);
  if (a === null || b === null || a >= 1440) return null;
  return [a, b <= a ? b + 1440 : b];
}
// 9:00 / 17:30（時の頭の0は付けない）。1440 ちょうどは 24:00
export const clock = (min: number) => {
  const m = ((min % 1440) + 1440) % 1440;
  if (m === 0 && min > 0) return '24:00';
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

// その町の、いまの日付と時刻
const FMT = new Map<string, Intl.DateTimeFormat>();
function civil(at: Date, tz: string): { day: number; min: number } | null {
  let f = FMT.get(tz);
  try {
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      FMT.set(tz, f);
    }
    const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
    const day = Date.UTC(+p.year, +p.month - 1, +p.day) / 86_400_000; // 1970-01-01 からの日数（その町の暦）
    if (!Number.isFinite(day)) return null;
    return { day, min: (+p.hour % 24) * 60 + +p.minute };
  } catch {
    return null;
  }
}
const isoOf = (day: number) => new Date(day * 86_400_000).toISOString().slice(0, 10);
const dowOf = (day: number): DayKey => DAY_KEYS[(new Date(day * 86_400_000).getUTCDay() + 6) % 7];
export const isJpHoliday = (iso: string) => iso in JP_HOLIDAYS;

// 確かめた日から12か月を過ぎたか（その町の今日で比べる）。日付が読めない時は null
function isStale(checked: unknown, todayIso: string): boolean | null {
  if (typeof checked !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(checked)) return null;
  const t = Date.parse(`${checked}T00:00:00Z`);
  if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== checked) return null;
  const limit = `${+checked.slice(0, 4) + 1}${checked.slice(4)}`;
  return todayIso > limit;
}

export function isValidWeek(week: unknown): week is Record<DayKey, OpenRange[]> {
  if (!week || typeof week !== 'object') return false;
  return DAY_KEYS.every((k) => {
    const v = (week as Record<string, unknown>)[k];
    return Array.isArray(v) && v.every((r) => rangeMinutes(r) !== null);
  });
}

// ある日の時間割（祝日・年末年始を当てたあと）
type Plan = { known: true; ranges: [number, number][]; holiday: boolean } | { known: false; reason: UnknownReason };
function planFor(o: OpenHours, day: number, jp: boolean): Plan {
  const iso = isoOf(day);
  const md = iso.slice(5);
  if (md >= '12-29' || md <= '01-03') return { known: false, reason: 'year-end' };
  const ranges = o.week[dowOf(day)].map((r) => rangeMinutes(r)!);
  if (jp) {
    const y = +iso.slice(0, 4);
    if (y < HOLIDAY_FIRST_YEAR || y > HOLIDAY_LAST_YEAR) return { known: false, reason: 'beyond-table' };
    const hol = isJpHoliday(iso);
    if (o.holiday === 'shift' && (hol || isJpHoliday(isoOf(day - 1)))) return { known: false, reason: 'holiday' };
    if (hol) {
      if (o.holiday === 'closed') return { known: true, ranges: [], holiday: true };
      if (o.holiday === 'open' && ranges.length) return { known: true, ranges, holiday: false };
      return { known: false, reason: 'holiday' };
    }
  }
  return { known: true, ranges, holiday: false };
}

const LOOK_AHEAD = 7; // 次に開く時刻を探す日数
const SOON = 30; // 閉まるまでこの分以下で「まもなく終了」

// 本体。at はいまの時刻（Date）、zone はその町のタイムゾーンと日本かどうか
export function openStatus(o: OpenHours | undefined | null, at: Date, zone: TownZone | null | undefined): OpenStatus {
  if (!zone) return { state: 'unknown', reason: 'no-zone' };
  if (!o || typeof o !== 'object' || !isValidWeek(o.week)) return { state: 'unknown', reason: 'bad-data' };
  if (o.irregular) return { state: 'unknown', reason: 'irregular' };
  if (typeof o.source !== 'string' || !o.source) return { state: 'unknown', reason: 'bad-data' };
  const now = civil(at, zone.tz);
  if (!now) return { state: 'unknown', reason: 'no-zone' };
  const stale = isStale(o.checked, isoOf(now.day));
  if (stale === null) return { state: 'unknown', reason: 'bad-data' };
  if (stale) return { state: 'unknown', reason: 'stale' };

  const today = planFor(o, now.day, zone.jp);
  if (!today.known) return { state: 'unknown', reason: today.reason };

  // 時間の線（今日の0時からの分）。昨日の夜中を越える分も入れる。分からない日が来たら、そこで先を見るのをやめる
  const spans: [number, number][] = [];
  const yest = planFor(o, now.day - 1, zone.jp);
  if (yest.known) {
    for (const [a, b] of yest.ranges) spans.push([a - 1440, b - 1440]);
  } else {
    // 昨日が分からない日で、昨日の時間割が夜中を越えて今に掛かるなら、いまも分からない
    const spill = Math.max(0, ...o.week[dowOf(now.day - 1)].map((r) => rangeMinutes(r)![1] - 1440));
    if (now.min < spill) return { state: 'unknown', reason: yest.reason };
  }
  let horizon = (LOOK_AHEAD + 1) * 1440;
  for (let k = 0; k <= LOOK_AHEAD; k++) {
    const p = k === 0 ? today : planFor(o, now.day + k, zone.jp);
    if (!p.known) { horizon = k * 1440; break; }
    for (const [a, b] of p.ranges) spans.push([k * 1440 + a, k * 1440 + b]);
  }
  spans.sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }

  const inside = merged.find(([a, b]) => a <= now.min && now.min < b);
  if (inside) {
    const end = inside[1];
    if (end >= (LOOK_AHEAD + 1) * 1440) return { state: 'open', until: null, closingSoon: false };
    return { state: 'open', until: clock(end), closingSoon: end - now.min <= SOON };
  }
  const nx = merged.find(([a]) => a > now.min && a < horizon);
  const next: NextOpen | null = nx
    ? { when: nx[0] < 1440 ? 'today' : nx[0] < 2880 ? 'tomorrow' : 'later', day: dowOf(now.day + Math.floor(nx[0] / 1440)), time: clock(nx[0]) }
    : null;
  if (!today.ranges.length) return { state: 'closed-today', holiday: today.holiday, next };
  return { state: 'closed-now', next };
}

// ── 表示の言葉 ──────────────────────────────────────────────
// 「営業中」「Open now」は使わない（言い切らない）。色が無くても言葉で分かるように
const DAY_JA: Record<DayKey, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };
const DAY_EN: Record<DayKey, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const DAY_EN_PL: Record<DayKey, string> = { mon: 'Mondays', tue: 'Tuesdays', wed: 'Wednesdays', thu: 'Thursdays', fri: 'Fridays', sat: 'Saturdays', sun: 'Sundays' };

export type StatusLine = { text: string; tone: 'open' | 'closed' | 'note' };
export function statusText(s: OpenStatus, ja: boolean): StatusLine | null {
  const nextJa = (n: NextOpen) => (n.when === 'today' ? `本日${n.time}から` : n.when === 'tomorrow' ? `明日${n.time}から` : `${DAY_JA[n.day]}曜${n.time}から`);
  const nextEn = (n: NextOpen) => (n.when === 'today' ? `opens ${n.time} today` : n.when === 'tomorrow' ? `opens ${n.time} tomorrow` : `opens ${DAY_EN[n.day]} ${n.time}`);
  switch (s.state) {
    case 'open':
      if (!s.until) return { text: ja ? '営業時間内' : 'Usually open now', tone: 'open' };
      return s.closingSoon
        ? { text: ja ? `まもなく終了 · ${s.until}まで` : `Closing soon · until ${s.until}`, tone: 'open' }
        : { text: ja ? `営業時間内 · ${s.until}まで` : `Usually open now · until ${s.until}`, tone: 'open' };
    case 'closed-now':
      return { text: ja ? `営業時間外${s.next ? ` · ${nextJa(s.next)}` : ''}` : `Usually closed now${s.next ? ` · ${nextEn(s.next)}` : ''}`, tone: 'closed' };
    case 'closed-today': {
      const head = ja ? (s.holiday ? '本日は祝日で休み' : '本日は定休日') : 'Closed today';
      const n = s.next;
      const tail = n ? (ja ? ` · 次は${n.when === 'today' ? '本日' : `${DAY_JA[n.day]}曜`}${n.time}から` : ` · next open ${n.when === 'today' ? 'today' : DAY_EN[n.day]} ${n.time}`) : '';
      return { text: head + tail, tone: 'closed' };
    }
    case 'unknown':
      if (s.reason === 'irregular') return { text: ja ? '不定休あり' : 'Irregular closing days', tone: 'note' };
      if (s.reason === 'holiday') return { text: ja ? '祝日は営業時間が変わることがあります' : 'Hours may differ on public holidays', tone: 'note' };
      if (s.reason === 'year-end') return { text: ja ? '年末年始は営業時間が変わることがあります' : 'Hours may differ over New Year', tone: 'note' };
      return null;
  }
}

// 確かめた月（小さく灰色で、時間の字のあと）: 2026年11月確認 / checked Nov 2026
const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function checkedText(checked: string, ja: boolean): string | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(checked ?? '');
  if (!m || +m[2] < 1 || +m[2] > 12) return null;
  return ja ? `${m[1]}年${+m[2]}月確認` : `checked ${MONTH_EN[+m[2] - 1]} ${m[1]}`;
}

// ── 時間割から、カードの1行の字を作る（hours / closed の字が無い時だけ使う） ──────────────
// 書き方は、営業時間を調べる人が hours / closed に書く書き方に合わせる（手で書いた行と見た目をそろえる）:時刻は en dash「10:00–17:00」（日本語でも）、
// 昼と夜は「、」（日によって違う時は「・」）、日のまとまりは「、」で区切る。全部の営業日が同じ時間なら曜日は付けない（休みの曜日は「休み：」の方に出る）。
// 例: 「10:00–17:00」＋「休み：月曜」／「平日 11:00–15:00、土日 10:00–17:00」／「11:30–14:00、17:30–21:00」
const rangeText = (r: OpenRange) => `${clock(parseTime(r[0])!)}–${clock(rangeMinutes(r)![1])}`;
function daysLabel(days: DayKey[], ja: boolean, first: boolean): string {
  const key = days.join(',');
  if (key === 'mon,tue,wed,thu,fri') return ja ? '平日' : first ? 'Weekdays' : 'weekdays';
  if (key === 'sat,sun') return ja ? '土日' : first ? 'Weekends' : 'weekends';
  if (days.length === 1) return ja ? DAY_JA[days[0]] : DAY_EN[days[0]];
  if (days.length === 2) return ja ? DAY_JA[days[0]] + DAY_JA[days[1]] : `${DAY_EN[days[0]]}–${DAY_EN[days[1]]}`; // 金土 / Fri–Sat（英語は「,」だと日のまとまりの区切りと紛れる）
  return ja ? `${DAY_JA[days[0]]}〜${DAY_JA[days[days.length - 1]]}` : `${DAY_EN[days[0]]}–${DAY_EN[days[days.length - 1]]}`;
}
export function weekText(o: Pick<OpenHours, 'week'>, ja: boolean): { hours: string; closed?: string } | null {
  if (!isValidWeek(o.week)) return null;
  const sig = DAY_KEYS.map((k) => JSON.stringify(o.week[k]));
  // 並びの始まり：前の日と時間割が違う、最初の曜日（月曜から探す）。全部同じなら月曜
  let s = DAY_KEYS.findIndex((_, i) => sig[i] !== sig[(i + 6) % 7]);
  if (s < 0) s = 0;
  const groups: { days: DayKey[]; ranges: OpenRange[] }[] = [];
  for (let j = 0; j < 7; j++) {
    const i = (s + j) % 7;
    const last = groups[groups.length - 1];
    if (last && JSON.stringify(last.ranges) === sig[i]) last.days.push(DAY_KEYS[i]);
    else groups.push({ days: [DAY_KEYS[i]], ranges: o.week[DAY_KEYS[i]] });
  }
  const open = groups.filter((g) => g.ranges.length);
  const closedDays = DAY_KEYS.filter((k) => !o.week[k].length);
  if (!open.length) return null;
  const hours = open.length === 1
    ? open[0].ranges.map(rangeText).join(ja ? '、' : ', ')
    : open.map((g, n) => `${daysLabel(g.days, ja, n === 0)} ${g.ranges.map(rangeText).join(ja ? '・' : ' & ')}`).join(ja ? '、' : ', ');
  const closed = closedDays.length ? (ja ? closedDays.map((k) => `${DAY_JA[k]}曜`).join('・') : closedDays.map((k) => DAY_EN_PL[k]).join(', ')) : undefined;
  return { hours, ...(closed ? { closed } : {}) };
}
