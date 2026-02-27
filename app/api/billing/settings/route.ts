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
    .select('daily_tryon_limit, free_reset_hour')
    .eq('store_id', storeId)
    .single();

  if (error) {
    // No store_credits record yet — return defaults
    return NextResponse.json({ success: true, dailyTryonLimit: 3, freeResetHour: 0 });
  }

  return NextResponse.json({
    success: true,
    dailyTryonLimit: data.daily_tryon_limit,
    freeResetHour: data.free_reset_hour ?? 0,
  });
}

// PATCH: Update store billing settings
export async function PATCH(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { storeId, dailyTryonLimit, freeResetHour } = body;

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (typeof dailyTryonLimit !== 'number' || dailyTryonLimit < 1 || dailyTryonLimit > 100) {
    return NextResponse.json({ error: 'dailyTryonLimit must be between 1 and 100' }, { status: 400 });
  }

  if (freeResetHour !== undefined && (typeof freeResetHour !== 'number' || freeResetHour < 0 || freeResetHour > 23)) {
    return NextResponse.json({ error: 'freeResetHour must be between 0 and 23' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    daily_tryon_limit: dailyTryonLimit,
    updated_at: new Date().toISOString(),
  };
  if (freeResetHour !== undefined) {
    updateData.free_reset_hour = freeResetHour;
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
      .update(updateData)
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
        free_reset_hour: freeResetHour ?? 0,
      });

    if (error) {
      return NextResponse.json({ error: 'Failed to create settings' }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    dailyTryonLimit,
    freeResetHour: freeResetHour ?? 0,
  });
}

// POST: Manual actions (e.g., reset free tickets)
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { storeId, action } = body;

  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  if (action === 'resetFreeTickets') {
    // Get store settings
    const { data: storeCredits } = await supabase
      .from('store_credits')
      .select('daily_tryon_limit, free_reset_hour')
      .eq('store_id', storeId)
      .single();

    const dailyLimit = storeCredits?.daily_tryon_limit ?? 3;
    const resetHour = storeCredits?.free_reset_hour ?? 0;

    // Calculate next reset time based on reset hour
    const nowJST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const todayReset = new Date(nowJST);
    todayReset.setHours(resetHour, 0, 0, 0);

    const nextReset = new Date(todayReset);
    if (nowJST >= todayReset) {
      nextReset.setDate(nextReset.getDate() + 1);
    }

    // Convert back to UTC for storage
    const nextResetUTC = new Date(nextReset.toLocaleString('en-US', { timeZone: 'UTC' }));
    // Adjust for JST offset (+9h)
    nextResetUTC.setHours(nextResetUTC.getHours() - 9);

    // Reset all consumer credits
    const { error, count } = await supabase
      .from('consumer_credits')
      .update({
        free_tickets_remaining: dailyLimit,
        free_tickets_reset_at: nextResetUTC.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .gte('id', '00000000-0000-0000-0000-000000000000'); // match all rows

    if (error) {
      console.error('Reset free tickets error:', error);
      return NextResponse.json({ error: 'Failed to reset free tickets' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resetCount: count ?? 0,
      dailyLimit,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
