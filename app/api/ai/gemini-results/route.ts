import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Auto-cleanup images older than 5 days (runs in background on GET)
async function cleanupExpiredImages(supabase: ReturnType<typeof createServerClient>) {
  if (!supabase) return;
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch expired records
    const { data: expired } = await supabase
      .from('gemini_results')
      .select('id, image_url')
      .lt('created_at', fiveDaysAgo);

    if (!expired || expired.length === 0) return;

    // Delete from storage
    const filenames = expired
      .map(r => r.image_url?.split('/').pop())
      .filter(Boolean) as string[];

    if (filenames.length > 0) {
      await supabase.storage.from('gemini-results').remove(filenames);
    }

    // Delete from database
    const ids = expired.map(r => r.id);
    await supabase.from('gemini_results').delete().in('id', ids);

    console.log(`Cleaned up ${expired.length} expired gemini results`);
  } catch (err) {
    console.error('Cleanup error (non-blocking):', err);
  }
}

// GET: Fetch saved gemini results
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Cleanup expired images in background (non-blocking)
    cleanupExpiredImages(supabase).catch(() => {});

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const storeId = searchParams.get('storeId');

    // Only fetch images from last 5 days
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    const query = supabase
      .from('gemini_results')
      .select('*')
      .gte('created_at', fiveDaysAgo)
      .order('created_at', { ascending: false });

    // Filter by store_id for multi-tenant isolation
    if (storeId) {
      query.eq('store_id', storeId);
    }

    if (!all) {
      query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching gemini results:', error);
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results: data || [],
    });
  } catch (error) {
    console.error('Gemini results GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Save a new gemini result
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    if (!body.image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer and upload
    const base64Data = body.image.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const filename = `gemini-manual-${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gemini-results')
      .upload(filename, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('gemini-results')
      .getPublicUrl(filename);

    const imageUrl = urlData.publicUrl;

    // Save to database
    const { data: insertData, error: insertError } = await supabase
      .from('gemini_results')
      .insert({
        image_url: imageUrl,
        garment_count: body.garmentCount || 1,
        ...(body.storeId ? { store_id: body.storeId } : {}),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to save result' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      result: insertData,
      imageUrl,
    });
  } catch (error) {
    console.error('Gemini results POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a gemini result
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    // Get the image URL first to delete from storage
    const { data: result, error: fetchError } = await supabase
      .from('gemini_results')
      .select('image_url')
      .eq('id', id)
      .single();

    if (fetchError || !result) {
      return NextResponse.json(
        { error: 'Result not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    if (result.image_url) {
      const filename = result.image_url.split('/').pop();
      if (filename) {
        await supabase.storage
          .from('gemini-results')
          .remove([filename]);
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('gemini_results')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete result' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Result deleted successfully',
    });
  } catch (error) {
    console.error('Gemini results DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
