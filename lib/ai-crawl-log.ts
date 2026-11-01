// 2026-11-01 AI の会社の読み取りプログラム（クローラ）が LATITUDE を読みに来た記録。
// Google アナリティクスは JavaScript を動かさないクローラを数えないので、サーバー（middleware）で User-Agent を見て残す。
// 残すのは「日本の日付・クローラの名前・パス・GET/HEAD」だけ。IP・クッキー・人のアクセスは残さない。
// 置き場：Supabase Storage の非公開バケット latitude-logs/ai-crawl/<日本の日付>/<クローラ>__<パス>__<時刻>.json
// （ファイル名だけで数えられるように、パスの「/」は「!」に置きかえて名前に入れる）。集計は scripts/latitude-ai-crawl.mjs。
// middleware（Edge）で動くので、supabase-js や node:crypto は使わず fetch だけで書く。応答は待たせない（event.waitUntil）。

// 名前の一覧は ai-robots-txt（github.com/ai-robots-txt/ai.robots.txt）と各社の公表（2026-11-01 確認）から。
// 長い名前を先に置く（GoogleOther-Image が GoogleOther に、Google-CloudVertexBot が CloudVertexBot に吸われないように）。
// 一般の言葉と重なる名前（Spider・Code・Cursor・Operator など）は人のブラウザと取り違えるので入れていない。
export const AI_CRAWLERS = [
  // OpenAI
  'GPTBot', 'OAI-SearchBot', 'OAI-AdsBot', 'ChatGPT-User', 'ChatGPT Agent',
  // Anthropic
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'Claude-Web', 'anthropic-ai',
  // Perplexity
  'PerplexityBot', 'Perplexity-User',
  // Google（Google-Extended は robots.txt の名前だけで、実際の読み取りは Googlebot が行う）
  'Google-CloudVertexBot', 'GoogleOther-Image', 'GoogleOther-Video', 'GoogleOther', 'Google-NotebookLM', 'Gemini-Deep-Research', 'GoogleAgent-URLContext', 'GoogleAgent-Mariner', 'Google-Agent',
  // Apple・Amazon・Meta・Microsoft 以外の大手
  'Applebot-Extended', 'Applebot', 'Amazonbot', 'Amzn-SearchBot', 'Amzn-User', 'meta-externalagent', 'meta-externalfetcher', 'meta-webindexer', 'FacebookBot',
  // そのほかの AI
  'Bytespider', 'TikTokSpider', 'CCBot', 'DuckAssistBot', 'MistralAI-User', 'MistralAI-Index', 'cohere-training-data-crawler', 'cohere-ai',
  'YouBot', 'Diffbot', 'AI2Bot', 'Timpibot', 'ImagesiftBot', 'Kangaroo Bot', 'PanguBot', 'DeepSeekBot', 'xAI-Grok', 'GrokBot', 'Grok Bot',
  'Kimi-SearchBot', 'Kimi-User', 'KimiBot', 'QwenBot', 'DoubaoBot', 'ExaBot', 'TavilyBot', 'FirecrawlAgent', 'LinkupBot', 'PhindBot', 'Bravebot',
  'iaskspider', 'Webzio-Extended', 'omgili', 'YandexAdditional',
] as const;

const LOWER = AI_CRAWLERS.map((n) => [n, n.toLowerCase()] as const);

export function aiCrawlerName(ua: string | null): string | null {
  if (!ua) return null;
  const u = ua.toLowerCase();
  for (const [name, low] of LOWER) if (u.includes(low)) return name;
  return null;
}

// 記録する場所：vual.jp（同じ Vercel の vwardrobe.com などは数えない）の LATITUDE のページと、AI が最初に読む小さなファイル
export function isAiCrawlPath(host: string, pathname: string) {
  const h = host.split(':')[0];
  if (!['vual.jp', 'www.vual.jp', 'localhost', '127.0.0.1'].includes(h)) return false;
  return /^\/((en|ja)\/)?latitude(\/|$)/.test(pathname) || ['/llms.txt', '/llms-full.txt', '/robots.txt', '/sitemap.xml'].includes(pathname);
}

const jstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
// Supabase Storage の名前に使えない字を外す（「/」は「!」、それ以外は「_」）
const keyPart = (s: string, max: number) => s.replace(/\//g, '!').replace(/[^\w!.\-]/g, '_').slice(0, max);

export async function logAiCrawl(bot: string, pathname: string, method: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const name = `ai-crawl/${jstDate()}/${keyPart(bot, 40)}__${keyPart(pathname, 140)}__${Date.now()}${Math.random().toString(36).slice(2, 6)}.json`;
  try {
    await fetch(`${url}/storage/v1/object/latitude-logs/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json', 'x-upsert': 'false' },
      body: JSON.stringify({ at: new Date().toISOString(), bot, path: pathname.slice(0, 200), method }),
    });
  } catch { /* 記録できなくてもページは止めない */ }
}
