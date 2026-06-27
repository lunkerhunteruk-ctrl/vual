import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export const maxDuration = 60;

const VALID_CATEGORIES = [
  'high_fashion', 'street', 'casual', 'minimal',
  'feminine', 'classic', 'vintage', 'resort',
];

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

async function getOrCreatePersonalStore(
  supa: NonNullable<ReturnType<typeof createServerClient>>,
  firebaseUid: string
): Promise<string | null> {
  const { data: existing } = await supa
    .from('stores')
    .select('id')
    .eq('firebase_uid', firebaseUid)
    .eq('type', 'personal')
    .single();

  if (existing) return existing.id;

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
    // recipes: per-look recipe objects (same order as images)
    // garmentUrlSets: pre-uploaded garment URLs per outfit { [outfitIdx]: string[] }
    const { images, category, title, firebaseUid, recipes, garmentUrlSets } = await request.json();

    if (!images?.length || !firebaseUid) {
      return NextResponse.json({ error: 'images and firebaseUid required' }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const supa = createServerClient();
    if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

    const storeId = await getOrCreatePersonalStore(supa, firebaseUid);
    if (!storeId) return NextResponse.json({ error: 'Failed to resolve store' }, { status: 500 });

    const bundleKey = `wardrobe/${firebaseUid}/${Date.now()}`;
    const garmentUrlsMap: Record<number, string[]> = garmentUrlSets ?? {};

    // Upload look images
    const imageUrls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      const url = await uploadBase64(images[i], `${bundleKey}/look-${i}.jpg`);
      if (url) imageUrls.push(url);
    }

    if (imageUrls.length === 0) {
      return NextResponse.json({ error: 'All uploads failed' }, { status: 500 });
    }

    // Create collection_bundle
    const { data: bundle, error: bundleErr } = await supa
      .from('collection_bundles')
      .insert({ store_id: storeId, title: title || null })
      .select('id')
      .single();

    if (bundleErr || !bundle) {
      console.error('[Publish] bundle insert error:', bundleErr);
      return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
    }

    // Create collection_looks with recipe
    const looks = imageUrls.map((url, i) => {
      const recipe = recipes?.[i] ?? null;
      const outfitIdx = recipe?.outfitIdx ?? 0;
      const garmentUrls = garmentUrlsMap[outfitIdx] ?? [];
      const finalRecipe = recipe ? { ...recipe, garmentUrls } : null;

      return {
        store_id: storeId,
        bundle_id: bundle.id,
        bundle_position: i,
        position: i,
        image_url: url,
        is_public: true,
        published_at: new Date().toISOString(),
        category,
        recipe: finalRecipe,
      };
    });

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
