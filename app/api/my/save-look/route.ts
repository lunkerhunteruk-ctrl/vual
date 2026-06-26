import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, firebaseUid, variant } = await request.json();

    if (!imageDataUrl || !firebaseUid) {
      return NextResponse.json({ error: 'imageDataUrl and firebaseUid required' }, { status: 400 });
    }

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }
    const [, mimeType, base64Data] = match;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filename = `user-looks/${firebaseUid}/${Date.now()}-${variant || 'A'}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to R2 (model-images bucket = permanent)
    const { error: uploadError } = await storage.from('model-images').upload(filename, buffer, {
      contentType: mimeType,
      upsert: false,
    });

    if (uploadError) {
      console.error('[SaveLook] R2 upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = storage.from('model-images').getPublicUrl(filename);
    const imageUrl = urlData.publicUrl;

    // Insert into user_generations
    const supa = createServerClient();
    if (supa) {
      await supa.from('user_generations').insert({
        firebase_uid: firebaseUid,
        image_url: imageUrl,
        look_file: null,
        city: null,
      });
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (err) {
    console.error('[SaveLook] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
