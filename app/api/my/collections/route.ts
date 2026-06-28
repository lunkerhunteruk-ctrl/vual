import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/my/collections?uid=xxx
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ collections: [] });

  const { data: store } = await supa
    .from('stores')
    .select('id')
    .eq('firebase_uid', uid)
    .eq('type', 'personal')
    .single();

  if (!store) return NextResponse.json({ collections: [] });

  const { data, error } = await supa
    .from('collection_bundles')
    .select(`
      id, title, created_at, credits_back, is_public,
      collection_looks ( id, image_url, bundle_position, recipe, is_public, generation_id )
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  if (error || !data) return NextResponse.json({ collections: [] });

  const collections = data.map((bundle) => ({
    id: bundle.id,
    title: bundle.title,
    created_at: bundle.created_at,
    credits_back: (bundle as any).credits_back ?? 0,
    is_public: (bundle as any).is_public ?? true,
    looks: ((bundle as any).collection_looks ?? [])
      .sort((a: any, b: any) => (a.bundle_position ?? 0) - (b.bundle_position ?? 0)),
  }));

  return NextResponse.json({ collections });
}
