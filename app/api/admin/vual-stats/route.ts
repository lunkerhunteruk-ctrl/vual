import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adminUid = searchParams.get('uid');

  if (!adminUid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  const [storesRes, creditsRes, bundlesRes] = await Promise.all([
    supa
      .from('stores')
      .select('id, firebase_uid, display_name, slug, type, created_at')
      .order('created_at', { ascending: false }),
    supa
      .from('consumer_credits')
      .select('firebase_uid, paid_credits, subscription_credits, free_tickets_remaining'),
    supa
      .from('collection_bundles')
      .select('store_id, is_public')
      .eq('is_public', true),
  ]);

  if (storesRes.error) return NextResponse.json({ error: storesRes.error.message }, { status: 500 });

  const stores = storesRes.data ?? [];
  const credits = creditsRes.data ?? [];
  const bundles = bundlesRes.data ?? [];

  // Build lookup maps
  const creditByUid = new Map(credits.map((c) => [c.firebase_uid, c]));
  const bundleCountByStoreId = bundles.reduce<Record<string, number>>((acc, b) => {
    acc[b.store_id] = (acc[b.store_id] ?? 0) + 1;
    return acc;
  }, {});

  const users = stores.map((s) => {
    const c = creditByUid.get(s.firebase_uid);
    return {
      id: s.id,
      firebase_uid: s.firebase_uid,
      display_name: s.display_name,
      slug: s.slug,
      type: s.type ?? 'general',
      paid_credits: c?.paid_credits ?? 0,
      subscription_credits: c?.subscription_credits ?? 0,
      free_tickets: c?.free_tickets_remaining ?? 0,
      published_collections: bundleCountByStoreId[s.id] ?? 0,
      created_at: s.created_at,
    };
  });

  const totalUsers = stores.length;
  const stylistCount = stores.filter((s) => s.type === 'stylist').length;
  const totalPaidCredits = credits.reduce((sum, c) => sum + (c.paid_credits ?? 0), 0);
  const totalSubCredits = credits.reduce((sum, c) => sum + (c.subscription_credits ?? 0), 0);
  const totalPublished = bundles.length;

  return NextResponse.json({
    stats: { totalUsers, stylistCount, totalPaidCredits, totalSubCredits, totalPublished },
    users,
  });
}

export async function POST(request: NextRequest) {
  const { adminUid, targetFirebaseUid, amount, creditType } = await request.json();

  if (!adminUid || !targetFirebaseUid || !amount) {
    return NextResponse.json({ error: 'adminUid, targetFirebaseUid, amount required' }, { status: 400 });
  }

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 500 });

  const col = creditType === 'subscription' ? 'subscription_credits' : 'paid_credits';

  // Upsert credits row
  const { data: existing } = await supa
    .from('consumer_credits')
    .select('id, paid_credits, subscription_credits')
    .eq('firebase_uid', targetFirebaseUid)
    .single();

  if (existing) {
    const newVal = (existing[col as keyof typeof existing] as number ?? 0) + Number(amount);
    const { error } = await supa
      .from('consumer_credits')
      .update({ [col]: newVal })
      .eq('firebase_uid', targetFirebaseUid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supa
      .from('consumer_credits')
      .insert({ firebase_uid: targetFirebaseUid, [col]: Number(amount) });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
