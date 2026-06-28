import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/my/meguri?uid=xxx — fetch tryon logs for collections owned by uid
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ logs: [] });

  const { data, error } = await supa
    .from('tryon_logs')
    .select('id, bundle_id, viewer_firebase_uid, created_at, collection_bundles(title)')
    .eq('owner_firebase_uid', uid)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) return NextResponse.json({ logs: [] });

  const logs = data.map((row: any) => ({
    id: row.id,
    bundleId: row.bundle_id,
    bundleTitle: row.collection_bundles?.title ?? null,
    hasViewer: !!row.viewer_firebase_uid,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ logs });
}

// POST /api/my/meguri — log a try-on event
export async function POST(request: NextRequest) {
  try {
    const { bundleId, viewerUid } = await request.json();
    if (!bundleId) return NextResponse.json({ error: 'bundleId required' }, { status: 400 });

    const supa = createServerClient();
    if (!supa) return NextResponse.json({ ok: true }); // silent fail

    // Resolve owner firebase_uid from bundle
    const { data: bundle } = await supa
      .from('collection_bundles')
      .select('store_id')
      .eq('id', bundleId)
      .single();

    if (!bundle) return NextResponse.json({ ok: true });

    const { data: store } = await supa
      .from('stores')
      .select('firebase_uid')
      .eq('id', (bundle as any).store_id)
      .single();

    if (!store) return NextResponse.json({ ok: true });

    const ownerUid: string = (store as any).firebase_uid;

    // Don't log self-views
    if (viewerUid && viewerUid === ownerUid) return NextResponse.json({ ok: true });

    await supa.from('tryon_logs').insert({
      bundle_id: bundleId,
      owner_firebase_uid: ownerUid,
      viewer_firebase_uid: viewerUid ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Meguri log]', err);
    return NextResponse.json({ ok: true }); // never break the try-on flow
  }
}
