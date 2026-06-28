import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { bundleId, firebaseUid } = await request.json();
    if (!bundleId || !firebaseUid) {
      return NextResponse.json({ error: 'bundleId and firebaseUid required' }, { status: 400 });
    }

    const supa = createServerClient();
    if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // Fetch bundle info
    const { data: bundle } = await supa
      .from('collection_bundles')
      .select('id, credits_back, is_public, store_id')
      .eq('id', bundleId)
      .single();

    if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    if (!(bundle as any).is_public) return NextResponse.json({ error: 'Already unpublished' }, { status: 400 });

    // Verify ownership
    const { data: store } = await supa
      .from('stores')
      .select('id')
      .eq('id', (bundle as any).store_id)
      .eq('firebase_uid', firebaseUid)
      .single();
    if (!store) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const creditsBack: number = (bundle as any).credits_back ?? 0;

    // Check earned_credits balance
    const { data: credRow } = await supa
      .from('consumer_credits')
      .select('earned_credits')
      .eq('firebase_uid', firebaseUid)
      .single();

    const currentEarned: number = (credRow as any)?.earned_credits ?? 0;

    if (currentEarned < creditsBack) {
      return NextResponse.json({
        error: `獲得クレジットが不足しています（必要: ${creditsBack}、残高: ${currentEarned}）`,
        required: creditsBack,
        available: currentEarned,
      }, { status: 402 });
    }

    const newEarned = currentEarned - creditsBack;

    // Deduct earned_credits
    await supa
      .from('consumer_credits')
      .update({ earned_credits: newEarned })
      .eq('firebase_uid', firebaseUid);

    // Unpublish bundle
    await supa
      .from('collection_bundles')
      .update({ is_public: false, credits_back: 0 })
      .eq('id', bundleId);

    // Unpublish all looks in bundle
    await supa
      .from('collection_looks')
      .update({ is_public: false })
      .eq('bundle_id', bundleId);

    return NextResponse.json({ success: true, earnedCredits: newEarned });
  } catch (err) {
    console.error('[Unpublish] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
