import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(secretKey);
}

// GET: Verify Stripe Checkout Session and grant credits if not already granted
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Retrieve session from Stripe
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ success: false, reason: 'not_paid' });
    }

    const { packSlug, credits: creditsStr, target, storeId, customerId, lineUserId } = session.metadata || {};
    const credits = parseInt(creditsStr || '0');

    if (!credits || !target || !packSlug) {
      return NextResponse.json({ success: false, reason: 'no_credit_metadata' });
    }

    // Handle store subscription checkout verification
    const sessionType = session.metadata?.type;
    if (sessionType === 'store_subscription' && storeId) {
      // Store subscription is handled by webhook; just return success if payment is paid
      return NextResponse.json({ success: true, type: 'subscription' });
    }

    // Handle AI Studio topup credits
    if (target === 'store' && storeId && packSlug?.startsWith('studio-')) {
      const { data: existingTx } = await supabase
        .from('studio_credit_transactions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .limit(1)
        .single();

      if (existingTx) {
        return NextResponse.json({ success: true, already_processed: true });
      }

      const { data: sub } = await supabase
        .from('store_subscriptions')
        .select('studio_subscription_credits, studio_topup_credits')
        .eq('store_id', storeId)
        .single();

      const currentTopup = sub?.studio_topup_credits || 0;
      const newTopup = currentTopup + credits;

      if (sub) {
        await supabase
          .from('store_subscriptions')
          .update({ studio_topup_credits: newTopup, updated_at: new Date().toISOString() })
          .eq('store_id', storeId);
      } else {
        await supabase.from('store_subscriptions').insert({
          store_id: storeId,
          studio_topup_credits: credits,
        });
      }

      const totalAfter = (sub?.studio_subscription_credits || 0) + newTopup;
      await supabase.from('studio_credit_transactions').insert({
        store_id: storeId,
        type: 'topup_purchase',
        amount: credits,
        balance_after: totalAfter,
        description: `${packSlug} トップアップ購入 (${credits}クレジット)`,
        stripe_session_id: sessionId,
      });

      return NextResponse.json({ success: true, credits_granted: credits });
    }

    if (target === 'store' && storeId) {
      // Fitting credit pack (existing logic)
      const { data: existingTx } = await supabase
        .from('store_credit_transactions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .limit(1)
        .single();

      if (existingTx) {
        return NextResponse.json({ success: true, already_processed: true });
      }

      // Grant credits to store
      const { data: existing } = await supabase
        .from('store_credits')
        .select('balance, total_purchased')
        .eq('store_id', storeId)
        .single();

      if (existing) {
        const newBalance = existing.balance + credits;
        await supabase
          .from('store_credits')
          .update({
            balance: newBalance,
            total_purchased: existing.total_purchased + credits,
            updated_at: new Date().toISOString(),
          })
          .eq('store_id', storeId);

        await supabase.from('store_credit_transactions').insert({
          store_id: storeId,
          type: 'purchase',
          amount: credits,
          balance_after: newBalance,
          description: `${packSlug} パック購入 (${credits}クレジット)`,
          stripe_session_id: sessionId,
        });
      } else {
        await supabase.from('store_credits').insert({
          store_id: storeId,
          balance: credits,
          total_purchased: credits,
        });

        await supabase.from('store_credit_transactions').insert({
          store_id: storeId,
          type: 'purchase',
          amount: credits,
          balance_after: credits,
          description: `${packSlug} パック購入 (${credits}クレジット)`,
          stripe_session_id: sessionId,
        });
      }

      return NextResponse.json({ success: true, credits_granted: credits });
    } else if (target === 'consumer') {
      // Check if already processed
      const txQuery = supabase
        .from('consumer_credit_transactions')
        .select('id')
        .eq('stripe_session_id', sessionId)
        .limit(1);
      const { data: existingTx } = await txQuery.single();

      if (existingTx) {
        return NextResponse.json({ success: true, already_processed: true });
      }

      // Grant credits to consumer
      const query = customerId
        ? supabase.from('consumer_credits').select('id, paid_credits').eq('customer_id', customerId)
        : supabase.from('consumer_credits').select('id, paid_credits').eq('line_user_id', lineUserId!);

      const { data: cc } = await query.single();

      if (cc) {
        await supabase
          .from('consumer_credits')
          .update({
            paid_credits: cc.paid_credits + credits,
            stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cc.id);

        await supabase.from('consumer_credit_transactions').insert({
          consumer_credit_id: cc.id,
          type: 'paid_credit_purchase',
          amount: credits,
          description: `${packSlug} 購入 (${credits}クレジット)`,
          stripe_session_id: sessionId,
        });
      } else {
        const insertData: Record<string, unknown> = {
          paid_credits: credits,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        };
        if (customerId) insertData.customer_id = customerId;
        if (lineUserId) insertData.line_user_id = lineUserId;

        const { data: newCc } = await supabase
          .from('consumer_credits')
          .insert(insertData)
          .select('id')
          .single();

        if (newCc) {
          await supabase.from('consumer_credit_transactions').insert({
            consumer_credit_id: newCc.id,
            type: 'paid_credit_purchase',
            amount: credits,
            description: `${packSlug} 購入 (${credits}クレジット)`,
            stripe_session_id: sessionId,
          });
        }
      }

      return NextResponse.json({ success: true, credits_granted: credits });
    }

    return NextResponse.json({ success: false, reason: 'unknown_target' });
  } catch (error) {
    console.error('Verify session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
