import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { CartItem } from '@/lib/types';
import { toSmallestUnit } from '@/lib/utils/currency';

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

interface CheckoutRequestBody {
  items: CartItem[];
  customerEmail?: string;
  shippingAddress?: {
    name: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  shippingCost: number;
  locale: string;
}

// Check inventory availability for all items
async function checkInventory(items: CartItem[]): Promise<{ available: boolean; unavailableItems: string[] }> {
  const db = getFirestoreAdmin();
  const unavailableItems: string[] = [];

  for (const item of items) {
    const productDoc = await db.collection('products').doc(item.productId).get();

    if (!productDoc.exists) {
      unavailableItems.push(`${item.name} (product not found)`);
      continue;
    }

    const productData = productDoc.data()!;
    const availableStock = productData.stockQuantity || 0;

    if (availableStock < item.quantity) {
      unavailableItems.push(`${item.name} (available: ${availableStock}, requested: ${item.quantity})`);
    }
  }

  return {
    available: unavailableItems.length === 0,
    unavailableItems,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequestBody = await request.json();
    const { items, customerEmail, shippingAddress, shippingCost, locale } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }

    // Check inventory before creating checkout session
    const inventoryCheck = await checkInventory(items);
    if (!inventoryCheck.available) {
      return NextResponse.json(
        {
          error: 'Some items are out of stock',
          unavailableItems: inventoryCheck.unavailableItems
        },
        { status: 400 }
      );
    }

    const stripe = getStripeClient();
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL;

    // Determine currency from cart items (all items should share the same currency)
    const cartCurrency = items[0]?.currency || 'jpy';

    // Create line items for Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: cartCurrency,
        product_data: {
          name: item.name,
          images: item.image ? [item.image] : [],
          metadata: {
            productId: item.productId,
            variantId: item.variantId || '',
          },
        },
        unit_amount: toSmallestUnit(item.price, cartCurrency),
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item if cost > 0
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: cartCurrency,
          product_data: {
            name: locale === 'ja' ? '送料' : 'Shipping',
          },
          unit_amount: toSmallestUnit(shippingCost, cartCurrency),
        },
        quantity: 1,
      });
    }

    // Prepare items data for metadata (Stripe metadata has 500 char limit per value)
    // Store essential info: productId and quantity for inventory update
    const itemsForInventory = items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      variantId: item.variantId || null,
    }));

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/${locale}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/cart`,
      customer_email: customerEmail,
      shipping_address_collection: shippingAddress ? undefined : {
        allowed_countries: ['US', 'JP', 'GB', 'DE', 'FR'],
      },
      metadata: {
        locale,
        itemCount: items.length.toString(),
        // Store items JSON for inventory update (will be parsed in webhook)
        items: JSON.stringify(itemsForInventory),
      },
      locale: locale === 'ja' ? 'ja' : 'en',
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
