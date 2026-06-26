import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { firebaseUid } = await request.json();
  if (!firebaseUid) return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  // Fetch the row first to verify ownership and get image_url
  const { data: row, error: fetchErr } = await supa
    .from('user_generations')
    .select('id, image_url, firebase_uid')
    .eq('id', id)
    .single();

  if (fetchErr || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.firebase_uid !== firebaseUid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Delete from R2 if it's a model-images URL
  const publicBase = storage.from('model-images').getPublicUrl('').data.publicUrl.replace(/\/$/, '');
  if (row.image_url.startsWith(publicBase)) {
    const key = row.image_url.replace(publicBase + '/', '');
    await storage.from('model-images').remove([key]);
  }

  // Delete from DB
  const { error: delErr } = await supa.from('user_generations').delete().eq('id', id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
