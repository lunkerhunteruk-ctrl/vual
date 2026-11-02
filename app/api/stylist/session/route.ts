// スタイリスト用ページを開いた時：招待のリンクが使えるかと、名前・お題・VUAL オリジナルの一覧を返す（ログインなし・鍵だけ）
// 一覧は R2 から直接読まずにここを通す（R2 の公開アドレスはブラウザからの読み込みを許していないため・鍵のない人には見せない）
import { getInvite } from '@/lib/stylist';
import { fetchOriginals } from '@/lib/vual-originals';

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') || '';
  try {
    const invite = await getInvite(key);
    if (!invite || !invite.active) return Response.json({ error: 'invalid' }, { status: 404 });
    const items = await fetchOriginals();
    return Response.json({ name: invite.name, brief: invite.brief, items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 500 });
  }
}
