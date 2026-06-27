import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 60;

const VALID_CATEGORIES = [
  'high_fashion', 'street', 'casual', 'minimal',
  'feminine', 'classic', 'vintage', 'resort',
];

async function getOrCreatePersonalStore(
  supa: NonNullable<ReturnType<typeof createServerClient>>,
  firebaseUid: string
): Promise<string | null> {
  // Look up existing personal store
  const { data: existing } = await supa
    .from('stores')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .eq('type', 'personal')
    .single();

  if (existing) return existing.id;

  // Create personal store
  const slug = `user-${firebaseUid.slice(0, 12).toLowerCase()}`;
  const { data: created } = await supa
    .from('stores')
    .insert({ slug, type: 'personal', firebase_uid: firebaseUid, name: 'My Wardrobe' })
    .select('id')
    .single();

  return created?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const { images, category, title, firebaseUid } = await request.json();

    if (!images?.length || !firebaseUid) {
      return NextResponse.json({ error: 'images and firebaseUid required' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const supa = createServerClient();
    if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    // 1. Get or create personal store
    const storeId = await getOrCreatePersonalStore(supa, firebaseUid);
    if (!storeId) return NextResponse.json({ error: 'Failed to resolve store' }, { status: 500 });

    // 2. Upload images to R2
    const bundleKey = `wardrobe/${firebaseUid}/${Date.now()}`;
    const imageUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) continue;
      const [, mimeType, base64Data] = match;
      const ext = mimeType === 'image/png' ? 'png' : 'jpg';
      const path = `${bundleKey}/look-${i}.${ext}`;
      const buffer = Buffer.from(base64Data, 'base64');

      const { error } = await storage.from('model-images').upload(path, buffer, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) {
        console.error('[Publish] R2 upload failed:', error);
        continue;
      }
      const { data: urlData } = storage.from('model-images').getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: 'All uploads failed' }, { status: 500 });
    }

    // 3. Create collection_bundle
    const { data: bundle, error: bundleErr } = await supa
      .from('collection_bundles')
      .insert({ store_id: storeId, title: title || null })
      .select('id')
      .single();

    if (bundleErr || !bundle) {
      console.error('[Publish] bundle insert error:', bundleErr);
      return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
    }

    // 4. Create collection_looks (is_public=true)
    const looks = imageUrls.map((url, i) => ({
      store_id: storeId,
      bundle_id: bundle.id,
      bundle_position: i,
      position: i,
      image_url: url,
      is_public: true,
      published_at: new Date().toISOString(),
      category,
    }));

    const { error: looksErr } = await supa.from('collection_looks').insert(looks);
    if (looksErr) {
      console.error('[Publish] looks insert error:', looksErr);
      return NextResponse.json({ error: 'Failed to save looks' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bundleId: bundle.id, count: imageUrls.length });
  } catch (err) {
    console.error('[Publish] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
