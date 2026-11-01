#!/usr/bin/env node
// 2026-11-01 AI の会社の読み取りプログラム（クローラ）が LATITUDE を読んだ回数を数える（読み取りだけ）。
// 使い方: node scripts/latitude-ai-crawl.mjs [日数=7]
// 記録は middleware が残す Supabase Storage の latitude-logs/ai-crawl/<日本の日付>/<クローラ>__<パス>__<時刻>.json（lib/ai-crawl-log.ts）。
// ファイル名だけで数えるので、中身はダウンロードしない。
// 注意：User-Agent は名乗りなので、まねした読み取りも混ざりうる（IP は残していないので確かめられない）。
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
  .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
const days = Number(process.argv[2] || 7);
const dates = [...Array(days)].map((_, i) => new Date(Date.now() + 9 * 3600e3 - i * 86400e3).toISOString().slice(0, 10));
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// クローラの名前 → 会社（表を読みやすくするためだけ）
const COMPANY = [
  [/^(GPTBot|OAI-|ChatGPT)/, 'OpenAI'], [/^(Claude|anthropic)/, 'Anthropic'], [/^Perplexity/, 'Perplexity'],
  [/^(Google|Gemini)/, 'Google'], [/^Applebot/, 'Apple'], [/^(Amazonbot|Amzn)/, 'Amazon'], [/^(meta-|FacebookBot)/, 'Meta'],
  [/^(Bytespider|TikTokSpider)/, 'ByteDance'], [/^CCBot/, 'Common Crawl'], [/^DuckAssist/, 'DuckDuckGo'], [/^MistralAI/, 'Mistral'],
  [/^cohere/, 'Cohere'], [/^(xAI|Grok)/, 'xAI'],
];
const company = (bot) => COMPANY.find(([re]) => re.test(bot))?.[1] || '';
// 読む時に役割が分かるように（学習用か・検索用か・人に頼まれて読んだか）
const ROLE = {
  GPTBot: '学習', 'OAI-SearchBot': '検索', 'ChatGPT-User': '人の依頼', ClaudeBot: '学習', 'Claude-SearchBot': '検索', 'Claude-User': '人の依頼',
  PerplexityBot: '検索', 'Perplexity-User': '人の依頼', 'MistralAI-User': '人の依頼', 'meta-externalagent': '学習', 'meta-externalfetcher': '人の依頼',
  CCBot: '学習', Bytespider: '学習', 'Google-CloudVertexBot': '企業のAI', GoogleOther: '研究・開発', Applebot: '検索（Siri など）', Amazonbot: '検索（Alexa など）', DuckAssistBot: '検索',
};

async function listAll(dir) {
  const names = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await s.storage.from('latitude-logs').list(dir, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error || !data?.length) break;
    names.push(...data.filter((o) => o.name.endsWith('.json')).map((o) => o.name));
    if (data.length < 1000) break;
  }
  return names;
}

const rows = [];
const perDay = {};
for (const d of dates) {
  const names = await listAll(`ai-crawl/${d}`);
  perDay[d] = names.length;
  for (const n of names) {
    const [bot, rawPath] = n.replace(/\.json$/, '').split('__');
    rows.push({ day: d, bot, path: (rawPath || '').replace(/!/g, '/') });
  }
}
const count = (key) => Object.entries(rows.reduce((m, r) => ((m[key(r)] = (m[key(r)] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
const table = (head, body) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...body.map((r) => `| ${r.join(' | ')} |`)].join('\n');

const out = [];
out.push(`AI のクローラの読み取り（日本時間 ${dates.at(-1)} 〜 ${dates[0]}）：合計 ${rows.length}回`);
if (!rows.length) {
  out.push('', '> まだ記録がありません（記録は 2026-11-01 の公開から。middleware が vual.jp に出てから数え始める）。');
} else {
  out.push('', '### クローラごと');
  out.push(table(['クローラ', '会社', '役割', '回数', 'ページの種類'], count((r) => r.bot).map(([bot, n]) => [bot, company(bot), ROLE[bot] || '', n, new Set(rows.filter((r) => r.bot === bot).map((r) => r.path)).size])));
  out.push('', '### ページごと（上位30）');
  out.push(table(['ページ', '回数', '読んだクローラ'], count((r) => r.path).slice(0, 30).map(([path, n]) => [path, n, [...new Set(rows.filter((r) => r.path === path).map((r) => r.bot))].join(', ')])));
  out.push('', '### 日ごと');
  out.push(table(['日', '回数'], dates.slice().reverse().map((d) => [d, perDay[d]])));
}
console.log(out.join('\n'));
