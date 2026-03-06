/**
 * Video Generation Pipeline Orchestrator
 *
 * Client-side orchestrator that coordinates the multi-step video generation:
 * 1. Submit clip generation requests (parallel, max 3 concurrent)
 * 2. Poll for clip completion
 * 3. Update job progress in DB
 *
 * Note: Remotion rendering (Phase 3) will be added later.
 */

import { distributeVideoDuration } from '@/lib/utils/video-duration';

export interface PipelineConfig {
  jobId: string;
  bundleId: string;
  lookIds: string[];
  videoPrompts: { lookId: string; prompt: string }[];
  totalDurationSec: number;
  videoModel: 'veo' | 'kling';
  requestData: {
    motionPreset: string;
    bgmId: string | null;
    showIntro: boolean;
    showEnding: boolean;
    whiteFlash: boolean;
    textFont: string;
  };
}

export interface PipelineProgress {
  step: string;
  stepLabel: string;
  clipProgress: { lookId: string; status: 'pending' | 'generating' | 'done' | 'failed'; clipUrl?: string }[];
  overallProgress: number;
}

type ProgressCallback = (progress: PipelineProgress) => void;

/**
 * Update job status in the database.
 */
async function updateJobStatus(
  jobId: string,
  updates: {
    status?: string;
    current_step?: string;
    current_step_label?: string;
    steps?: any[];
    clip_urls?: string[];
    error_message?: string;
  }
) {
  try {
    await fetch(`/api/video/jobs`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: jobId, ...updates }),
    });
  } catch (err) {
    console.error('[Pipeline] Failed to update job status:', err);
  }
}

/**
 * Run the video generation pipeline.
 *
 * This is designed to run client-side (browser) to avoid Vercel timeouts.
 * Each clip generation is a separate API call that handles its own Veo polling.
 */
export async function runPipeline(
  config: PipelineConfig,
  onProgress?: ProgressCallback
): Promise<{ success: boolean; clipUrls: string[]; error?: string }> {
  const { jobId, lookIds, videoPrompts, totalDurationSec, videoModel } = config;

  // Calculate duration per clip
  const durations = distributeVideoDuration(lookIds.length, totalDurationSec);

  // Initialize clip progress
  const clipProgress: { lookId: string; status: 'pending' | 'generating' | 'done' | 'failed'; clipUrl?: string }[] = lookIds.map((lookId) => ({
    lookId,
    status: 'pending' as const,
    clipUrl: undefined,
  }));

  // Step definitions for progress tracking
  const stepDefs = [
    { id: 'clip-generation', label: 'Generate video clips', labelJa: 'クリップ生成' },
    { id: 'edit-prep', label: 'Prepare edit timeline', labelJa: '編集準備' },
    { id: 'rendering', label: 'Render final video', labelJa: '動画レンダリング' },
    { id: 'complete', label: 'Complete', labelJa: '完成' },
  ];

  const buildSteps = (currentStepId: string) => {
    const currentIdx = stepDefs.findIndex(s => s.id === currentStepId);
    return stepDefs.map((s, i) => ({
      ...s,
      status: i < currentIdx ? 'completed' : i === currentIdx ? 'processing' : 'pending',
    }));
  };

  const emitProgress = (step: string, stepLabel: string) => {
    const doneCount = clipProgress.filter((c) => c.status === 'done').length;
    const totalCount = clipProgress.length;
    onProgress?.({
      step,
      stepLabel,
      clipProgress: [...clipProgress],
      overallProgress: Math.round((doneCount / totalCount) * 100),
    });

    // Update steps in DB
    updateJobStatus(jobId, {
      current_step: step,
      current_step_label: stepLabel,
      steps: buildSteps(step),
    });
  };

  // --- Step 1: Generate clips ---
  emitProgress('clip-generation', `Generating clips (0/${lookIds.length})`);

  const clipUrls: string[] = [];

  // Process clips sequentially to avoid Veo rate limits
  for (let i = 0; i < lookIds.length; i++) {
    const lookId = lookIds[i];
    const promptEntry = videoPrompts.find((vp) => vp.lookId === lookId);
    const prompt = promptEntry?.prompt || 'Camera slowly follows the model as they walk with confidence.';
    const duration = durations[i] || 6;

    clipProgress[i].status = 'generating';
    emitProgress('clip-generation', `クリップ ${i + 1}/${lookIds.length} 生成中`);

    try {
      const res = await fetch('/api/video/generate-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookId,
          jobId,
          prompt,
          durationSeconds: duration,
          aspectRatio: '16:9',
        }),
      });

      const data = await res.json();

      if (data.success && data.clipUrl) {
        clipProgress[i].status = 'done';
        clipProgress[i].clipUrl = data.clipUrl;
        clipUrls[i] = data.clipUrl;
      } else {
        clipProgress[i].status = 'failed';
        console.error(`[Pipeline] Clip ${i} failed:`, data.error);
      }
    } catch (err) {
      clipProgress[i].status = 'failed';
      console.error(`[Pipeline] Clip ${i} error:`, err);
    }

    const doneCount = clipProgress.filter((c) => c.status === 'done' || c.status === 'failed').length;
    emitProgress('clip-generation', `クリップ ${doneCount}/${lookIds.length} 完了`);
  }

  const successCount = clipProgress.filter((c) => c.status === 'done').length;

  if (successCount === 0) {
    await updateJobStatus(jobId, {
      status: 'failed',
      error_message: 'All clips failed to generate',
      steps: stepDefs.map((s, i) => ({ ...s, status: i === 0 ? 'failed' : 'pending' })),
    });
    return { success: false, clipUrls: [], error: 'All clips failed to generate' };
  }

  // --- Step 2: Edit preparation (placeholder for Phase 3 Remotion) ---
  emitProgress('edit-prep', 'Preparing edit timeline');

  // For now, just collect successful clip URLs
  const successfulClipUrls = clipUrls.filter(Boolean);

  // TODO Phase 3: Generate Remotion props JSON and trigger Lambda render

  // --- Step 3: Mark complete ---
  const finalSteps = stepDefs.map(s => ({ ...s, status: 'completed' }));
  onProgress?.({
    step: 'complete',
    stepLabel: 'Complete',
    clipProgress: [...clipProgress],
    overallProgress: 100,
  });
  await updateJobStatus(jobId, {
    current_step: 'complete',
    current_step_label: 'Complete',
    steps: finalSteps,
    clip_urls: successfulClipUrls,
    status: successCount < lookIds.length ? 'completed' : 'completed',
  });

  return {
    success: true,
    clipUrls: successfulClipUrls,
    error: successCount < lookIds.length
      ? `${successCount}/${lookIds.length} clips generated successfully`
      : undefined,
  };
}
