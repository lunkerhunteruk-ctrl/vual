import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';
import { canManageStore, getRequestUser, requireStoreOwner } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');
  const customerId = searchParams.get('customerId');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 20;

  if (!isSupabaseConfigured()) {
    // Return empty data if Supabase not configured
    if (id) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ orders: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // 注文はログイン必須。見られるのは「そのショップのオーナー」か「注文したお客さん本人」だけ
    const user = await getRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    const verifiedEmail = user.email_verified ? user.email?.toLowerCase() : undefined;

    // Fetch single order by ID
    if (id) {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      const isCustomer = !!verifiedEmail && data?.customer_email?.toLowerCase() === verifiedEmail;
      if (!isCustomer && !(await canManageStore(user, data.store_id))) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const isOwner = await canManageStore(user, storeId);

    // Fetch multiple orders
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (isOwner) {
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const customerEmail = searchParams.get('customerEmail');
      if (customerEmail) {
        query = query.eq('customer_email', customerEmail);
      }
    } else {
      // お客さんは自分の注文だけ。指定されたメール/IDは使わず、ログイン中のメールで絞る
      if (!verifiedEmail) {
        return NextResponse.json({ orders: [] });
      }
      // 大文字小文字だけ無視して完全一致（_ や % をワイルドカード扱いさせない）
      query = query.ilike('customer_email', verifiedEmail.replace(/[\\%_]/g, '\\$&'));
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    console.error('Orders API error:', error);
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
    const { id, status, ...updates } = body;
    delete updates.store_id; // 別ショップへ付け替えさせない

    if (!id) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 });
    }

    const updateData: any = { ...updates };
    if (status) {
      updateData.status = status;
      // Add timestamps for status changes
      if (status === 'shipped') updateData.shipped_at = new Date().toISOString();
      if (status === 'delivered') updateData.delivered_at = new Date().toISOString();
      if (status === 'cancelled') updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', owner.storeId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Orders PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
