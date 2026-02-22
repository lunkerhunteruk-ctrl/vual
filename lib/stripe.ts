import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Checkout session creation (to be called from API route)
export interface CreateCheckoutSessionParams {
  lineItems: {
    price_data: {
      currency: string;
      product_data: {
        name: string;
        images?: string[];
        description?: string;
      };
      unit_amount: number;
    };
    quantity: number;
  }[];
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  id: string;
  url: string;
}

// Client-side redirect to Stripe Checkout
export async function redirectToCheckout(checkoutUrl: string): Promise<void> {
  // For Stripe Checkout, we simply redirect to the checkout URL
  // The URL is returned from the checkout session creation API
  window.location.href = checkoutUrl;
}

// Create checkout session via API and redirect
export async function createCheckoutAndRedirect(
  items: { name: string; price: number; quantity: number; image?: string }[],
  options?: {
    customerEmail?: string;
    shippingCost?: number;
    locale?: string;
  }
): Promise<void> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: items.map((item) => ({
        productId: '',
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      customerEmail: options?.customerEmail,
      shippingCost: options?.shippingCost || 0,
      locale: options?.locale || 'en',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  const { url } = await response.json();
  if (url) {
    window.location.href = url;
  } else {
    throw new Error('No checkout URL returned');
  }
}

// Format price for Stripe (converts to cents)
export function formatPriceForStripe(price: number): number {
  return Math.round(price * 100);
}

// Format price from Stripe (converts from cents)
export function formatPriceFromStripe(amount: number): number {
  return amount / 100;
}
