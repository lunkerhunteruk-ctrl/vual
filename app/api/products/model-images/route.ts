import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Fetch model images for a product
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('product_model_image_links')
      .select('*, product_model_images(*)')
      .eq('product_id', productId)
      .order('position', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch model images' }, { status: 500 });
    }

    const modelImages = (data || []).map(link => ({
      id: link.product_model_images.id,
      image_url: link.product_model_images.image_url,
      position: link.position,
      link_id: link.id,
      created_at: link.product_model_images.created_at,
    }));

    return NextResponse.json({ success: true, modelImages });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Link a generated image to products
// Copies image from gemini-results (temporary, 5-day) to model-images (permanent) bucket
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { imageUrl, sourceResultId, productIds } = body as {
      imageUrl: string;
      sourceResultId?: string;
      productIds: string[];
    };

    if (!imageUrl || !productIds || productIds.length === 0) {
      return NextResponse.json(
        { error: 'imageUrl and productIds are required' },
        { status: 400 }
      );
    }

    // Check if this image already exists as a model image (by source_result_id or permanent URL)
    let modelImageId: string;
    let permanentUrl = imageUrl;

    const { data: existing } = await supabase
      .from('product_model_images')
      .select('id, image_url')
      .eq('source_result_id', sourceResultId || '')
      .single();

    if (existing) {
      modelImageId = existing.id;
      permanentUrl = existing.image_url;
    } else {
      // Copy image from gemini-results to model-images bucket for permanent storage
      // This prevents the 5-day auto-cleanup from deleting linked images
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
          const filename = `model-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;

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
            console.error('Model image upload error:', uploadError);
            // Fall back to original URL if copy fails
          }
        }
      } catch (copyErr) {
        console.error('Image copy error (non-blocking):', copyErr);
        // Fall back to original URL
      }

      // Create new model image record with permanent URL
      const { data: newImage, error: insertError } = await supabase
        .from('product_model_images')
        .insert({
          image_url: permanentUrl,
          source_result_id: sourceResultId || null,
        })
        .select('id')
        .single();

      if (insertError || !newImage) {
        return NextResponse.json({ error: 'Failed to create model image' }, { status: 500 });
      }
      modelImageId = newImage.id;
    }

    // Create links for each product (skip duplicates)
    const links = productIds.map(productId => ({
      model_image_id: modelImageId,
      product_id: productId,
    }));

    const { data: linkData, error: linkError } = await supabase
      .from('product_model_image_links')
      .upsert(links, { onConflict: 'model_image_id,product_id' })
      .select();

    if (linkError) {
      console.error('Link error:', linkError);
      return NextResponse.json({ error: 'Failed to link image to products' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      modelImageId,
      permanentUrl,
      linkedProducts: linkData?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Unlink a model image from a product
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const modelImageId = searchParams.get('modelImageId');
    const productId = searchParams.get('productId');

    if (linkId) {
      await supabase.from('product_model_image_links').delete().eq('id', linkId);
    } else if (modelImageId && productId) {
      await supabase
        .from('product_model_image_links')
        .delete()
        .eq('model_image_id', modelImageId)
        .eq('product_id', productId);
    } else {
      return NextResponse.json({ error: 'linkId or (modelImageId + productId) required' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
