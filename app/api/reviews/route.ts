import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';
import { getRequestUser, canManageStore, requireStoreOwner } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const productId = searchParams.get('productId');
  const status = searchParams.get('status');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 20;

  if (!isSupabaseConfigured()) {
    if (id) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ reviews: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // 承認前のレビューはショップのオーナーだけが見られる。それ以外の人には承認済みだけ返す
    const storeId = await resolveStoreIdFromRequest(request);
    const user = await getRequestUser(request);
    const isOwner = !!user && (await canManageStore(user, storeId));

    // Fetch single review by ID
    if (id) {
      let single = supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .eq('store_id', storeId);
      if (!isOwner) single = single.eq('status', 'approved');
      const { data, error } = await single.single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple reviews
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    if (!isOwner) {
      query = query.eq('status', 'approved');
    } else if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ reviews: data || [] });
  } catch (error: any) {
    // Table may not exist yet — return empty instead of 500
    if (error?.code === '42P01' || error?.message?.includes('reviews')) {
      if (id) return NextResponse.json(null);
      return NextResponse.json({ reviews: [] });
    }
    console.error('Reviews API error:', error);
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

  const owner = await requireStoreOwner(request);
  if (owner instanceof Response) return owner;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    delete updates.store_id; // 別ショップへ付け替えさせない

    if (!id) {
      return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .eq('store_id', owner.storeId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Reviews PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Review ID required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  const owner = await requireStoreOwner(request);
  if (owner instanceof Response) return owner;

  try {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('store_id', owner.storeId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Reviews DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
