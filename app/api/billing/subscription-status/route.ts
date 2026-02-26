import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Check store subscription status
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId');
  if (!storeId) {
    return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { data: sub } = await supabase
      .from('store_subscriptions')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (!sub) {
      return NextResponse.json({
        success: true,
        status: 'none',
        plan: null,
        studioSubscriptionCredits: 0,
        studioTopupCredits: 0,
        studioTotalCredits: 0,
      });
    }

    // Check if trial has expired
    if (sub.status === 'trialing' && sub.trial_ends_at) {
      const trialEnd = new Date(sub.trial_ends_at);
      if (trialEnd < new Date()) {
        // Trial expired — update status
        await supabase
          .from('store_subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('store_id', storeId);
        sub.status = 'expired';
      }
    }

    // Calculate trial remaining days
    let trialDaysRemaining: number | null = null;
    if (sub.status === 'trialing' && sub.trial_ends_at) {
      const diff = new Date(sub.trial_ends_at).getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      status: sub.status,
      plan: sub.plan,
      trialDaysRemaining,
      trialEndsAt: sub.trial_ends_at,
      subscriptionPeriodEnd: sub.subscription_period_end,
      studioSubscriptionCredits: sub.studio_subscription_credits,
      studioTopupCredits: sub.studio_topup_credits,
      studioTotalCredits: sub.studio_subscription_credits + sub.studio_topup_credits,
      studioCreditsTotalUsed: sub.studio_credits_total_used,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
