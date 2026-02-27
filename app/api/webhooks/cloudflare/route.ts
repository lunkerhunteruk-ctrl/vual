import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MIN_DURATION_MINUTES = 5;

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

// Cloudflare Stream webhook notifications
// Docs: https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret header if configured
    const webhookSecret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('webhook-signature');
      if (!signature || signature !== webhookSecret) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Cloudflare Stream webhook payload structure:
    // { uid, readyToStream, status: { state }, liveInput, meta, ... }
    const liveInputUid = body.liveInput;
    const state = body.status?.state; // 'ready', 'live-inprogress', 'error'

    if (!liveInputUid) {
      return NextResponse.json({ received: true });
    }

    const db = getFirestoreAdmin();
    const streamRef = db.collection('streams').doc(liveInputUid);

    if (state === 'live-inprogress') {
      // Stream started broadcasting
      await streamRef.update({
        status: 'live',
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Stream ${liveInputUid} is now live`);
    } else if (state === 'ready') {
      // Recording is ready (stream ended and video is available)
      const streamDoc = await streamRef.get();
      if (!streamDoc.exists) {
        console.log(`Stream ${liveInputUid} not found in Firestore`);
        return NextResponse.json({ received: true });
      }

      const streamData = streamDoc.data();
      const startedAt = streamData?.startedAt?.toDate();
      const now = new Date();

      // Save the recorded video UID for playback
      const updates: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (body.uid) {
        updates.recordedVideoId = body.uid;
      }

      if (startedAt) {
        const durationMs = now.getTime() - startedAt.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        if (durationMinutes >= MIN_DURATION_MINUTES) {
          updates.status = 'ended';
          updates.endedAt = FieldValue.serverTimestamp();
          updates.duration = durationMinutes;
          console.log(`Stream ${liveInputUid} ended (${durationMinutes}m) — saved as broadcast`);
        } else {
          updates.status = 'test';
          updates.endedAt = FieldValue.serverTimestamp();
          updates.duration = durationMinutes;
          console.log(`Stream ${liveInputUid} ended (${durationMinutes}m) — marked as test`);
        }
      } else {
        updates.status = 'test';
        updates.endedAt = FieldValue.serverTimestamp();
        console.log(`Stream ${liveInputUid} ended without startedAt — marked as test`);
      }

      await streamRef.update(updates);
    } else if (state === 'error') {
      await streamRef.update({
        status: 'test',
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Stream ${liveInputUid} errored`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Cloudflare Stream webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
