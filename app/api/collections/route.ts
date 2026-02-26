import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Fetch collection looks with linked products
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    console.log('[Collections] GET storeId:', storeId);

    // Fetch looks
    const { data: looks, error } = await supabase
      .from('collection_looks')
      .select('*')
      .eq('store_id', storeId)
      .order('position', { ascending: true });

    console.log('[Collections] GET result:', { count: looks?.length, error: error?.message });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ looks: [] });
      }
      throw error;
    }

    if (!looks || looks.length === 0) {
      return NextResponse.json({ looks: [] });
    }

    // Fetch linked products separately
    const lookIds = looks.map(l => l.id);
    const { data: linkData } = await supabase
      .from('collection_look_products')
      .select('*')
      .in('look_id', lookIds)
      .order('position', { ascending: true });

    // Fetch product details if we have links
    let productsMap: Record<string, any> = {};
    if (linkData && linkData.length > 0) {
      const productIds = [...new Set(linkData.map(l => l.product_id))];
      const { data: products } = await supabase
        .from('products')
        .select('id, name, base_price, price, currency, tax_included, images, status')
        .in('id', productIds);

      if (products) {
        productsMap = Object.fromEntries(products.map(p => [p.id, p]));
      }
    }

    // Assemble response
    const result = looks.map(look => ({
      ...look,
      collection_look_products: (linkData || [])
        .filter(lp => lp.look_id === look.id)
        .map(lp => ({
          ...lp,
          products: productsMap[lp.product_id] || null,
        })),
    }));

    return NextResponse.json({ looks: result });
  } catch (error: any) {
    console.error('Collections GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Add a new look to the collection
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { imageUrl, sourceModelImageId, sourceGeminiResultId, productIds } = body;

    console.log('[Collections] POST:', { storeId, imageUrl: imageUrl?.substring(0, 80), sourceGeminiResultId, productIds });

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Copy image to model-images bucket for permanent storage
    let permanentUrl = imageUrl;
    try {
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        const filename = `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;

        const { error: uploadError } = await supabase.storage
          .from('model-images')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('model-images')
            .getPublicUrl(filename);
          permanentUrl = urlData.publicUrl;
          console.log('[Collections] Image copied to:', permanentUrl);
        } else {
          console.error('[Collections] Image upload error:', uploadError);
        }
      }
    } catch (copyErr) {
      console.error('[Collections] Image copy error (non-blocking):', copyErr);
    }

    // Get next position
    const { data: maxPos } = await supabase
      .from('collection_looks')
      .select('position')
      .eq('store_id', storeId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPos?.position ?? -1) + 1;

    // Insert look (skip FK columns that might cause issues)
    const insertPayload: any = {
      store_id: storeId,
      image_url: permanentUrl,
      position: nextPosition,
    };
    // Only set source FKs if they exist and are valid UUIDs
    if (sourceModelImageId) insertPayload.source_model_image_id = sourceModelImageId;
    if (sourceGeminiResultId) insertPayload.source_gemini_result_id = sourceGeminiResultId;

    const { data: look, error: insertError } = await supabase
      .from('collection_looks')
      .insert(insertPayload)
      .select()
      .single();

    console.log('[Collections] Insert result:', { lookId: look?.id, error: insertError?.message });

    if (insertError) throw insertError;

    // Link products (max 4)
    if (productIds && productIds.length > 0) {
      const links = productIds.slice(0, 4).map((pid: string, idx: number) => ({
        look_id: look.id,
        product_id: pid,
        position: idx,
      }));

      const { error: linkError } = await supabase
        .from('collection_look_products')
        .insert(links);

      console.log('[Collections] Product links:', { count: links.length, error: linkError?.message });

      if (linkError) {
        console.error('[Collections] Product link error:', linkError);
      }
    }

    return NextResponse.json({ success: true, look });
  } catch (error: any) {
    console.error('[Collections] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a look from the collection
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Look ID required' }, { status: 400 });
    }

    // Get image URL to delete from storage
    const { data: look } = await supabase
      .from('collection_looks')
      .select('image_url')
      .eq('id', id)
      .single();

    if (look?.image_url) {
      const filename = look.image_url.split('/').pop();
      if (filename) {
        await supabase.storage.from('model-images').remove([filename]);
      }
    }

    const { error } = await supabase
      .from('collection_looks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Collections DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
