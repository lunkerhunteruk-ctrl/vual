import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Fetch credit transaction history
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const consumerId = searchParams.get('consumerId');
    const lineUserId = searchParams.get('lineUserId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // B2B: Store transactions
    if (storeId) {
      const { data: transactions, error, count } = await supabase
        .from('store_credit_transactions')
        .select('*', { count: 'exact' })
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        type: 'store',
        transactions: transactions || [],
        total: count || 0,
        limit,
        offset,
      });
    }

    // B2C: Consumer transactions
    if (consumerId || lineUserId) {
      // First resolve consumer_credit_id
      let query = supabase.from('consumer_credits').select('id');
      if (consumerId) {
        query = query.eq('customer_id', consumerId);
      } else {
        query = query.eq('line_user_id', lineUserId!);
      }

      const { data: cc } = await query.single();
      if (!cc) {
        return NextResponse.json({ success: true, type: 'consumer', transactions: [], total: 0, limit, offset });
      }

      const { data: transactions, error, count } = await supabase
        .from('consumer_credit_transactions')
        .select('*', { count: 'exact' })
        .eq('consumer_credit_id', cc.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        type: 'consumer',
        transactions: transactions || [],
        total: count || 0,
        limit,
        offset,
      });
    }

    return NextResponse.json({ error: 'storeId, consumerId, or lineUserId is required' }, { status: 400 });
  } catch (error) {
    console.error('Billing transactions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
