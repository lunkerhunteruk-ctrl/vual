import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// Coordinate = a pre-assembled outfit (set of catalog products in category
// slots) that stylists build ahead of time and later insert into the studio.
//
// items shape: [{ productId: string, category: string, position: number }]

// GET - list coordinates for the current store
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ coordinates: [], mock: true });
    }
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const { data, error } = await supabase
      .from('coordinates')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Coordinates list error:', error);
      return NextResponse.json({ error: 'Failed to fetch coordinates', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ coordinates: data || [] });
  } catch (error) {
    console.error('Coordinates GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - create a coordinate
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { name, items, coverImageUrl } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const { data, error } = await supabase
      .from('coordinates')
      .insert({
        store_id: storeId,
        name: name || '',
        items,
        cover_image_url: coverImageUrl || null,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Coordinate insert error:', error);
      return NextResponse.json({ error: 'Failed to create coordinate', details: error?.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Coordinates POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - delete a coordinate (?id=)
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const { error } = await supabase
      .from('coordinates')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId); // scope to own store

    if (error) {
      console.error('Coordinate delete error:', error);
      return NextResponse.json({ error: 'Failed to delete coordinate', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Coordinates DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
