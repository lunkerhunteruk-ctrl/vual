import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
        await handleCheckoutComplete(session);
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
