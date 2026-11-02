// スタイリストの招待と、送られてきたコーデ（Supabase）。2026-11-02
// 表は supabase/migrations/20261102_stylist_picker.sql
// 招待：stylist_invites … key, name, brief, active。リンクは /<locale>/stylist?key=<key>（ログインなし）
// 送られたコーデ：stylist_looks … id（ブラウザが作る番号・押し直しても1件）, invite_key, stylist_name, items, note, status
import { randomBytes } from 'crypto';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { createServerClient } from '@/lib/supabase';

export const MAX_ITEMS = 8;
export const MAX_LOOKS_PER_DAY = 40;

export interface StylistInvite {
  key: string;
  name: string;
  brief: string;
  active: boolean;
  createdAt: string | null;
}

export const isInviteKey = (k: unknown): k is string => typeof k === 'string' && /^[A-Za-z0-9_-]{20,40}$/.test(k);
export const isLookId = (k: unknown): k is string => typeof k === 'string' && /^[a-f0-9-]{36}$/.test(k);
export const newInviteKey = () => randomBytes(18).toString('base64url');

export function db() {
  const c = createServerClient();
  if (!c) throw new Error('データベースの設定がありません');
  return c;
}

// 手元で画面を試すための鍵（npm run dev の時だけ。本番では使えない）
export const isDevPreview = (key: unknown) => process.env.NODE_ENV === 'development' && key === 'preview';

export async function getInvite(key: string): Promise<StylistInvite | null> {
  if (isDevPreview(key)) return { key, name: 'テスト', brief: 'ハワース、11月。荒野と強い風。\n朝の谷の汽車から、夜の宿の暖炉まで。1日1コーデ。', active: true, createdAt: null };
  if (!isInviteKey(key)) return null;
  const { data, error } = await db().from('stylist_invites').select('key,name,brief,active,created_at').eq('key', key).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { key: data.key, name: data.name, brief: data.brief, active: data.active, createdAt: data.created_at };
}

export async function createInvite(name: string, brief: string): Promise<StylistInvite> {
  const key = newInviteKey();
  const { data, error } = await db().from('stylist_invites').insert({ key, name, brief }).select('created_at').single();
  if (error) throw error;
  return { key, name, brief, active: true, createdAt: data.created_at };
}

// 管理画面の API を守る（Firebase のログイン・管理者のメールだけ）
const ADMIN_EMAIL = 'sachiokawasaki@gmail.com';
export async function requireStylistAdmin(request: Request): Promise<Response | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return Response.json({ error: 'ログインが必要です' }, { status: 401 });
  try {
    const user = await getFirebaseAdminAuth().verifyIdToken(token);
    if (user.email?.toLowerCase() !== ADMIN_EMAIL || !user.email_verified)
      return Response.json({ error: '管理権限がありません' }, { status: 403 });
    return null;
  } catch {
    return Response.json({ error: 'ログインを更新してください' }, { status: 401 });
  }
}
