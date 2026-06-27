import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 30;

// GET /api/my/profile?uid=xxx
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ profile: null });

  const { data } = await supa
    .from('stores')
    .select('id, display_name, avatar_url, slug')
    .eq('firebase_uid', uid)
    .eq('type', 'personal')
    .single();

  return NextResponse.json({ profile: data ?? null });
}

// PATCH /api/my/profile — update display_name and/or avatar
export async function PATCH(request: NextRequest) {
  const { firebaseUid, displayName, avatarDataUrl } = await request.json();
  if (!firebaseUid) return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  const updates: Record<string, string> = {};
  if (displayName !== undefined) updates.display_name = displayName;

  if (avatarDataUrl) {
    const match = avatarDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (match) {
      const [, mimeType, b64] = match;
      const ext = mimeType === 'image/png' ? 'png' : 'jpg';
      const path = `avatars/${firebaseUid}/avatar.${ext}`;
      const buf = Buffer.from(b64, 'base64');
      await storage.from('model-images').upload(path, buf, { contentType: mimeType, upsert: true });
      const { data } = storage.from('model-images').getPublicUrl(path);
      updates.avatar_url = data.publicUrl;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data, error } = await supa
    .from('stores')
    .update(updates)
    .eq('firebase_uid', firebaseUid)
    .eq('type', 'personal')
    .select('id, display_name, avatar_url, slug')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
