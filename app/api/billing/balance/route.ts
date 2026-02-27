import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Fetch credit balance for store or consumer
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const customerId = searchParams.get('customerId');
    const lineUserId = searchParams.get('lineUserId');

    // B2B: Store balance
    if (storeId) {
      const { data: credits } = await supabase
        .from('store_credits')
        .select('*')
        .eq('store_id', storeId)
        .single();

      return NextResponse.json({
        success: true,
        type: 'store',
        balance: credits?.balance ?? 0,
        totalPurchased: credits?.total_purchased ?? 0,
        totalConsumed: credits?.total_consumed ?? 0,
      });
    }

    // B2C: Consumer balance
    if (customerId || lineUserId) {
      // Resolve store to get daily_tryon_limit (the free ticket max)
      const storeIdResolved = await resolveStoreIdFromRequest(request);
      const { data: storeCredits } = await supabase
        .from('store_credits')
        .select('daily_tryon_limit, free_reset_hour')
        .eq('store_id', storeIdResolved)
        .single();
      const dailyFreeLimit = storeCredits?.daily_tryon_limit ?? 3;
      const resetHour = storeCredits?.free_reset_hour ?? 0;

      let query = supabase.from('consumer_credits').select('*');
      if (customerId) {
        query = query.eq('customer_id', customerId);
      } else {
        query = query.eq('line_user_id', lineUserId!);
      }

      let { data: credits } = await query.single();

      // Auto-create consumer credits on first access
      if (!credits) {
        const nextReset = calcNextResetTime(resetHour);

        const insertData: Record<string, unknown> = {
          free_tickets_remaining: dailyFreeLimit,
          free_tickets_reset_at: nextReset.toISOString(),
        };
        if (customerId) insertData.customer_id = customerId;
        if (lineUserId) insertData.line_user_id = lineUserId;

        const { data: newCredits } = await supabase
          .from('consumer_credits')
          .insert(insertData)
          .select()
          .single();

        credits = newCredits;
      }

      // Check if free tickets need reset
      const resetAt = credits?.free_tickets_reset_at ? new Date(credits.free_tickets_reset_at) : null;
      let freeTickets = credits?.free_tickets_remaining ?? dailyFreeLimit;
      if (resetAt && resetAt <= new Date()) {
        freeTickets = dailyFreeLimit; // Will be reset on next deduction
      }

      return NextResponse.json({
        success: true,
        type: 'consumer',
        freeTickets,
        dailyFreeLimit,
        freeTicketsResetAt: credits?.free_tickets_reset_at,
        paidCredits: credits?.paid_credits ?? 0,
        subscriptionCredits: credits?.subscription_credits ?? 0,
        subscriptionStatus: credits?.subscription_status ?? null,
        subscriptionPeriodEnd: credits?.subscription_period_end ?? null,
        totalCredits: freeTickets + (credits?.paid_credits ?? 0) + (credits?.subscription_credits ?? 0),
      });
    }

    return NextResponse.json({ error: 'storeId, customerId, or lineUserId is required' }, { status: 400 });
  } catch (error) {
    console.error('Billing balance error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Calculate the next reset time for a given hour (JST). */
function calcNextResetTime(resetHour: number): Date {
  const nowUTC = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const nowJST = new Date(nowUTC.getTime() + jstOffset);

  const todayResetJST = new Date(nowJST);
  todayResetJST.setHours(resetHour, 0, 0, 0);

  const nextResetJST = nowJST >= todayResetJST
    ? new Date(todayResetJST.getTime() + 24 * 60 * 60 * 1000)
    : todayResetJST;

  return new Date(nextResetJST.getTime() - jstOffset);
}
