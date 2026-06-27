import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, firebaseUid } = await request.json();
    if (!imageDataUrl || !firebaseUid) {
      return NextResponse.json({ error: 'imageDataUrl and firebaseUid required' }, { status: 400 });
    }

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    const [, mimeType, base64Data] = match;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `face-refs/${firebaseUid}/face.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    const { error: uploadError } = await storage.from('model-images').upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

    const { data: urlData } = storage.from('model-images').getPublicUrl(path);
    const faceImageUrl = urlData.publicUrl;

    const supa = createServerClient();
    if (supa) {
      // UPSERT: INSERT if no row exists for this firebase_uid, UPDATE if it does
      const { error: dbError } = await supa
        .from('consumer_credits')
        .upsert(
          { firebase_uid: firebaseUid, face_image_url: faceImageUrl },
          { onConflict: 'firebase_uid' }
        );
      if (dbError) {
        console.error('[Face] DB upsert error:', dbError);
        // R2 upload succeeded, return the URL even if DB failed
      }
    }

    return NextResponse.json({ success: true, faceImageUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { firebaseUid } = await request.json();
    if (!firebaseUid) return NextResponse.json({ error: 'firebaseUid required' }, { status: 400 });

    const supa = createServerClient();
    if (supa) {
      await supa
        .from('consumer_credits')
        .update({ face_image_url: null })
        .eq('firebase_uid', firebaseUid);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
