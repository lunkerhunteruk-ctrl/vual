import type { NextRequest } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// VUAL 運営者。どのショップの管理APIも操作できる（vwardrobe-admin-auth と同じ人）
const PLATFORM_ADMIN_EMAIL = 'sachiokawasaki@gmail.com';

/** Authorization: Bearer <Firebase IDトークン> を検証して、ログイン中の人を返す。無ければ null */
export async function getRequestUser(request: Request): Promise<DecodedIdToken | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  try {
    return await getFirebaseAdminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

export function isPlatformAdmin(user: DecodedIdToken): boolean {
  return user.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL && user.email_verified === true;
}

/**
 * 管理APIの入口チェック。
 * リクエストが指すショップ（Cookie / サブドメイン）のオーナー本人か、運営者だけを通す。
 * 通れば { storeId, user }、だめなら返すべきエラーレスポンス。
 */
export async function requireStoreOwner(
  request: NextRequest
): Promise<{ storeId: string; user: DecodedIdToken } | Response> {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: 'ログインが必要です' }, { status: 401 });

  const storeId = await resolveStoreIdFromRequest(request);
  if (!(await canManageStore(user, storeId))) {
    return Response.json({ error: 'このショップの管理権限がありません' }, { status: 403 });
  }
  return { storeId, user };
}

/** この人がそのショップを管理できるか（オーナー本人か運営者） */
export async function canManageStore(user: DecodedIdToken, storeId: string): Promise<boolean> {
  if (isPlatformAdmin(user)) return true;
  const supabase = createServerClient();
  if (!supabase) return false;
  const { data } = await supabase.from('stores').select('owner_id').eq('id', storeId).single();
  return !!data && data.owner_id === user.uid;
}
