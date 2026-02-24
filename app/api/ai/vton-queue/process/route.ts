import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateVTON, type VTONRequest } from '@/lib/ai/vertex-vton';
import { applyVualPlate, base64ToBuffer, bufferToBase64DataUrl } from '@/lib/ai/vual-plate';
import type { VTONQueueRequestData, VTONQueueResultData, VTONQueueResultItem } from '../route';

// Configuration
const MAX_RETRIES = 5;
const DELAY_BETWEEN_GARMENTS_MS = 5000; // 5 seconds between API calls
const BASE_RETRY_DELAY_MS = 10000; // 10 seconds base delay for retries

// Calculate exponential backoff delay
function calculateRetryDelay(retryCount: number): number {
  // Exponential backoff: 10s, 20s, 40s, 80s, 160s
  return BASE_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

// Helper to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Check if error is a rate limit error (429)
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('429') ||
           message.includes('rate limit') ||
           message.includes('quota exceeded') ||
           message.includes('too many requests') ||
           message.includes('resource exhausted');
  }
  return false;
}

// POST: Process the next item in the queue (worker endpoint)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Optional: Verify worker secret for security
    const body = await request.json().catch(() => ({}));
    const workerSecret = body.workerSecret;

    // In production, you should validate the worker secret
    if (process.env.VTON_WORKER_SECRET && workerSecret !== process.env.VTON_WORKER_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Reset any stuck processing items (processing for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    await supabase
      .from('vton_queue')
      .update({
        status: 'pending',
        error_message: 'Reset: processing timed out',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('updated_at', fiveMinutesAgo);

    // Check if there's already an item being processed (not stuck)
    const { count: processingCount } = await supabase
      .from('vton_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing');

    if (processingCount && processingCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Another item is already being processed',
        processed: false,
      });
    }

    // Get the first pending item by position (strict FIFO)
    const { data: firstPendingItem, error: fetchError } = await supabase
      .from('vton_queue')
      .select('*')
      .eq('status', 'pending')
      .order('queue_position', { ascending: true })
      .limit(1)
      .single();

    if (fetchError || !firstPendingItem) {
      return NextResponse.json({
        success: true,
        message: 'No pending items in queue',
        processed: false,
      });
    }

    // If the first item has a future retry time, don't process anything (strict FIFO)
    if (firstPendingItem.next_retry_at && new Date(firstPendingItem.next_retry_at) > new Date()) {
      const waitTime = new Date(firstPendingItem.next_retry_at).getTime() - Date.now();
      return NextResponse.json({
        success: true,
        message: `First item waiting for retry in ${Math.ceil(waitTime / 1000)}s`,
        processed: false,
        retryScheduled: true,
        nextRetryAt: firstPendingItem.next_retry_at,
      });
    }

    const queueItem = firstPendingItem;

    // Mark item as processing (atomic update - only if still pending)
    const { data: updatedItem, error: updateError } = await supabase
      .from('vton_queue')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', queueItem.id)
      .eq('status', 'pending')  // Only update if still pending
      .select()
      .single();

    if (updateError || !updatedItem) {
      // Another worker already claimed this item
      console.log('Item already claimed by another worker, skipping...');
      return NextResponse.json({
        success: true,
        message: 'Item already being processed',
        processed: false,
      });
    }

    // Process the VTON request
    const requestData = queueItem.request_data as VTONQueueRequestData;
    const results: VTONQueueResultItem[] = [];
    let totalProcessingTime = 0;
    let lastError: Error | null = null;
    let currentPersonImage = requestData.personImage;

    try {
      // Process each garment sequentially
      for (let i = 0; i < requestData.garmentImages.length; i++) {
        const garmentImage = requestData.garmentImages[i];
        const category = requestData.categories[i];

        // Add delay between garments (except for the first one)
        if (i > 0) {
          console.log(`Waiting ${DELAY_BETWEEN_GARMENTS_MS}ms before processing garment ${i + 1}...`);
          await delay(DELAY_BETWEEN_GARMENTS_MS);
        }

        console.log(`Processing garment ${i + 1}/${requestData.garmentImages.length} (${category})...`);

        // Determine mode: first garment is standard, subsequent ones add to existing
        const mode = i === 0 ? requestData.mode || 'standard' : 'add_item';

        const vtonRequest: VTONRequest = {
          personImage: currentPersonImage,
          garmentImage: garmentImage,
          category: category,
          mode: mode,
        };

        const startTime = Date.now();
        const result = await generateVTON(vtonRequest);
        const processingTime = Date.now() - startTime;

        results.push({
          resultImage: result.resultImage,
          category: category,
          processingTime: processingTime,
          confidence: result.confidence,
        });

        totalProcessingTime += processingTime;

        // Use the result image as the person image for the next garment
        // This builds up the outfit progressively
        currentPersonImage = result.resultImage;
      }

      // All garments processed successfully
      const resultData: VTONQueueResultData = {
        results: results,
        totalProcessingTime: totalProcessingTime,
      };

      // Save final result image to Supabase Storage
      let savedImageUrl: string | null = null;
      try {
        const finalResultImage = results[results.length - 1].resultImage;

        // Convert base64 to buffer
        let imageBuffer = base64ToBuffer(finalResultImage);

        // Apply VUAL Plate (polaroid frame + branding)
        try {
          let shopName = 'VUAL';
          let itemName = 'Virtual Try-On';

          // Fetch shop and product names if available
          if (queueItem.store_id) {
            const { data: store } = await supabase
              .from('stores')
              .select('name')
              .eq('id', queueItem.store_id)
              .single();
            if (store?.name) shopName = store.name;
          }
          if (queueItem.product_id) {
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', queueItem.product_id)
              .single();
            if (product?.name) itemName = product.name;
          }

          imageBuffer = await applyVualPlate({ imageBuffer, shopName, itemName });

          // Update the result image in results array with the plated version
          results[results.length - 1].resultImage = bufferToBase64DataUrl(imageBuffer);

          console.log('VUAL Plate applied:', { shopName, itemName });
        } catch (plateError) {
          console.error('VUAL Plate error (continuing without frame):', plateError);
        }

        // Generate unique filename
        const filename = `vton-${queueItem.id}-${Date.now()}.png`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vton-results')
          .upload(filename, imageBuffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (!uploadError && uploadData) {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('vton-results')
            .getPublicUrl(filename);

          savedImageUrl = urlData.publicUrl;

          // Save to vton_results table
          await supabase
            .from('vton_results')
            .insert({
              user_id: queueItem.user_id,
              image_url: savedImageUrl,
              garment_count: results.length,
            });

          console.log('Saved VTON result to storage:', savedImageUrl);
        } else {
          console.error('Failed to upload to storage:', uploadError);
        }
      } catch (storageError) {
        console.error('Storage save error:', storageError);
        // Continue even if storage save fails - the result is still in queue
      }

      // Update queue item as completed (include saved URL)
      await supabase
        .from('vton_queue')
        .update({
          status: 'completed',
          result_data: { ...resultData, savedImageUrl },
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);

      // Recalculate queue positions
      await supabase.rpc('recalculate_vton_queue_positions');

      return NextResponse.json({
        success: true,
        processed: true,
        queueId: queueItem.id,
        results: results.length,
        totalProcessingTime: totalProcessingTime,
        savedImageUrl: savedImageUrl,
        message: 'VTON processing completed successfully',
      });

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error('VTON processing error:', lastError);

      // Check if this is a rate limit error
      const isRateLimit = isRateLimitError(error);
      const currentRetryCount = queueItem.retry_count || 0;

      if (isRateLimit && currentRetryCount < MAX_RETRIES) {
        // Schedule retry with exponential backoff
        const retryDelay = calculateRetryDelay(currentRetryCount);
        const nextRetryAt = new Date(Date.now() + retryDelay);

        await supabase
          .from('vton_queue')
          .update({
            status: 'pending', // Reset to pending for retry
            retry_count: currentRetryCount + 1,
            next_retry_at: nextRetryAt.toISOString(),
            error_message: `Rate limited, retry ${currentRetryCount + 1}/${MAX_RETRIES} scheduled at ${nextRetryAt.toISOString()}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', queueItem.id);

        return NextResponse.json({
          success: false,
          processed: false,
          queueId: queueItem.id,
          error: 'Rate limited',
          retryScheduled: true,
          retryCount: currentRetryCount + 1,
          nextRetryAt: nextRetryAt.toISOString(),
          message: `Rate limited, retry scheduled in ${retryDelay / 1000} seconds`,
        });
      }

      // Either not a rate limit error, or max retries exceeded
      const errorMessage = currentRetryCount >= MAX_RETRIES
        ? `Max retries (${MAX_RETRIES}) exceeded. Last error: ${lastError.message}`
        : lastError.message;

      // Partial results if some garments succeeded
      const partialResultData: VTONQueueResultData | null = results.length > 0
        ? {
            results: results,
            totalProcessingTime: totalProcessingTime,
          }
        : null;

      await supabase
        .from('vton_queue')
        .update({
          status: 'failed',
          result_data: partialResultData,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItem.id);

      // Recalculate queue positions
      await supabase.rpc('recalculate_vton_queue_positions');

      return NextResponse.json({
        success: false,
        processed: true,
        queueId: queueItem.id,
        error: errorMessage,
        partialResults: results.length,
        message: 'VTON processing failed',
      });
    }
  } catch (error) {
    console.error('VTON Queue Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get processing status and queue statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get queue statistics
    const { data: stats, error: statsError } = await supabase
      .from('vton_queue')
      .select('status')
      .in('status', ['pending', 'processing', 'completed', 'failed']);

    if (statsError) {
      return NextResponse.json(
        { error: 'Failed to fetch queue statistics' },
        { status: 500 }
      );
    }

    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const item of stats || []) {
      const status = item.status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      }
    }

    // Get items scheduled for retry
    const { count: retryCount } = await supabase
      .from('vton_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .not('next_retry_at', 'is', null);

    // Get next item to be processed
    const { data: nextItem } = await supabase
      .from('vton_queue')
      .select('id, queue_position, retry_count, next_retry_at, created_at')
      .eq('status', 'pending')
      .order('queue_position', { ascending: true })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      stats: {
        ...statusCounts,
        scheduledRetries: retryCount || 0,
        total: (stats || []).length,
      },
      nextItem: nextItem ? {
        id: nextItem.id,
        position: nextItem.queue_position,
        retryCount: nextItem.retry_count,
        nextRetryAt: nextItem.next_retry_at,
        createdAt: nextItem.created_at,
      } : null,
    });
  } catch (error) {
    console.error('VTON Queue Process GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
