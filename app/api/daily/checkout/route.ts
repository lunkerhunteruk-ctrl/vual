import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { CREDIT_PACKS } from '@/lib/daily/credits';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(request: NextRequest) {
  try {
    const { packSlug, userId, email } = await request.json();

    const pack = CREDIT_PACKS.find((p) => p.slug === packSlug);
    if (!pack) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://vual.jp';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `VAULT DAILY ${pack.name}`,
              description: `${pack.credits} IMPLANT generations`,
            },
            unit_amount: pack.priceJpy,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packSlug: pack.slug,
        credits: String(pack.credits),
      },
      success_url: `${origin}/daily?credit_success=true&credits=${pack.credits}`,
      cancel_url: `${origin}/daily?credit_canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
