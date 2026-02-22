import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

interface InventoryUpdate {
  productId: string;
  variantId?: string;
  quantity: number;
  operation: 'set' | 'increment' | 'decrement';
}

// POST - Update inventory
export async function POST(request: NextRequest) {
  try {
    const body: InventoryUpdate = await request.json();
    const { productId, variantId, quantity, operation } = body;

    if (!productId || quantity === undefined || !operation) {
      return NextResponse.json(
        { error: 'productId, quantity, and operation are required' },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const productRef = db.collection('products').doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentData = productDoc.data()!;
    let newQuantity: number;

    // Calculate new quantity
    switch (operation) {
      case 'set':
        newQuantity = quantity;
        break;
      case 'increment':
        newQuantity = (currentData.stockQuantity || 0) + quantity;
        break;
      case 'decrement':
        newQuantity = Math.max(0, (currentData.stockQuantity || 0) - quantity);
        break;
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    // Determine stock status
    const stockStatus = newQuantity > 10
      ? 'in_stock'
      : newQuantity > 0
        ? 'low_stock'
        : 'out_of_stock';

    // Update product
    await productRef.update({
      stockQuantity: newQuantity,
      stockStatus,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      productId,
      previousQuantity: currentData.stockQuantity || 0,
      newQuantity,
      stockStatus,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update inventory (for order completion)
export async function PUT(request: NextRequest) {
  try {
    const body: { items: { productId: string; quantity: number }[] } = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items array is required' },
        { status: 400 }
      );
    }

    const db = getFirestoreAdmin();
    const batch = db.batch();
    const results: { productId: string; success: boolean; error?: string }[] = [];

    for (const item of items) {
      const productRef = db.collection('products').doc(item.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        results.push({ productId: item.productId, success: false, error: 'Product not found' });
        continue;
      }

      const currentData = productDoc.data()!;
      const currentQuantity = currentData.stockQuantity || 0;

      if (currentQuantity < item.quantity) {
        results.push({
          productId: item.productId,
          success: false,
          error: `Insufficient stock. Available: ${currentQuantity}, Requested: ${item.quantity}`
        });
        continue;
      }

      const newQuantity = currentQuantity - item.quantity;
      const stockStatus = newQuantity > 10 ? 'in_stock' : newQuantity > 0 ? 'low_stock' : 'out_of_stock';

      batch.update(productRef, {
        stockQuantity: newQuantity,
        stockStatus,
        updatedAt: new Date(),
      });

      results.push({ productId: item.productId, success: true });
    }

    // Check if all items can be fulfilled
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      return NextResponse.json(
        { error: 'Some items could not be updated', details: failures },
        { status: 400 }
      );
    }

    // Commit the batch
    await batch.commit();

    return NextResponse.json({
      message: 'Inventory updated successfully',
      results
    });
  } catch (error) {
    console.error('Bulk inventory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

// GET - Check stock availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const quantity = parseInt(searchParams.get('quantity') || '1');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const productDoc = await db.collection('products').doc(productId).get();

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data = productDoc.data()!;
    const available = (data.stockQuantity || 0) >= quantity;

    return NextResponse.json({
      productId,
      stockQuantity: data.stockQuantity || 0,
      stockStatus: data.stockStatus || 'unknown',
      requestedQuantity: quantity,
      available,
    });
  } catch (error) {
    console.error('Stock check error:', error);
    return NextResponse.json(
      { error: 'Failed to check stock' },
      { status: 500 }
    );
  }
}
