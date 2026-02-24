import { NextRequest, NextResponse } from 'next/server';
import Mux from '@mux/mux-node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MIN_DURATION_MINUTES = 5;

function getMuxClient(): Mux {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    throw new Error('MUX_TOKEN_ID or MUX_TOKEN_SECRET is not configured');
  }
  return new Mux({ tokenId, tokenSecret });
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const mux = getMuxClient();
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    let event: { type: string; data: { id?: string } };
    if (webhookSecret) {
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const verified = mux.webhooks.unwrap(body, headers, webhookSecret);
      event = { type: verified.type, data: verified.data as { id?: string } };
    } else {
      // Development: skip verification
      event = JSON.parse(body);
    }

    const db = getFirestoreAdmin();
    const streamId = event.data?.id;

    if (!streamId) {
      return NextResponse.json({ received: true });
    }

    const streamRef = db.collection('streams').doc(streamId);

    switch (event.type) {
      case 'video.live_stream.active': {
        // Stream started broadcasting
        await streamRef.update({
          status: 'live',
          startedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`Stream ${streamId} is now live`);
        break;
      }

      case 'video.live_stream.idle': {
        // Stream stopped broadcasting
        const streamDoc = await streamRef.get();
        if (!streamDoc.exists) {
          console.log(`Stream ${streamId} not found in Firestore`);
          break;
        }

        const streamData = streamDoc.data();
        const startedAt = streamData?.startedAt?.toDate();
        const now = new Date();

        if (startedAt) {
          const durationMs = now.getTime() - startedAt.getTime();
          const durationMinutes = Math.round(durationMs / 60000);

          if (durationMinutes >= MIN_DURATION_MINUTES) {
            // Real broadcast — save as ended
            await streamRef.update({
              status: 'ended',
              endedAt: FieldValue.serverTimestamp(),
              duration: durationMinutes,
              updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`Stream ${streamId} ended (${durationMinutes}m) — saved as broadcast`);
          } else {
            // Test/short broadcast — mark as test
            await streamRef.update({
              status: 'test',
              endedAt: FieldValue.serverTimestamp(),
              duration: durationMinutes,
              updatedAt: FieldValue.serverTimestamp(),
            });
            console.log(`Stream ${streamId} ended (${durationMinutes}m) — marked as test`);
          }
        } else {
          // No startedAt recorded — treat as test
          await streamRef.update({
            status: 'test',
            endedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          console.log(`Stream ${streamId} ended without startedAt — marked as test`);
        }
        break;
      }

      case 'video.live_stream.deleted': {
        // Stream deleted in Mux
        const deleteDoc = await streamRef.get();
        if (deleteDoc.exists) {
          await streamRef.delete();
          console.log(`Stream ${streamId} deleted from Firestore`);
        }
        break;
      }

      default:
        console.log(`Unhandled Mux webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Mux webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
