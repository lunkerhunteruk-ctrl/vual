import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const productId = searchParams.get('productId');
  const type = searchParams.get('type');
  const usageTag = searchParams.get('usage_tag');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 30;

  if (!isSupabaseConfigured()) {
    if (id) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ media: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Fetch single media by ID
    if (id) {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple media items
    let query = supabase
      .from('media')
      .select('*')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (usageTag) {
      query = query.eq('usage_tag', usageTag);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ media: data || [] });
  } catch (error: any) {
    console.error('Media API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('media')
      .insert({
        store_id: await resolveStoreIdFromRequest(request),
        ...body,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Media POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('media')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Media PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Get the media record first to find the storage path
    const { data: mediaItem } = await supabase
      .from('media')
      .select('url')
      .eq('id', id)
      .single();

    // Delete from Storage if URL contains our Supabase storage path
    if (mediaItem?.url) {
      const match = mediaItem.url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/);
      if (match) {
        await supabase.storage.from('media').remove([match[1]]);
      }
    }

    // Delete DB record
    const { error } = await supabase
      .from('media')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Media DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
