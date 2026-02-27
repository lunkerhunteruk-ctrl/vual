import { NextRequest, NextResponse } from 'next/server';
import { createLiveInput, type CloudflareLiveInput } from '@/lib/cloudflare-stream';
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

// Create a new live stream
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, shopId } = body;

    if (!title || !shopId) {
      return NextResponse.json(
        { error: 'Title and shopId are required' },
        { status: 400 }
      );
    }

    // Create live input with Cloudflare Stream
    const liveInput: CloudflareLiveInput = await createLiveInput({
      title,
      shopId,
    });

    // Save to Firestore (non-blocking — stream works even if Firestore fails)
    try {
      const db = getFirestoreAdmin();
      await db.collection('streams').doc(liveInput.uid).set({
        shopId,
        title,
        status: 'scheduled',
        playbackId: liveInput.uid,
        streamKey: liveInput.rtmps.streamKey,
        rtmpsUrl: liveInput.rtmps.url,
        viewerCount: 0,
        peakViewerCount: 0,
        products: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (firestoreError) {
      console.error('Firestore save error (stream still created):', firestoreError);
    }

    return NextResponse.json({
      id: liveInput.uid,
      streamKey: liveInput.rtmps.streamKey,
      rtmpsUrl: liveInput.rtmps.url,
      playbackId: liveInput.uid,
      status: 'scheduled',
      title,
      shopId,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create stream error:', error);
    return NextResponse.json(
      { error: 'Failed to create live stream', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Get all streams for a shop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      );
    }

    // Fetch from Firestore filtered by shopId
    const db = getFirestoreAdmin();
    const snapshot = await db.collection('streams')
      .where('shopId', '==', shopId)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const streams = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        playbackId: data.playbackId,
        title: data.title,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    return NextResponse.json({ streams });
  } catch (error) {
    console.error('Get streams error:', error);
    return NextResponse.json(
      { error: 'Failed to get streams' },
      { status: 500 }
    );
  }
}
