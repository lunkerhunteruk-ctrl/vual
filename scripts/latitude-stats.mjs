#!/usr/bin/env node
// 2026-10-30 LATITUDE の街のページと旅人の会話の手応えを数える（検索の数字が出る前の、いちばん早い手がかり）。
// 使い方: node scripts/latitude-stats.mjs [日数=7]
// 1. サイトの記録（Supabase Storage の latitude-logs）：会話に入った回数・通話の回数・「凛に聞く」・送った数・店のリンク
// 2. ElevenLabs の会話の記録：1回の会話で何往復したか・長さ・言語（記録は30日で消える）
// 会話の中身は読まない（数だけ）。私たち自身の試し（localhost から入った分）も数に入るので、公開前の数字は参考程度。
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const days = Number(process.argv[2] || 7);
const AGENTS = { text: 'agent_7901m65xnakse66s2ve1330w12av', call: 'agent_9601m65swfnhe8ztv973cy31vrar' }; // lib/latitude-rooms.ts と同じ
const dates = [...Array(days)].map((_, i) => new Date(Date.now() + 9 * 3600e3 - i * 86400e3).toISOString().slice(0, 10));

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const list = async (dir) => {
  const { data } = await s.storage.from('latitude-logs').list(dir, { limit: 1000 });
  return (data || []).filter((o) => o.name.endsWith('.json')).map((o) => `${dir}/${o.name}`);
};
const read = async (path) => {
  const { data } = await s.storage.from('latitude-logs').download(path);
  try { return JSON.parse(await data.text()); } catch { return {}; }
};
const people = (names) => new Set(names.map((n) => n.split('/').pop().split('__')[0])).size;
const tally = (rows, key) => Object.entries(rows.reduce((m, r) => ((m[r[key] || '—'] = (m[r[key] || '—'] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);

console.log(`\n■ サイトの記録（日本時間 ${dates.at(-1)} 〜 ${dates[0]}）`);
for (const [label, kind] of [['文字の会話に入った', 'room-text/rin'], ['通話した', 'room-call/rin']]) {
  const names = (await Promise.all(dates.map((d) => list(`${kind}/${d}`)))).flat();
  const rows = await Promise.all(names.map(read));
  console.log(`- ${label}：${names.length}回（${people(names)}人）`, tally(rows, 'page').map(([p, n]) => `${p} ${n}`).join(' / '));
}
for (const [label, e] of [['「凛に聞く」を開いた', 'ask_open'], ['店の「凛に聞く」', 'ask_shop'], ['凛に送った・話した', 'msg'], ['店のリンクを押した', 'link']]) {
  const names = (await Promise.all(dates.map((d) => list(`track/${e}/${d}`)))).flat();
  const rows = e === 'ask_open' ? [] : await Promise.all(names.map(read));
  let extra = '';
  if (e === 'ask_shop') extra = tally(rows, 'shop').slice(0, 8).map(([k, n]) => `${k} ${n}`).join(' / ');
  if (e === 'msg') extra = tally(rows, 'mode').map(([k, n]) => `${k === 'call' ? '通話' : '文字'} ${n}`).join(' / ');
  if (e === 'link') extra = tally(rows.map((r) => ({ k: `${r.shop}（${r.kind === 'map' ? '地図' : '公式'}）` })), 'k').slice(0, 10).map(([k, n]) => `${k} ${n}`).join(' / ');
  console.log(`- ${label}：${names.length}回（${people(names)}人）${extra ? `　${extra}` : ''}`);
}

console.log('\n■ ElevenLabs の会話（1回ごとの往復）');
const since = Date.now() / 1000 - days * 86400;
for (const [label, id] of Object.entries(AGENTS)) {
  const all = [];
  let cursor = '';
  do {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${id}&page_size=100${cursor ? `&cursor=${cursor}` : ''}`, { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } });
    const d = await r.json();
    all.push(...(d.conversations || []));
    cursor = d.has_more && (d.conversations || []).at(-1)?.start_time_unix_secs > since ? d.next_cursor : '';
  } while (cursor);
  const c = all.filter((x) => x.start_time_unix_secs >= since);
  if (!c.length) { console.log(`- ${label === 'call' ? '通話' : '文字'}：0回`); continue; }
  const turns = c.map((x) => x.user_message_count ?? 0).sort((a, b) => a - b);
  const mid = turns[Math.floor(turns.length / 2)];
  const secs = c.reduce((a, x) => a + (x.call_duration_secs || 0), 0);
  const langs = tally(c, 'main_language').map(([k, n]) => `${k} ${n}`).join(' / ');
  const ended = c.filter((x) => /end_call|agent/i.test(x.termination_reason || '')).length;
  console.log(`- ${label === 'call' ? '通話' : '文字'}：${c.length}回・相手が送った数の真ん中 ${mid}通・3通以上続いた ${turns.filter((t) => t >= 3).length}回・合計 ${Math.round(secs / 60)}分・言語 ${langs}・凛が切った ${ended}回`);
}

// 文字のチャットの記録（latitude-logs/chat/<日付>/）は30日だけ残す（画面にそう書いてある）。古い日のフォルダを消す
const cutoff = new Date(Date.now() + 9 * 3600e3 - 30 * 86400e3).toISOString().slice(0, 10);
const { data: chatDays } = await s.storage.from('latitude-logs').list('chat', { limit: 1000 });
let removed = 0;
for (const d of (chatDays || []).map((o) => o.name).filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n) && n < cutoff)) {
  const files = (await list(`chat/${d}`));
  if (files.length) { await s.storage.from('latitude-logs').remove(files); removed += files.length; }
}
if (removed) console.log(`（30日より前の文字の記録 ${removed}件を消しました）`);
console.log('');
