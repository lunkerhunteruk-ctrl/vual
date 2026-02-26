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

    const { data: looks, error } = await supabase
      .from('collection_looks')
      .select(`
        *,
        collection_look_products (
          id, product_id, position,
          products:product_id ( id, name, base_price, price, currency, tax_included, images, status )
        )
      `)
      .eq('store_id', storeId)
      .order('position', { ascending: true });

    if (error) {
      // Table may not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ looks: [] });
      }
      throw error;
    }

    return NextResponse.json({ looks: looks || [] });
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
        } else {
          console.error('Collection image upload error:', uploadError);
        }
      }
    } catch (copyErr) {
      console.error('Image copy error (non-blocking):', copyErr);
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

    // Insert look
    const { data: look, error: insertError } = await supabase
      .from('collection_looks')
      .insert({
        store_id: storeId,
        image_url: permanentUrl,
        source_model_image_id: sourceModelImageId || null,
        source_gemini_result_id: sourceGeminiResultId || null,
        position: nextPosition,
      })
      .select()
      .single();

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

      if (linkError) {
        console.error('Product link error:', linkError);
      }
    }

    return NextResponse.json({ success: true, look });
  } catch (error: any) {
    console.error('Collections POST error:', error);
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
