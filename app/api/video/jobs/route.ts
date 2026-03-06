import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

/**
 * POST /api/video/jobs — Create a new video generation job
 * Body: {
 *   bundleId: string,
 *   lookIds: string[],
 *   videoModel: 'veo' | 'kling',
 *   totalDurationSec: number,
 *   requestData: { motionPreset, bgmId, showIntro, showEnding, whiteFlash, textFont }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { bundleId, lookIds, videoModel, totalDurationSec, requestData } = body;

    if (!lookIds || lookIds.length === 0) {
      return NextResponse.json({ error: 'lookIds are required' }, { status: 400 });
    }

    // Define steps for progress tracking
    const steps = [
      { id: 'clip-generation', label: 'Generate video clips', labelJa: 'クリップ生成', status: 'pending' },
      { id: 'edit-prep', label: 'Prepare edit timeline', labelJa: '編集準備', status: 'pending' },
      { id: 'rendering', label: 'Render final video', labelJa: '動画レンダリング', status: 'pending' },
      { id: 'complete', label: 'Complete', labelJa: '完成', status: 'pending' },
    ];

    const { data: job, error } = await supabase
      .from('video_jobs')
      .insert({
        store_id: storeId,
        bundle_id: bundleId || null,
        status: 'pending',
        video_model: videoModel || 'veo',
        total_duration_sec: totalDurationSec || 26,
        steps,
        look_ids: lookIds,
        request_data: requestData || {},
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    console.error('[Video Jobs] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/video/jobs — List video jobs for the store
 * Query: ?status=processing (optional filter)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let query = supabase
      .from('video_jobs')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, jobs: jobs || [] });
  } catch (error: any) {
    console.error('[Video Jobs] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/video/jobs — Update job status (used by pipeline orchestrator)
 * Body: { id, status?, current_step?, current_step_label?, steps?, clip_urls?, error_message?, final_video_url? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const allowedFields = [
      'status', 'current_step', 'current_step_label', 'steps',
      'clip_urls', 'error_message', 'final_video_url', 'completed_at',
    ];

    const safeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }

    if (safeUpdates.status === 'completed') {
      safeUpdates.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('video_jobs')
      .update(safeUpdates)
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Video Jobs] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
