import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST: Add request to batch queue
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { storeId, payload } = body;

    if (!storeId || !payload) {
      return NextResponse.json({ error: 'storeId and payload required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('batch_queue')
      .insert({
        store_id: storeId,
        status: 'queued',
        payload,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[BatchQueue] Insert error:', error);
      return NextResponse.json({ error: 'Failed to add to queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('[BatchQueue] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: List queue items
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status'); // optional filter

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    }

    const query = supabase
      .from('batch_queue')
      .select('id, status, created_at, completed_at, result_image_url, error, payload->modelSettings->ethnicity, payload->background, payload->customPrompt, payload->artistic, payload->sceneVariant, payload->detailMode')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (status) {
      query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[BatchQueue] Fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    return NextResponse.json({ success: true, items: data || [] });
  } catch (error) {
    console.error('[BatchQueue] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Clear completed/failed items or specific item
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const id = searchParams.get('id');

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 });
    }

    if (id) {
      // Delete specific item
      await supabase.from('batch_queue').delete().eq('id', id).eq('store_id', storeId);
    } else {
      // Clear all queued items
      await supabase.from('batch_queue').delete().eq('store_id', storeId).eq('status', 'queued');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BatchQueue] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
