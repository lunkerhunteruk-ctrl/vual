import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { requireStoreOwner } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const code = searchParams.get('code');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 20;

  if (!isSupabaseConfigured()) {
    if (id || code) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ coupons: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  // クーポン一覧・詳細は管理画面専用（お客さんのコード確認は /api/coupons/validate）
  const owner = await requireStoreOwner(request);
  if (owner instanceof Response) return owner;

  try {
    // Fetch single coupon by ID
    if (id) {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('id', id)
        .eq('store_id', owner.storeId)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch by code
    if (code) {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', owner.storeId)
        .eq('code', code)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple coupons
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', owner.storeId)
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (error) throw error;
    return NextResponse.json({ coupons: data || [] });
  } catch (error: any) {
    console.error('Coupons API error:', error);
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

  const owner = await requireStoreOwner(request);
  if (owner instanceof Response) return owner;

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...body,
        store_id: owner.storeId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Coupons POST error:', error);
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
      return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .eq('store_id', owner.storeId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Coupons PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Coupon ID required' }, { status: 400 });
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
      .from('coupons')
      .delete()
      .eq('id', id)
      .eq('store_id', owner.storeId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Coupons DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
