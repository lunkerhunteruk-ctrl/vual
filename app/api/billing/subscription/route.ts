import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

// GET: Get subscription status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const lineUserId = searchParams.get('lineUserId');

    if (!customerId && !lineUserId) {
      return NextResponse.json({ error: 'customerId or lineUserId is required' }, { status: 400 });
    }

    let query = supabase.from('consumer_credits').select('*');
    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else {
      query = query.eq('line_user_id', lineUserId!);
    }

    const { data: credits } = await query.single();

    if (!credits || !credits.stripe_subscription_id) {
      return NextResponse.json({
        success: true,
        hasSubscription: false,
        status: null,
      });
    }

    return NextResponse.json({
      success: true,
      hasSubscription: true,
      status: credits.subscription_status,
      periodEnd: credits.subscription_period_end,
      subscriptionCredits: credits.subscription_credits,
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel subscription (at period end)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { customerId, lineUserId } = body;

    if (!customerId && !lineUserId) {
      return NextResponse.json({ error: 'customerId or lineUserId is required' }, { status: 400 });
    }

    let query = supabase.from('consumer_credits').select('stripe_subscription_id');
    if (customerId) {
      query = query.eq('customer_id', customerId);
    } else {
      query = query.eq('line_user_id', lineUserId!);
    }

    const { data: credits } = await query.single();

    if (!credits?.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const stripe = getStripeClient();
    await stripe.subscriptions.update(credits.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update local status
    const updateQuery = customerId
      ? supabase.from('consumer_credits').update({ subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('customer_id', customerId)
      : supabase.from('consumer_credits').update({ subscription_status: 'canceled', updated_at: new Date().toISOString() }).eq('line_user_id', lineUserId!);

    await updateQuery;

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at period end',
    });
  } catch (error) {
    console.error('Subscription DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
