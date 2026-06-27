import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

// DELETE — remove a look from a collection (unpublish)
export async function DELETE(request: NextRequest) {
  const { lookId, firebaseUid } = await request.json();
  if (!lookId || !firebaseUid) {
    return NextResponse.json({ error: 'lookId and firebaseUid required' }, { status: 400 });
  }

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  // Verify the look belongs to this user's store
  const { data: look } = await supa
    .from('collection_looks')
    .select('id, store_id, stores!inner(firebase_uid)')
    .eq('id', lookId)
    .single();

  if (!look || (look.stores as any)?.firebase_uid !== firebaseUid) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { error } = await supa.from('collection_looks').delete().eq('id', lookId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// POST — add a saved look (user_generations) to an existing bundle
export async function POST(request: NextRequest) {
  const { bundleId, generationId, firebaseUid } = await request.json();
  if (!bundleId || !generationId || !firebaseUid) {
    return NextResponse.json({ error: 'bundleId, generationId, firebaseUid required' }, { status: 400 });
  }

  const supa = createServerClient();
  if (!supa) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

  // Verify bundle ownership
  const { data: bundle } = await supa
    .from('collection_bundles')
    .select('id, store_id, stores!inner(firebase_uid, id)')
    .eq('id', bundleId)
    .single();

  if (!bundle || (bundle.stores as any)?.firebase_uid !== firebaseUid) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const storeId = (bundle.stores as any).id;

  // Get the user_generation record
  const { data: gen } = await supa
    .from('user_generations')
    .select('id, image_url, recipe')
    .eq('id', generationId)
    .eq('firebase_uid', firebaseUid)
    .single();

  if (!gen) return NextResponse.json({ error: 'Generation not found' }, { status: 404 });

  // Get current max position in this bundle
  const { data: existing } = await supa
    .from('collection_looks')
    .select('bundle_position')
    .eq('bundle_id', bundleId)
    .order('bundle_position', { ascending: false })
    .limit(1);

  const nextPos = ((existing?.[0]?.bundle_position ?? -1) as number) + 1;

  // Copy image to wardrobe R2 path
  let imageUrl = gen.image_url;
  if (imageUrl && !imageUrl.includes('/wardrobe/')) {
    try {
      const imgRes = await fetch(imageUrl);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const newPath = `wardrobe/${firebaseUid}/added/${Date.now()}.jpg`;
      await storage.from('model-images').upload(newPath, buf, { contentType: 'image/jpeg', upsert: false });
      const { data } = storage.from('model-images').getPublicUrl(newPath);
      imageUrl = data.publicUrl;
    } catch {
      // keep original URL if copy fails
    }
  }

  const recipe = (gen as any).recipe ?? null;
  const { error } = await supa.from('collection_looks').insert({
    store_id: storeId,
    bundle_id: bundleId,
    bundle_position: nextPos,
    position: nextPos,
    image_url: imageUrl,
    is_public: true,
    published_at: new Date().toISOString(),
    recipe,
    generation_id: generationId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
