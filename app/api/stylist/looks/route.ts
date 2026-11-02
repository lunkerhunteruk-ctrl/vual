// スタイリストが組んだコーデを受け取る。同じ requestId を2回送っても1件だけ（通信が切れて押し直しても重ならない）
import { fetchOriginals } from '@/lib/vual-originals';
import { db, getInvite, isDevPreview, isLookId, MAX_ITEMS, MAX_LOOKS_PER_DAY } from '@/lib/stylist';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const { key, requestId, items, note } = body || {};
    if (!isLookId(requestId)) return Response.json({ error: 'bad_request' }, { status: 400 });
    const invite = await getInvite(key);
    if (!invite || !invite.active) return Response.json({ error: 'invalid' }, { status: 404 });
    if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS || new Set(items).size !== items.length)
      return Response.json({ error: 'bad_items' }, { status: 400 });

    const catalog = new Map((await fetchOriginals()).map((i) => [i.id, i]));
    const picked = items.map((id: unknown) => (typeof id === 'string' ? catalog.get(id) : undefined));
    if (picked.some((p) => !p)) return Response.json({ error: 'unknown_item' }, { status: 400 });
    if (isDevPreview(key)) return Response.json({ ok: true, id: requestId, preview: true }); // 手元の試しは保存しない

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count, error: countError } = await db().from('stylist_looks').select('id', { count: 'exact', head: true })
      .eq('invite_key', invite.key).gt('created_at', since);
    if (countError) throw countError;
    if ((count || 0) >= MAX_LOOKS_PER_DAY) return Response.json({ error: 'too_many' }, { status: 429 });

    const { error } = await db().from('stylist_looks').upsert({
      id: requestId,
      invite_key: invite.key,
      stylist_name: invite.name,
      items: picked.map((p) => ({ id: p!.id, name: p!.name, color: p!.color, group: p!.group, card: p!.card })),
      note: typeof note === 'string' ? note.slice(0, 2000) : '',
    }, { onConflict: 'id', ignoreDuplicates: true }); // すでに受け取っている（押し直し）なら、そのまま受け取れた扱い
    if (error) throw error;
    return Response.json({ ok: true, id: requestId });
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 500 });
  }
}
