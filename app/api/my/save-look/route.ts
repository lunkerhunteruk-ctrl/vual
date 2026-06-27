import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 30;

async function uploadBase64(dataUrl: string, path: string): Promise<string | null> {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');
  const { error } = await storage.from('model-images').upload(path, buffer, { contentType: mimeType, upsert: false });
  if (error) return null;
  const { data } = storage.from('model-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: NextRequest) {
  try {
    const { imageDataUrl, firebaseUid, variant, garmentImages, recipe } = await request.json();

    if (!imageDataUrl || !firebaseUid) {
      return NextResponse.json({ error: 'imageDataUrl and firebaseUid required' }, { status: 400 });
    }

    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
    }
    const [, mimeType, base64Data] = match;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const ts = Date.now();
    const lookPath = `user-looks/${firebaseUid}/${ts}-${variant || 'A'}.${ext}`;
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload generated look image
    const { error: uploadError } = await storage.from('model-images').upload(lookPath, buffer, {
      contentType: mimeType,
      upsert: false,
    });
    if (uploadError) {
      console.error('[SaveLook] R2 upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
    const { data: urlData } = storage.from('model-images').getPublicUrl(lookPath);
    const imageUrl = urlData.publicUrl;

    // Upload garment images to R2 and build garmentUrls for recipe
    let garmentUrls: string[] = [];
    if (Array.isArray(garmentImages) && garmentImages.length > 0) {
      const uploads = await Promise.all(
        garmentImages.map((img: string, i: number) => {
          const gPath = `user-looks/${firebaseUid}/garments/${ts}-${i}.jpg`;
          return uploadBase64(img, gPath);
        })
      );
      garmentUrls = uploads.filter(Boolean) as string[];
    }

    // Build final recipe — keep existing garmentUrls if no new uploads
    const finalGarmentUrls = garmentUrls.length > 0 ? garmentUrls : (recipe?.garmentUrls ?? []);
    const finalRecipe = recipe ? { ...recipe, garmentUrls: finalGarmentUrls } : null;

    // Insert into user_generations
    const supa = createServerClient();
    if (supa) {
      await supa.from('user_generations').insert({
        firebase_uid: firebaseUid,
        image_url: imageUrl,
        look_file: null,
        city: recipe?.location ?? null,
        recipe: finalRecipe,
      });
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (err) {
    console.error('[SaveLook] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
