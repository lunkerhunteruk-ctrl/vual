// 2026-10-30 IndexNow：新しいページができたことを Bing などへ知らせる（ChatGPT の検索は Bing の仕組みを使う）。
// 鍵のファイルは public/<INDEXNOW_KEY>.txt（中身は鍵だけ）。号をすぐ公開した時は scripts/indexnow.py、公開予約の号は毎日の cron（/api/cron/indexnow）が知らせる。
export const INDEXNOW_KEY = '65c9f2e2fb82d4940dff56d3b75a12a1';
const HOST = 'vual.jp';

export async function submitIndexNow(urls: string[]) {
  if (!urls.length) return { status: 0, submitted: 0 };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`, urlList: urls }),
  });
  return { status: res.status, submitted: urls.length };
}
