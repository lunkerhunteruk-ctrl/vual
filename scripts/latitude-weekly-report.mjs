#!/usr/bin/env node
// 2026-10-30 LATITUDE の毎週の報告の材料を集める（数だけ・読み取りだけ）。
// 使い方: node scripts/latitude-weekly-report.mjs [日数=7] > 報告.md
// 1. Google アナリティクス（GA4・プロパティ 525334850）：/latitude のページの表示・どこから来たか・国と言語
// 2. Search Console：/latitude のページが、どんな検索の言葉で出たか（表示回数・クリック・順位）
// 3. サイトの記録：scripts/latitude-stats.mjs（凛との会話・店のリンク）
// 3.5 AI のクローラが読んだページ：scripts/latitude-ai-crawl.mjs
// 鍵は読み取り専用のサービスアカウント（latitude-analytics@vual-production-a7298）。置き場所は LATITUDE_ANALYTICS_KEY か ~/.config/vual/latitude-analytics.json。
// 手順は vault.vual.jp/docs/LATITUDE-ANALYTICS.md。
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { GoogleAuth } from 'google-auth-library';

const days = Number(process.argv[2] || 7);
const PROPERTY = '525334850';
const SITES = ['sc-domain:vual.jp', 'https://vual.jp/']; // Search Console の登録の形（どちらか）
const keyFile = process.env.LATITUDE_ANALYTICS_KEY || `${os.homedir()}/.config/vual/latitude-analytics.json`;
const day = (n) => new Date(Date.now() - n * 86400e3).toISOString().slice(0, 10);
const out = [];
const p = (s = '') => out.push(s);

p(`# LATITUDE 週の数字（${day(days)} 〜 ${day(1)}）`);
p();

let client = null;
if (fs.existsSync(keyFile)) {
  const auth = new GoogleAuth({ keyFile, scopes: ['https://www.googleapis.com/auth/analytics.readonly', 'https://www.googleapis.com/auth/webmasters.readonly'] });
  client = await auth.getClient();
} else {
  p(`> 鍵（${keyFile}）がまだ無いので、アナリティクスと Search Console は読めませんでした。`);
}
const post = async (url, data) => {
  const r = await client.request({ url, method: 'POST', data }).catch((e) => ({ error: e.response?.data?.error?.message || e.message }));
  return r.error ? { error: r.error } : r.data;
};
const table = (head, rows) => {
  p(`| ${head.join(' | ')} |`);
  p(`|${head.map(() => '---').join('|')}|`);
  rows.forEach((r) => p(`| ${r.join(' | ')} |`));
  p();
};

if (client) {
  // 1. アナリティクス
  const ga = (dims, metrics, limit = 25, filter = true) => post(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    dimensions: dims.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    ...(filter ? { dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: '/latitude' } } } } : {}),
    orderBys: [{ metric: { metricName: metrics[0] }, desc: true }],
    limit,
  });
  const rows = (d) => (d.rows || []).map((r) => [...r.dimensionValues.map((v) => v.value), ...r.metricValues.map((v) => v.value)]);
  p('## アナリティクス（/latitude のページ）');
  const pages = await ga(['pagePath'], ['screenPageViews', 'activeUsers', 'userEngagementDuration']);
  if (pages.error) p(`> 読めませんでした：${pages.error}`);
  else table(['ページ', '表示', '人', '合計の滞在（秒）'], rows(pages));
  const src = await ga(['sessionSource', 'sessionMedium'], ['sessions'], 12);
  if (!src.error) { p('### どこから来たか'); table(['元', '種類', '訪問'], rows(src)); }
  // AI のチャット（ChatGPT・Gemini・Perplexity など）から来た人。少ないうちは上の12件に埋もれるので、別に数える（2026-10-30）
  const AI_SOURCES = 'chatgpt|openai|gemini\\.google|bard\\.google|perplexity|claude\\.ai|copilot|you\\.com|phind|deepseek|grok|meta\\.ai|mistral';
  const ai = await post(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, {
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'yesterday' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'landingPage' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'PARTIAL_REGEXP', value: AI_SOURCES, caseSensitive: false } } },
    orderBys: [{ metric: { metricName: 'sessions' } , desc: true }],
    limit: 25,
  });
  if (!ai.error) {
    p('### AI のチャットから来た人（サイト全体）');
    const r = rows(ai);
    if (r.length) table(['元', '着いたページ', '訪問'], r);
    else p('> まだいません。\n');
  }
  const geo = await ga(['country', 'language'], ['activeUsers'], 12);
  if (!geo.error) { p('### 国と言語'); table(['国', '言語', '人'], rows(geo)); }
  const ev = await ga(['eventName'], ['eventCount'], 20, false);
  if (!ev.error) { p('### LATITUDE の出来事（凛に聞く・店のリンクなど）'); table(['出来事', '回数'], rows(ev).filter((r) => r[0].startsWith('latitude_'))); }

  // 2. Search Console
  p('## Search Console（/latitude のページが出た検索の言葉）');
  let done = false;
  for (const site of SITES) {
    const d = await post(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      startDate: day(days + 2), endDate: day(2), dimensions: ['query', 'page'], rowLimit: 50,
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/latitude' }] }],
    });
    if (d.error) continue;
    done = true;
    p(`（${site}・Search Console は2〜3日おくれ）`);
    p();
    table(['言葉', 'ページ', '表示', 'クリック', '順位'], (d.rows || []).map((r) => [r.keys[0], r.keys[1].replace('https://vual.jp', ''), r.impressions, r.clicks, r.position.toFixed(1)]));
    if (!(d.rows || []).length) p('> まだ /latitude のページは検索結果に出ていません。');
    // 2026-10-30 狙う相手は2つ（vault.vual.jp/docs/LATITUDE-CITY-GUIDE.md）：海外の街×日本からの検索／日本の街×海外からの検索。
    // Search Console は言葉の言語を出さないので、検索した国で分ける。日本の街は JAPAN_CITIES に足していく。
    const JAPAN_CITIES = ['kanazawa', 'kyoto', 'nara', 'takayama', 'tokyo'];
    const g = await post(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, {
      startDate: day(days + 2), endDate: day(2), dimensions: ['page', 'country'], rowLimit: 500,
      dimensionFilterGroups: [{ filters: [{ dimension: 'page', operator: 'contains', expression: '/latitude' }] }],
    });
    if (!g.error) {
      const sum = { abroadJp: [0, 0], japanAbroad: [0, 0], other: [0, 0] };
      for (const r of g.rows || []) {
        const japanPage = JAPAN_CITIES.some((c) => r.keys[0].includes(`/${c}`));
        const fromJapan = r.keys[1] === 'jpn';
        const k = !japanPage && fromJapan ? 'abroadJp' : japanPage && !fromJapan ? 'japanAbroad' : 'other';
        sum[k][0] += r.impressions; sum[k][1] += r.clicks;
      }
      p('### 狙う2つの相手');
      table(['相手', '表示', 'クリック'], [
        ['海外の街のページ × 日本からの検索', ...sum.abroadJp],
        ['日本の街のページ × 海外からの検索', ...sum.japanAbroad],
        ['それ以外（追わない相手など）', ...sum.other],
      ]);
    }
    break;
  }
  if (!done) p('> 読めませんでした（vual.jp が Search Console に登録されていないか、サービスアカウントがユーザーに足されていない）。');
}

// 3. サイトの記録
p('## サイトの記録（凛との会話・店のリンク）');
p('```');
try { p(execFileSync('node', [new URL('./latitude-stats.mjs', import.meta.url).pathname, String(days)], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname }).trim()); }
catch (e) { p(`読めませんでした：${e.message.split('\n')[0]}`); }
p('```');

// 3.5 AI のクローラが読んだページ（2026-11-01。GA4 は JavaScript を動かさないクローラを数えないので、middleware の記録から）
p('## AI のクローラが読んだページ');
try { p(execFileSync('node', [new URL('./latitude-ai-crawl.mjs', import.meta.url).pathname, String(days)], { encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname }).trim()); }
catch (e) { p(`> 読めませんでした：${e.message.split('\n')[0]}`); }
p();

// 4. ElevenLabs の残り（通話は ElevenLabs のクレジットを1分約400使う。人が来始めたら上位プランを考える：2026-10-30 ユーザー決定）
try {
  const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
  const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } });
  const sub = await r.json();
  const used = sub.character_count, limit = sub.character_limit;
  const reset = new Date(sub.next_character_count_reset_unix * 1000).toISOString().slice(0, 10);
  p('## ElevenLabs（通話の声）の残り');
  p(`- プラン ${sub.tier}：今月 ${used.toLocaleString()} / ${limit.toLocaleString()} を使用（${Math.round((used / limit) * 100)}%）・${reset} に戻る`);
  if (used / limit >= 0.5) p('- **半分を超えています。通話が増えているなら、上位プランを考える時期です。**');
  p();
} catch (e) { p(`> ElevenLabs の残りを読めませんでした：${e.message}`); }

console.log(out.join('\n'));
