// 2026-11-14 ③-2 行きたい店の保存（端末の中だけ。ログインなし・サーバーへは送らない）。
// 入れ物は localStorage の鍵1つ。中身は [{ c: 街の slug, id: 店の id（#place-…。英語の店名から作る）, t: 保存した時刻 }]。
// 壊れた中身・使えない localStorage（プライベートの窓・容量いっぱい）でも落ちない（空として扱い、書けなければ何もしない）。
// 同じ画面の中の部品どうしは 'latitude:saved' の知らせで、ほかのタブとは storage イベントで合わせる。
// このファイルは 'use client' を付けない（ブラウザの部品から読むだけ。サーバーでは空として振る舞う）

export type SavedItem = { c: string; id: string; t: number };
export const SAVED_KEY = 'latitude:saved:v1';
const EVENT = 'latitude:saved';
const EMPTY: SavedItem[] = [];

const valid = (x: unknown): x is SavedItem =>
  !!x && typeof x === 'object' && typeof (x as SavedItem).c === 'string' && typeof (x as SavedItem).id === 'string'
  && /^[a-z0-9-]{1,80}$/.test((x as SavedItem).c) && /^place-[a-z0-9-]{1,120}$/.test((x as SavedItem).id);

let cacheRaw: string | null | undefined;
let cacheList: SavedItem[] = EMPTY;

function readRaw(): string | null {
  try { return window.localStorage.getItem(SAVED_KEY); } catch { return null; }
}

// いまの一覧（同じ中身なら同じ配列を返す。useSyncExternalStore のため）
export function savedSnapshot(): SavedItem[] {
  if (typeof window === 'undefined') return EMPTY;
  const raw = readRaw();
  if (raw === cacheRaw) return cacheList;
  cacheRaw = raw;
  let list: SavedItem[] = EMPTY;
  try {
    const v = raw ? JSON.parse(raw) : [];
    if (Array.isArray(v)) {
      const seen = new Set<string>();
      list = v.filter(valid).filter((x) => { const k = `${x.c}/${x.id}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .map((x) => ({ c: x.c, id: x.id, t: typeof x.t === 'number' ? x.t : 0 }));
    }
  } catch { list = EMPTY; }
  cacheList = list;
  return list;
}
export const savedServerSnapshot = () => EMPTY;

function write(list: SavedItem[]) {
  try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* 書けない端末では保存できない（画面は止めない） */ }
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* */ }
}

export function subscribeSaved(cb: () => void) {
  const on = (e: Event) => { if (e.type === EVENT || (e as StorageEvent).key === SAVED_KEY || (e as StorageEvent).key === null) cb(); };
  window.addEventListener(EVENT, on);
  window.addEventListener('storage', on);
  return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
}

export const isSaved = (list: SavedItem[], c: string, id: string) => list.some((x) => x.c === c && x.id === id);

// 保存・外す（書けなかった時は false）
export function toggleSaved(c: string, id: string): boolean {
  const list = savedSnapshot();
  const next = isSaved(list, c, id) ? list.filter((x) => !(x.c === c && x.id === id)) : [...list, { c, id, t: Date.now() }];
  write(next);
  return savedSnapshot().length === next.length;
}

// 共有されたリンクの店をまとめて足す（同じ店は足さない。順はいまの一覧のあと）
export function addSaved(items: { c: string; id: string }[]) {
  const list = savedSnapshot();
  const add = items.filter((x) => valid({ ...x, t: 0 }) && !isSaved(list, x.c, x.id));
  if (add.length) write([...list, ...add.map((x, k) => ({ c: x.c, id: x.id, t: Date.now() + k }))]);
  return add.length;
}

// 共有の URL：?s=街:店,店;街:店（店の id の頭の「place-」は省く）。データに無い物は、読む側で黙って飛ばす
export function encodeShare(items: { c: string; id: string }[]) {
  const by = new Map<string, string[]>();
  for (const x of items) by.set(x.c, [...(by.get(x.c) || []), x.id.replace(/^place-/, '')]);
  return [...by].map(([c, ids]) => `${c}:${ids.join(',')}`).join(';');
}
export function decodeShare(s: string | undefined | null): { c: string; id: string }[] {
  if (!s) return [];
  const out: { c: string; id: string }[] = [];
  for (const part of String(s).slice(0, 4000).split(';')) {
    const [c, ids] = part.split(':');
    if (!c || !ids) continue;
    for (const raw of ids.split(',')) {
      const x = { c: c.trim(), id: `place-${raw.trim()}` };
      if (valid({ ...x, t: 0 }) && !out.some((y) => y.c === x.c && y.id === x.id)) out.push(x);
    }
  }
  return out;
}
