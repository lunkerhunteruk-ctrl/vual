import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
function getFirestoreAdmin() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // For development without service account, use application default credentials
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Fallback for environments without service account
      initializeApp({ projectId });
    }
  }
  return getFirestore();
}

// GET - List products or get single product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = getFirestoreAdmin();

    if (productId) {
      // Get single product
      const doc = await db.collection('products').doc(productId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      return NextResponse.json({ id: doc.id, ...doc.data() });
    }

    // List products
    let query = db.collection('products')
      .where('isPublished', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (category) {
      query = query.where('categories', 'array-contains', category);
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Failed to get products' },
      { status: 500 }
    );
  }
}

// POST - Create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getFirestoreAdmin();

    const product = {
      ...body,
      stockQuantity: body.stockQuantity || 0,
      stockStatus: body.stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
      isPublished: body.isPublished ?? false,
      isFeatured: body.isFeatured ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection('products').add(product);

    return NextResponse.json({
      id: docRef.id,
      ...product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const docRef = db.collection('products').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Update stock status based on quantity
    if (updates.stockQuantity !== undefined) {
      updates.stockStatus = updates.stockQuantity > 10
        ? 'in_stock'
        : updates.stockQuantity > 0
          ? 'low_stock'
          : 'out_of_stock';
    }

    updates.updatedAt = new Date();

    await docRef.update(updates);

    return NextResponse.json({
      id,
      ...updates,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    await db.collection('products').doc(id).delete();

    return NextResponse.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
