import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { firebaseUid, name, category } = await request.json();

  if (!firebaseUid) return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  const update: Record<string, string> = {};
  if (name !== undefined) update.name = name;
  if (category !== undefined) update.category = category;

  const { data, error } = await supa
    .from('user_garments')
    .update(update)
    .eq('id', id)
    .eq('firebase_uid', firebaseUid)
    .select('id, image_url, category, name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ garment: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { firebaseUid } = await request.json();

  if (!firebaseUid) return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  const { error } = await supa
    .from('user_garments')
    .delete()
    .eq('id', id)
    .eq('firebase_uid', firebaseUid);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
