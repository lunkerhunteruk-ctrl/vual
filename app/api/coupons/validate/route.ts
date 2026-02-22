import { NextRequest, NextResponse } from 'next/server';

// Mock coupon data - in production, fetch from Firestore
const mockCoupons = [
  {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    minPurchase: 50,
    isActive: true,
    expiresAt: new Date('2025-12-31'),
  },
  {
    code: 'SAVE20',
    type: 'fixed_amount',
    value: 20,
    minPurchase: 100,
    isActive: true,
    expiresAt: new Date('2025-12-31'),
  },
  {
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    minPurchase: 75,
    isActive: true,
    expiresAt: new Date('2025-12-31'),
  },
];

interface ValidateCouponRequest {
  code: string;
  subtotal: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidateCouponRequest = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    // Find coupon
    const coupon = mockCoupons.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );

    if (!coupon) {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 404 }
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { error: 'This coupon is no longer active' },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > coupon.expiresAt) {
      return NextResponse.json(
        { error: 'This coupon has expired' },
        { status: 400 }
      );
    }

    // Check minimum purchase
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      return NextResponse.json(
        { error: `Minimum purchase of $${coupon.minPurchase} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discount = 0;
    switch (coupon.type) {
      case 'percentage':
        discount = (subtotal * coupon.value) / 100;
        break;
      case 'fixed_amount':
        discount = coupon.value;
        break;
      case 'free_shipping':
        // Return special flag for free shipping
        return NextResponse.json({
          valid: true,
          discount: 0,
          freeShipping: true,
          message: 'Free shipping applied!',
        });
    }

    return NextResponse.json({
      valid: true,
      discount: Math.min(discount, subtotal), // Don't exceed subtotal
      freeShipping: false,
      message: `Coupon applied! You saved $${discount.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}
