// 2026-11-08 LATITUDE の制作ノート（号ごとに、監督がどう作ったかの記録）を vual.jp でも読めるようにする。
// それまで本文は note（日本語）と Substack（英語）にしか無く、vual.jp の号のページは約600語だけだった。
// 検索と AI の引用で「元」として扱われるよう、全文をここに置く（note・Substack は読者の集まる場所として続ける）。
// データは vault.vual.jp outputs/latitude-notes/to_site.py が NOTE-*/note.ja.md・web.md から作る（data/latitude-notes/<slug>.json）。
import iceland from '@/data/latitude-notes/iceland.json';
import copenhagen from '@/data/latitude-notes/copenhagen.json';
import london from '@/data/latitude-notes/london.json';
import edinburgh from '@/data/latitude-notes/edinburgh.json';
import milan from '@/data/latitude-notes/milan.json';
import faro from '@/data/latitude-notes/faro.json';
import kanazawa from '@/data/latitude-notes/kanazawa.json';
import vienna from '@/data/latitude-notes/vienna.json';
import haworth from '@/data/latitude-notes/haworth.json';
import morioka from '@/data/latitude-notes/morioka.json';
import reggio from '@/data/latitude-notes/reggio.json';

export type NoteRun = { s: string; b?: boolean };
export type NoteBlock =
  | { t: 'p'; c: NoteRun[] }
  | { t: 'h'; s: string }
  | { t: 'ul' | 'ol'; items: NoteRun[][] }
  | { t: 'img'; k: string; src: string; cap: string }
  | { t: 'sign'; s: string };
export type NoteBody = { title: string; subtitle?: string; blocks: NoteBlock[] };
export type IssueNote = { slug: string; ja: NoteBody; en: NoteBody };

const ALL = [iceland, copenhagen, london, edinburgh, milan, faro, kanazawa, vienna, haworth, morioka, reggio] as unknown as IssueNote[];

export const NOTES: Record<string, IssueNote> = Object.fromEntries(ALL.map((n) => [n.slug, n]));
export const getNote = (slug: string) => NOTES[slug];

// 検索の説明文に使う、本文の最初の段落（字数を切る）
export const noteLead = (b: NoteBody, max = 160) => {
  const p = b.blocks.find((x) => x.t === 'p') as { c: NoteRun[] } | undefined;
  const s = p ? p.c.map((r) => r.s).join('') : b.subtitle ?? '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
};

// 本文の文字だけ（構造化データの wordCount などに使う）
export const noteText = (b: NoteBody) =>
  b.blocks
    .map((x) => (x.t === 'p' ? x.c.map((r) => r.s).join('') : x.t === 'h' || x.t === 'sign' ? x.s : x.t === 'img' ? x.cap : 'items' in x ? x.items.map((i) => i.map((r) => r.s).join('')).join(' ') : ''))
    .join('\n');
