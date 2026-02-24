import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createServerClient } from '@/lib/supabase';

// Initialize Firebase Admin
function getFirestoreAdmin() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp({ projectId });
    }
  }
  return getFirestore();
}

// Initialize Stripe lazily to avoid build-time errors
function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey);
}

interface InventoryItem {
  productId: string;
  quantity: number;
  variantId?: string | null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook secret is not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // Route to credit pack handler or product order handler
        if (session.metadata?.packSlug) {
          await handleCreditPackPurchase(session);
        } else {
          await handleCheckoutComplete(session);
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleSubscriptionRenewal(invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment succeeded:', paymentIntent.id);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const db = getFirestoreAdmin();

  console.log('Checkout completed:', {
    sessionId: session.id,
    customerEmail: session.customer_email,
    amountTotal: session.amount_total,
    paymentStatus: session.payment_status,
  });

  // Parse items from metadata
  const itemsJson = session.metadata?.items;
  if (!itemsJson) {
    console.error('No items found in session metadata');
    return;
  }

  let items: InventoryItem[];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    console.error('Failed to parse items from metadata:', itemsJson);
    return;
  }

  // Update inventory for each item
  const batch = db.batch();
  const inventoryUpdates: { productId: string; oldQty: number; newQty: number }[] = [];

  for (const item of items) {
    const productRef = db.collection('products').doc(item.productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      console.error(`Product not found: ${item.productId}`);
      continue;
    }

    const productData = productDoc.data()!;
    const currentQuantity = productData.stockQuantity || 0;
    const newQuantity = Math.max(0, currentQuantity - item.quantity);
    const stockStatus = newQuantity > 10 ? 'in_stock' : newQuantity > 0 ? 'low_stock' : 'out_of_stock';

    batch.update(productRef, {
      stockQuantity: newQuantity,
      stockStatus,
      updatedAt: new Date(),
    });

    inventoryUpdates.push({
      productId: item.productId,
      oldQty: currentQuantity,
      newQty: newQuantity,
    });
  }

  // Commit inventory updates
  await batch.commit();
  console.log('Inventory updated:', inventoryUpdates);

  // Create order in Firestore
  const orderData = {
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent,
    customerEmail: session.customer_email,
    amountTotal: session.amount_total,
    currency: session.currency,
    paymentStatus: session.payment_status,
    items: items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId || null,
    })),
    status: 'paid',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const orderRef = await db.collection('orders').add(orderData);
  console.log('Order created:', orderRef.id);
}

async function handleRefund(charge: Stripe.Charge) {
  const db = getFirestoreAdmin();

  console.log('Refund processed:', {
    chargeId: charge.id,
    amountRefunded: charge.amount_refunded,
  });

  // Find the order by payment intent
  const paymentIntentId = charge.payment_intent;
  if (!paymentIntentId) {
    console.error('No payment intent found in charge');
    return;
  }

  const ordersSnapshot = await db.collection('orders')
    .where('stripePaymentIntentId', '==', paymentIntentId)
    .limit(1)
    .get();

  if (ordersSnapshot.empty) {
    console.error(`Order not found for payment intent: ${paymentIntentId}`);
    return;
  }

  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();
  const items = orderData.items as InventoryItem[];

  // Restore inventory for refunded items
  const batch = db.batch();
  const inventoryUpdates: { productId: string; restoredQty: number }[] = [];

  for (const item of items) {
    const productRef = db.collection('products').doc(item.productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      console.error(`Product not found: ${item.productId}`);
      continue;
    }

    const productData = productDoc.data()!;
    const currentQuantity = productData.stockQuantity || 0;
    const newQuantity = currentQuantity + item.quantity;
    const stockStatus = newQuantity > 10 ? 'in_stock' : newQuantity > 0 ? 'low_stock' : 'out_of_stock';

    batch.update(productRef, {
      stockQuantity: newQuantity,
      stockStatus,
      updatedAt: new Date(),
    });

    inventoryUpdates.push({
      productId: item.productId,
      restoredQty: item.quantity,
    });
  }

  // Update order status
  batch.update(orderDoc.ref, {
    status: 'refunded',
    refundedAt: new Date(),
    updatedAt: new Date(),
  });

  await batch.commit();
  console.log('Inventory restored for refund:', inventoryUpdates);
}

// ============================================================
// Credit Pack Purchase Handler
// ============================================================
async function handleCreditPackPurchase(session: Stripe.Checkout.Session) {
  const supabase = createServerClient();
  if (!supabase) {
    console.error('Supabase not configured for credit pack purchase');
    return;
  }

  const { packSlug, credits: creditsStr, target, storeId, customerId, lineUserId } = session.metadata || {};
  const credits = parseInt(creditsStr || '0');

  console.log('Credit pack purchase:', { packSlug, credits, target, storeId, customerId, lineUserId });

  if (!credits || !target) {
    console.error('Invalid credit pack metadata:', session.metadata);
    return;
  }

  if (target === 'store' && storeId) {
    // B2B: Add credits to store
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
        stripe_session_id: session.id,
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
        stripe_session_id: session.id,
      });
    }

    console.log(`Store ${storeId}: +${credits} credits`);
  } else if (target === 'consumer') {
    // B2C: Add paid credits to consumer
    const query = customerId
      ? supabase.from('consumer_credits').select('id, paid_credits').eq('customer_id', customerId)
      : supabase.from('consumer_credits').select('id, paid_credits').eq('line_user_id', lineUserId!);

    const { data: cc } = await query.single();

    if (cc) {
      await supabase
        .from('consumer_credits')
        .update({
          paid_credits: cc.paid_credits + credits,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cc.id);

      await supabase.from('consumer_credit_transactions').insert({
        consumer_credit_id: cc.id,
        type: 'paid_credit_purchase',
        amount: credits,
        description: `${packSlug} 購入 (${credits}クレジット)`,
        stripe_session_id: session.id,
      });
    } else {
      // Create consumer_credits record
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
          stripe_session_id: session.id,
        });
      }
    }

    console.log(`Consumer: +${credits} paid credits`);
  }
}

// ============================================================
// Subscription Renewal Handler (invoice.paid)
// ============================================================
async function handleSubscriptionRenewal(invoice: Stripe.Invoice) {
  const supabase = createServerClient();
  if (!supabase) return;

  // Extract subscription ID from invoice (may be string or object depending on expansion)
  const sub = (invoice as unknown as Record<string, unknown>).subscription;
  const subscriptionId = typeof sub === 'string' ? sub : (sub as { id?: string })?.id;

  if (!subscriptionId) return;

  // Skip first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') {
    // First subscription payment — set up the consumer_credits
    const stripeCustomerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (stripeCustomerId) {
      const { data: cc } = await supabase
        .from('consumer_credits')
        .select('id')
        .eq('stripe_customer_id', stripeCustomerId)
        .single();

      if (cc) {
        await supabase
          .from('consumer_credits')
          .update({
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            subscription_credits: 30,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cc.id);

        await supabase.from('consumer_credit_transactions').insert({
          consumer_credit_id: cc.id,
          type: 'subscription_credit_grant',
          amount: 30,
          description: 'VUAL Pass 初回クレジット付与',
        });
      }
    }
    return;
  }

  // Recurring renewal
  const { data: cc } = await supabase
    .from('consumer_credits')
    .select('id, subscription_credits')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (!cc) {
    console.error(`Consumer not found for subscription: ${subscriptionId}`);
    return;
  }

  await supabase
    .from('consumer_credits')
    .update({
      subscription_credits: cc.subscription_credits + 30,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', cc.id);

  await supabase.from('consumer_credit_transactions').insert({
    consumer_credit_id: cc.id,
    type: 'subscription_credit_grant',
    amount: 30,
    description: 'VUAL Pass 月次クレジット付与',
  });

  console.log(`Subscription ${subscriptionId}: +30 credits`);
}

// ============================================================
// Subscription Canceled Handler
// ============================================================
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const supabase = createServerClient();
  if (!supabase) return;

  await supabase
    .from('consumer_credits')
    .update({
      subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription canceled: ${subscription.id}`);
}

// ============================================================
// Subscription Updated Handler
// ============================================================
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createServerClient();
  if (!supabase) return;

  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
  };

  const mappedStatus = statusMap[subscription.status] || null;

  await supabase
    .from('consumer_credits')
    .update({
      subscription_status: mappedStatus,
      subscription_period_end: (subscription as unknown as Record<string, unknown>).current_period_end
        ? new Date(((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  console.log(`Subscription updated: ${subscription.id} → ${mappedStatus}`);
}
