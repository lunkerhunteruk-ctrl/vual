import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Mux lazily to avoid build-time errors
function getMuxClient(): Mux {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error('MUX_TOKEN_ID or MUX_TOKEN_SECRET is not configured');
  }
  return new Mux({ tokenId, tokenSecret });
}

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

    const mux = getMuxClient();

    // Create live stream with Mux
    const stream = await mux.video.liveStreams.create({
      playback_policy: ['public'],
      new_asset_settings: {
        playback_policy: ['public'],
      },
      latency_mode: 'low',
      reconnect_window: 60,
      max_continuous_duration: 43200, // 12 hours
    });

    // Save to Firestore
    const db = getFirestoreAdmin();
    await db.collection('streams').doc(stream.id).set({
      shopId,
      title,
      status: 'scheduled',
      playbackId: stream.playback_ids?.[0]?.id || null,
      streamKey: stream.stream_key || null,
      viewerCount: 0,
      peakViewerCount: 0,
      products: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const streamData = {
      id: stream.id,
      streamKey: stream.stream_key,
      playbackId: stream.playback_ids?.[0]?.id,
      status: 'scheduled',
      title,
      shopId,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(streamData);
  } catch (error) {
    console.error('Create stream error:', error);
    return NextResponse.json(
      { error: 'Failed to create live stream' },
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

    const mux = getMuxClient();

    // In production, fetch from Firestore filtered by shopId
    // For now, fetch all live streams from Mux
    const streams = await mux.video.liveStreams.list();

    return NextResponse.json({
      streams: streams.data.map((stream) => ({
        id: stream.id,
        status: stream.status,
        playbackId: stream.playback_ids?.[0]?.id,
        createdAt: stream.created_at,
      })),
    });
  } catch (error) {
    console.error('Get streams error:', error);
    return NextResponse.json(
      { error: 'Failed to get streams' },
      { status: 500 }
    );
  }
}
