// 管理画面（admin.vwardrobe.com/…/stylists）：スタイリストの招待を作る・止める、送られたコーデを見る。入れるのは管理者だけ
import { createInvite, db, isInviteKey, isLookId, requireStylistAdmin } from '@/lib/stylist';

export async function GET(request: Request) {
  const denied = await requireStylistAdmin(request); if (denied) return denied;
  try {
    const [inv, looks] = await Promise.all([
      db().from('stylist_invites').select('key,name,brief,active,created_at').order('created_at', { ascending: false }).limit(200),
      db().from('stylist_looks').select('id,invite_key,stylist_name,items,note,status,created_at').order('created_at', { ascending: false }).limit(200),
    ]);
    if (inv.error) throw inv.error; if (looks.error) throw looks.error;
    return Response.json({
      invites: inv.data.map((d) => ({ key: d.key, name: d.name, brief: d.brief, active: d.active, createdAt: d.created_at })),
      looks: looks.data.map((d) => ({ id: d.id, inviteKey: d.invite_key, stylistName: d.stylist_name, items: d.items, note: d.note, status: d.status, createdAt: d.created_at })),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '読み込めませんでした' }, { status: 500 });
  }
}

// 招待を作る：{ name, brief }
export async function POST(request: Request) {
  const denied = await requireStylistAdmin(request); if (denied) return denied;
  const { name, brief } = (await request.json().catch(() => ({}))) as { name?: unknown; brief?: unknown };
  if (typeof name !== 'string' || !name.trim()) return Response.json({ error: '名前を入れてください' }, { status: 400 });
  try {
    const invite = await createInvite(name.trim().slice(0, 80), typeof brief === 'string' ? brief.trim().slice(0, 1200) : '');
    return Response.json({ invite });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : '作れませんでした' }, { status: 500 });
  }
}

// 招待を止める・戻す：{ key, active } ／ 受け取ったコーデに印：{ lookId, status: 'new'|'seen'|'picked' }
export async function PATCH(request: Request) {
  const denied = await requireStylistAdmin(request); if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; active?: unknown; lookId?: unknown; status?: unknown };
  if (isInviteKey(body.key) && typeof body.active === 'boolean') {
    const { error } = await db().from('stylist_invites').update({ active: body.active }).eq('key', body.key);
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
  }
  if (isLookId(body.lookId) && ['new', 'seen', 'picked'].includes(String(body.status))) {
    const { error } = await db().from('stylist_looks').update({ status: body.status }).eq('id', body.lookId);
    return error ? Response.json({ error: error.message }, { status: 500 }) : Response.json({ ok: true });
  }
  return Response.json({ error: '指定が正しくありません' }, { status: 400 });
}
