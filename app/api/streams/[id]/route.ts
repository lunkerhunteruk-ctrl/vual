import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

// GET: Fetch a single stream (with product details)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getFirestoreAdmin();
    const doc = await db.collection('streams').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const data = doc.data()!;
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    });
  } catch (error) {
    console.error('Get stream error:', error);
    return NextResponse.json({ error: 'Failed to get stream' }, { status: 500 });
  }
}

// PATCH: Update stream (status, products, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getFirestoreAdmin();

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'live') {
        updateData.startedAt = FieldValue.serverTimestamp();
      } else if (body.status === 'ended') {
        updateData.endedAt = FieldValue.serverTimestamp();
      }
    }

    if (body.products !== undefined) {
      updateData.products = body.products;
    }

    if (body.title !== undefined) {
      updateData.title = body.title;
    }

    await db.collection('streams').doc(id).update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update stream error:', error);
    return NextResponse.json({ error: 'Failed to update stream' }, { status: 500 });
  }
}
