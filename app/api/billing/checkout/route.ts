import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

// POST: Create Stripe Checkout session for credit pack purchase
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { packSlug, storeId, customerId, lineUserId } = body;

    if (!packSlug) {
      return NextResponse.json({ error: 'packSlug is required' }, { status: 400 });
    }

    // Fetch pack info
    const { data: pack, error: packError } = await supabase
      .from('credit_packs')
      .select('*')
      .eq('slug', packSlug)
      .eq('is_active', true)
      .single();

    if (packError || !pack) {
      return NextResponse.json({ error: 'Credit pack not found' }, { status: 404 });
    }

    // Validate buyer identity
    if (pack.target === 'store' && !storeId) {
      return NextResponse.json({ error: 'storeId is required for store packs' }, { status: 400 });
    }
    if (pack.target === 'consumer' && !customerId && !lineUserId) {
      return NextResponse.json({ error: 'customerId or lineUserId is required for consumer packs' }, { status: 400 });
    }

    const stripe = getStripeClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build metadata for webhook processing
    const metadata: Record<string, string> = {
      packSlug: pack.slug,
      credits: String(pack.credits),
      target: pack.target,
    };
    if (storeId) metadata.storeId = storeId;
    if (customerId) metadata.customerId = customerId;
    if (lineUserId) metadata.lineUserId = lineUserId;

    // Determine success/cancel URLs
    const successUrl = pack.target === 'store'
      ? `${baseUrl}/ja/admin/billing?success=true`
      : `${baseUrl}/ja/tryon?credit_success=true`;
    const cancelUrl = pack.target === 'store'
      ? `${baseUrl}/ja/admin/billing?canceled=true`
      : `${baseUrl}/ja/tryon?credit_canceled=true`;

    // For subscriptions, we need a Stripe Customer
    if (pack.is_subscription) {
      let stripeCustomerId: string | undefined;

      // Look up existing consumer_credits for a stripe_customer_id
      if (lineUserId) {
        const { data: cc } = await supabase
          .from('consumer_credits')
          .select('stripe_customer_id')
          .eq('line_user_id', lineUserId)
          .single();
        stripeCustomerId = cc?.stripe_customer_id || undefined;
      } else if (customerId) {
        const { data: cc } = await supabase
          .from('consumer_credits')
          .select('stripe_customer_id')
          .eq('customer_id', customerId)
          .single();
        stripeCustomerId = cc?.stripe_customer_id || undefined;
      }

      // Create Stripe Customer if not exists
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          metadata: { lineUserId: lineUserId || '', customerId: customerId || '' },
        });
        stripeCustomerId = customer.id;
      }

      // Create subscription checkout
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [
          pack.stripe_price_id
            ? { price: pack.stripe_price_id, quantity: 1 }
            : {
                price_data: {
                  currency: 'jpy',
                  product_data: { name: pack.name },
                  unit_amount: pack.price_jpy, // JPY: integer as-is
                  recurring: { interval: 'month' },
                },
                quantity: 1,
              },
        ],
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    }

    // One-time payment checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        pack.stripe_price_id
          ? { price: pack.stripe_price_id, quantity: 1 }
          : {
              price_data: {
                currency: 'jpy',
                product_data: {
                  name: pack.name,
                  description: `${pack.credits} credits`,
                },
                unit_amount: pack.price_jpy, // JPY: integer as-is
              },
              quantity: 1,
            },
      ],
      metadata,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Billing checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
