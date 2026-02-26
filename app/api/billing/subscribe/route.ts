import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

const PLAN_PRICE_JPY = 19800;
const PLAN_NAME = 'VUAL スタンダードプラン';

// POST: Create Stripe Subscription checkout for store monthly plan
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { storeId } = await request.json();
    if (!storeId) {
      return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    }

    // Get current subscription record
    const { data: sub } = await supabase
      .from('store_subscriptions')
      .select('stripe_customer_id')
      .eq('store_id', storeId)
      .single();

    const stripe = getStripeClient();
    let stripeCustomerId = sub?.stripe_customer_id;

    // Create Stripe Customer if not exists
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        metadata: { storeId },
      });
      stripeCustomerId = customer.id;

      // Save stripe_customer_id
      if (sub) {
        await supabase
          .from('store_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
          .eq('store_id', storeId);
      }
    }

    const host = request.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: PLAN_NAME },
          unit_amount: PLAN_PRICE_JPY,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: {
        storeId,
        type: 'store_subscription',
      },
      success_url: `${baseUrl}/ja/admin/billing?sub_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/ja/admin/billing?sub_canceled=true`,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
