import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const firebaseUid = request.nextUrl.searchParams.get('uid');
  if (!firebaseUid) {
    return NextResponse.json({ error: 'uid required' }, { status: 400 });
  }

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ looks: [] });

  const { data, error } = await supa
    .from('user_generations')
    .select('id, image_url, created_at, recipe')
    .eq('firebase_uid', firebaseUid)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ looks: data ?? [] });
}
