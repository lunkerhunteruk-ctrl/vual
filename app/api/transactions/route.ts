import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const orderId = searchParams.get('orderId');
  const status = searchParams.get('status');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 20;

  if (!isSupabaseConfigured()) {
    if (id) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ transactions: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Fetch single transaction by ID
    if (id) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple transactions
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ transactions: data || [] });
  } catch (error: any) {
    console.error('Transactions API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
