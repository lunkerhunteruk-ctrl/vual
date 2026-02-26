import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { checkAndDeductCredit } from '@/lib/billing/credit-check';
import { processNextQueueItem } from './process/route';
import type { VTONQueueRequestData } from './types';

// Re-export types for backward compatibility
export type { VTONQueueRequestData, VTONQueueResultItem, VTONQueueResultData, VTONQueueItem } from './types';

// POST: Add a new item to the queue
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

    // Validate request
    if (!body.personImage) {
      return NextResponse.json(
        { error: 'Person image is required' },
        { status: 400 }
      );
    }

    if (!body.garmentImages || !Array.isArray(body.garmentImages) || body.garmentImages.length === 0) {
      return NextResponse.json(
        { error: 'At least one garment image is required' },
        { status: 400 }
      );
    }

    if (body.garmentImages.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 garment images allowed per request' },
        { status: 400 }
      );
    }

    if (!body.categories || !Array.isArray(body.categories) || body.categories.length !== body.garmentImages.length) {
      return NextResponse.json(
        { error: 'Categories array must match garment images length' },
        { status: 400 }
      );
    }

    // Validate categories
    const validCategories = ['upper_body', 'lower_body', 'dresses', 'footwear'];
    for (const category of body.categories) {
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category: ${category}. Must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Credit check before queue insertion
    const creditResult = await checkAndDeductCredit({
      storeId: body.storeId || undefined,
      productId: body.productId || undefined,
      lineUserId: body.lineUserId || undefined,
      customerId: body.customerId || undefined,
    });

    if (!creditResult.allowed) {
      return NextResponse.json(
        {
          error: creditResult.error,
          errorCode: creditResult.errorCode,
        },
        { status: 402 }
      );
    }

    // Get next queue position
    const { data: positionData, error: positionError } = await supabase
      .rpc('get_next_vton_queue_position');

    if (positionError) {
      console.error('Error getting queue position:', positionError);
      return NextResponse.json(
        { error: 'Failed to get queue position' },
        { status: 500 }
      );
    }

    const position = positionData || 1;

    // Prepare request data
    const requestData: VTONQueueRequestData = {
      personImage: body.personImage,
      garmentImages: body.garmentImages,
      categories: body.categories,
      mode: body.mode || 'standard',
    };

    // Insert into queue (with billing metadata)
    const { data: queueItem, error: insertError } = await supabase
      .from('vton_queue')
      .insert({
        user_id: body.lineUserId || body.customerId || body.userId || null,
        status: 'pending',
        request_data: requestData,
        queue_position: position,
        retry_count: 0,
        store_id: body.storeId || null,
        product_id: body.productId || null,
        credit_source: creditResult.creditSource,
        credit_transaction_id: creditResult.creditTransactionId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting queue item:', insertError);
      return NextResponse.json(
        { error: 'Failed to add to queue' },
        { status: 500 }
      );
    }

    // Count items ahead in queue
    const { count: itemsAhead } = await supabase
      .from('vton_queue')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'processing'])
      .lt('queue_position', position);

    // Process the queue item directly (no self-fetch needed)
    // This runs inline - the client polls for status updates
    console.log('Processing queue item inline:', queueItem.id);
    const processResult = await processNextQueueItem();
    console.log('Queue processing result:', processResult);

    return NextResponse.json({
      success: true,
      queueId: queueItem.id,
      position: position,
      itemsAhead: itemsAhead || 0,
      estimatedWaitTime: ((itemsAhead || 0) + 1) * 30,
      message: 'Added to queue successfully',
      processResult: processResult,
    });
  } catch (error) {
    console.error('VTON Queue POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check status of a queue item
export async function GET(request: NextRequest) {
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
    const userId = searchParams.get('userId');

    // If ID is provided, get specific item
    if (id) {
      const { data: queueItem, error } = await supabase
        .from('vton_queue')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !queueItem) {
        return NextResponse.json(
          { error: 'Queue item not found' },
          { status: 404 }
        );
      }

      // Calculate current position if still pending
      let currentPosition = queueItem.queue_position;
      let itemsAhead = 0;

      if (queueItem.status === 'pending' || queueItem.status === 'processing') {
        const { count } = await supabase
          .from('vton_queue')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'processing'])
          .lt('queue_position', queueItem.queue_position);

        itemsAhead = count || 0;
        currentPosition = itemsAhead + 1;
      }

      return NextResponse.json({
        success: true,
        item: {
          id: queueItem.id,
          status: queueItem.status,
          position: currentPosition,
          itemsAhead: itemsAhead,
          resultData: queueItem.result_data,
          errorMessage: queueItem.error_message,
          retryCount: queueItem.retry_count,
          createdAt: queueItem.created_at,
          updatedAt: queueItem.updated_at,
          completedAt: queueItem.completed_at,
          estimatedWaitTime: queueItem.status === 'pending' ? (itemsAhead + 1) * 30 : 0,
        },
      });
    }

    // If userId is provided, get all items for that user
    if (userId) {
      const { data: queueItems, error } = await supabase
        .from('vton_queue')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch queue items' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        items: queueItems.map(item => ({
          id: item.id,
          status: item.status,
          position: item.queue_position,
          resultData: item.result_data,
          errorMessage: item.error_message,
          retryCount: item.retry_count,
          createdAt: item.created_at,
          completedAt: item.completed_at,
        })),
      });
    }

    // No ID or userId provided - get queue stats
    const { count: pendingCount } = await supabase
      .from('vton_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: processingCount } = await supabase
      .from('vton_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    return NextResponse.json({
      success: true,
      stats: {
        pending: pendingCount || 0,
        processing: processingCount || 0,
        estimatedWaitTime: ((pendingCount || 0) + (processingCount || 0)) * 30,
      },
    });
  } catch (error) {
    console.error('VTON Queue GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a queue item (only if pending)
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
        { error: 'Queue item ID is required' },
        { status: 400 }
      );
    }

    // Check if item exists and is pending
    const { data: queueItem, error: fetchError } = await supabase
      .from('vton_queue')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    if (queueItem.status !== 'pending') {
      return NextResponse.json(
        { error: 'Can only cancel pending items' },
        { status: 400 }
      );
    }

    // Delete the item
    const { error: deleteError } = await supabase
      .from('vton_queue')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to cancel queue item' },
        { status: 500 }
      );
    }

    // Recalculate positions
    await supabase.rpc('recalculate_vton_queue_positions');

    return NextResponse.json({
      success: true,
      message: 'Queue item cancelled successfully',
    });
  } catch (error) {
    console.error('VTON Queue DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
