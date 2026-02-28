import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createServerClient } from '@/lib/supabase';
import { liveStreamStartMessage } from '@/lib/notifications/templates';
import { createHmac, timingSafeEqual } from 'crypto';

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
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify Cloudflare Stream webhook signature (HMAC-SHA256)
    // Format: Webhook-Signature: time=<unix_ts>,sig1=<hex_hmac>
    const webhookSecret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signatureHeader = request.headers.get('webhook-signature');
      if (!signatureHeader) {
        console.log('[webhook] Missing Webhook-Signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      const parts = Object.fromEntries(
        signatureHeader.split(',').map(p => {
          const [k, ...v] = p.split('=');
          return [k, v.join('=')];
        })
      );
      const timestamp = parts.time;
      const expectedSig = parts.sig1;
      if (!timestamp || !expectedSig) {
        console.log('[webhook] Invalid signature format:', signatureHeader);
        return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
      }
      const source = `${timestamp}.${rawBody}`;
      const computedSig = createHmac('sha256', webhookSecret).update(source).digest('hex');
      try {
        const valid = timingSafeEqual(Buffer.from(computedSig), Buffer.from(expectedSig));
        if (!valid) {
          console.log('[webhook] Signature mismatch');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      } catch {
        console.log('[webhook] Signature verification error');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);
    console.log('[webhook] Received:', JSON.stringify({ uid: body.uid, liveInput: body.liveInput, state: body.status?.state }));

    // Cloudflare Stream webhook payload structure:
    // { uid, readyToStream, status: { state }, liveInput, meta, ... }
    const liveInputUid = body.liveInput;
    const state = body.status?.state; // 'ready', 'live-inprogress', 'error'

    if (!liveInputUid) {
      console.log('[webhook] No liveInput in payload, skipping');
      return NextResponse.json({ received: true });
    }

    const db = getFirestoreAdmin();
    const streamRef = db.collection('streams').doc(liveInputUid);

    if (state === 'live-inprogress') {
      // Stream started broadcasting
      // Use set+merge instead of update to handle race condition:
      // Cloudflare webhook may fire before client-side setDoc completes
      await streamRef.set({
        status: 'live',
        startedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      console.log(`Stream ${liveInputUid} is now live`);

      // Send LINE push notification to all customers with line_user_id
      try {
        // Wait briefly for client-side setDoc to complete (race condition)
        let streamDoc = await streamRef.get();
        let streamData = streamDoc.data();
        console.log('[webhook] Stream data (1st read):', JSON.stringify({ shopId: streamData?.shopId, title: streamData?.title, status: streamData?.status }));
        if (!streamData?.shopId) {
          // Client setDoc hasn't completed yet — retry after short delay
          console.log('[webhook] shopId missing, waiting 3s for client setDoc...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          streamDoc = await streamRef.get();
          streamData = streamDoc.data();
          console.log('[webhook] Stream data (2nd read):', JSON.stringify({ shopId: streamData?.shopId, title: streamData?.title }));
        }
        const shopId = streamData?.shopId;
        const title = streamData?.title || 'ライブ配信';

        const supabase = createServerClient();
        console.log('[webhook] shopId:', shopId, '| supabase:', supabase ? 'OK' : 'NULL');
        if (!shopId) {
          console.log('[webhook] No shopId found in stream doc — cannot send LINE notification');
        }
        if (shopId && supabase) {
          // Get LINE user IDs of customers
          const { data: customers, error: custErr } = await supabase
            .from('customers')
            .select('line_user_id')
            .eq('store_id', shopId)
            .not('line_user_id', 'is', null);

          if (custErr) {
            console.error('[webhook] Failed to fetch customers:', custErr);
          }

          const lineUserIds = (customers || [])
            .map((c) => c.line_user_id)
            .filter((id): id is string => !!id);

          console.log('[webhook] LINE user IDs found:', lineUserIds.length, lineUserIds);
          if (lineUserIds.length > 0) {
            // Get store's LINE channel access token
            const { data: store } = await supabase
              .from('stores')
              .select('line_channel_access_token')
              .eq('id', shopId)
              .single();

            const lineToken = store?.line_channel_access_token;
            console.log('[webhook] LINE token:', lineToken ? lineToken.substring(0, 20) + '...' : 'NULL');
            if (lineToken) {
              const message = liveStreamStartMessage({ title, streamId: liveInputUid });
              // Send in batches of 500 (LINE API limit)
              for (let i = 0; i < lineUserIds.length; i += 500) {
                const batch = lineUserIds.slice(i, i + 500);
                const res = await fetch('https://api.line.me/v2/bot/message/multicast', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${lineToken}`,
                  },
                  body: JSON.stringify({ to: batch, messages: [message] }),
                });
                const resBody = await res.text();
                console.log(`[webhook] LINE multicast response: ${res.status} ${resBody}`);
                if (!res.ok) {
                  console.error(`[webhook] LINE multicast failed: ${res.status} ${resBody}`);
                }
              }
              console.log(`LINE notification sent to ${lineUserIds.length} users for stream ${liveInputUid}`);
            } else {
              console.log(`No LINE token configured for store ${shopId}`);
            }
          } else {
            console.log(`No LINE users to notify for store ${shopId}`);
          }
        }
      } catch (notifyErr) {
        console.error('LINE notification error (non-blocking):', notifyErr);
      }
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

      await streamRef.set(updates, { merge: true });
    } else if (state === 'error') {
      await streamRef.set({
        status: 'test',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
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
