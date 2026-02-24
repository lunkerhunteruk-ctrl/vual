import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Retrieve store billing settings
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('store_credits')
    .select('daily_tryon_limit')
    .eq('store_id', storeId)
    .single();

  if (error) {
    // No store_credits record yet — return defaults
    return NextResponse.json({ success: true, dailyTryonLimit: 3 });
  }

  return NextResponse.json({
    success: true,
    dailyTryonLimit: data.daily_tryon_limit,
  });
}

// PATCH: Update store billing settings
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { storeId, dailyTryonLimit } = body;

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (typeof dailyTryonLimit !== 'number' || dailyTryonLimit < 1 || dailyTryonLimit > 100) {
    return NextResponse.json({ error: 'dailyTryonLimit must be between 1 and 100' }, { status: 400 });
  }

  // Upsert: update if exists, create if not
  const { data: existing } = await supabase
    .from('store_credits')
    .select('id')
    .eq('store_id', storeId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('store_credits')
      .update({
        daily_tryon_limit: dailyTryonLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('store_id', storeId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from('store_credits')
      .insert({
        store_id: storeId,
        daily_tryon_limit: dailyTryonLimit,
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    dailyTryonLimit,
  });
}
