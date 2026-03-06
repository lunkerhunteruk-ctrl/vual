'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  Video,
  Play,
  Loader2,
  Download,
  RefreshCw,
  Link2,
  Film,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useCollection, CollectionLook, CollectionBundle } from '@/lib/hooks/useCollection';
import { useVideoJobStore } from '@/lib/store/video-job-store';
import { useVideoSettingsStore } from '@/lib/store/video-settings-store';
import { useStoreContext } from '@/lib/store/store-context';
import { VideoSettingsPanel } from '@/components/admin/video/VideoSettingsPanel';
import { Button } from '@/components/ui';
import { runPipeline, type PipelineProgress } from '@/lib/video/pipeline';

export default function VideoPage() {
  const locale = useLocale();
  const ja = locale === 'ja';
  const store = useStoreContext((s) => s.store);
  const storeId = store?.id;
  const { looks, items, isLoading } = useCollection();
  const videoSettings = useVideoSettingsStore();
  const { activeJobs, setJob, updateJobStatus } = useVideoJobStore();

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const renderPollRef = useRef<NodeJS.Timeout | null>(null);

  // Extract bundles only
  const bundles = useMemo(() => {
    return items
      .filter((item): item is { type: 'bundle'; bundle: CollectionBundle } => item.type === 'bundle')
      .map((item) => item.bundle);
  }, [items]);

  // Auto-select first bundle
  useEffect(() => {
    if (!selectedBundleId && bundles.length > 0) {
      setSelectedBundleId(bundles[0].id);
    }
  }, [bundles, selectedBundleId]);

  const selectedBundle = bundles.find((b) => b.id === selectedBundleId) || null;
  const activeJob = storeId ? activeJobs[storeId] : null;

  // Clip generation progress
  const clipCount = selectedBundle?.looks.length || 0;
  const clipsWithVideo = selectedBundle?.looks.filter((l) => l.video_clip_url).length || 0;
  const [retryingClipIdx, setRetryingClipIdx] = useState<number | null>(null);

  const handleStartGeneration = async () => {
    if (!selectedBundle || !storeId) return;

    setIsGenerating(true);

    try {
      // Create job in DB
      const jobRes = await fetch('/api/video/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleId: selectedBundle.id,
          lookIds: selectedBundle.looks.map((l) => l.id),
          videoModel: videoSettings.videoModel,
          totalDurationSec: videoSettings.totalDurationSec,
          requestData: videoSettings.getSettings(),
        }),
      });

      const jobData = await jobRes.json();
      if (!jobData.success) throw new Error(jobData.error);

      const job = jobData.job;

      // Track in Zustand
      setJob(storeId, {
        id: job.id,
        storeId,
        bundleId: selectedBundle.id,
        status: 'processing',
        videoModel: videoSettings.videoModel,
        totalDurationSec: videoSettings.totalDurationSec,
        currentStep: 'clip-generation',
        currentStepLabel: ja ? 'クリップ生成中' : 'Generating clips',
        steps: job.steps || [],
        clipUrls: [],
        finalVideoUrl: null,
        errorMessage: null,
        createdAt: job.created_at,
      });

      // Build video prompts from bundle looks
      const videoPrompts = selectedBundle.looks.map((look) => ({
        lookId: look.id,
        prompt: look.video_prompt_veo || 'Camera slowly follows the model walking with confidence and elegance.',
      }));

      // Run pipeline
      const result = await runPipeline(
        {
          jobId: job.id,
          bundleId: selectedBundle.id,
          lookIds: selectedBundle.looks.map((l) => l.id),
          videoPrompts,
          totalDurationSec: videoSettings.totalDurationSec,
          videoModel: videoSettings.videoModel,
          requestData: videoSettings.getSettings(),
        },
        (progress) => {
          setPipelineProgress(progress);
          if (storeId) {
            updateJobStatus(storeId, {
              currentStep: progress.step,
              currentStepLabel: progress.stepLabel,
            });
          }
        }
      );

      // Update job status
      await fetch('/api/video/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: job.id,
          status: result.success ? 'completed' : 'failed',
          clip_urls: result.clipUrls,
          error_message: result.error || null,
        }),
      });

      if (storeId) {
        updateJobStatus(storeId, {
          status: result.success ? 'completed' : 'failed',
          clipUrls: result.clipUrls,
          errorMessage: result.error || null,
        });
      }
    } catch (err: any) {
      console.error('Pipeline error:', err);
      if (storeId) {
        updateJobStatus(storeId, {
          status: 'failed',
          errorMessage: err.message,
        });
      }
    } finally {
      setIsGenerating(false);
      setPipelineProgress(null);
    }
  };

  // Retry a single failed clip
  const handleRetryClip = async (look: CollectionLook, idx: number) => {
    if (!selectedBundle || retryingClipIdx !== null) return;

    setRetryingClipIdx(idx);
    try {
      const prompt = look.video_prompt_veo || 'Camera slowly follows the model walking with confidence and elegance.';
      const duration = videoSettings.totalDurationSec
        ? Math.min(8, Math.max(4, Math.round(videoSettings.totalDurationSec / clipCount)))
        : 4;
      // Snap to valid Veo duration
      const veoDuration = duration <= 5 ? 4 : duration <= 7 ? 6 : 8;

      const res = await fetch('/api/video/generate-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookId: look.id,
          jobId: activeJob?.id,
          prompt,
          durationSeconds: veoDuration,
          aspectRatio: '16:9',
        }),
      });

      const data = await res.json();
      if (data.success && data.clipUrl) {
        // Force refresh collection data
        window.location.reload();
      } else {
        const isFilter = data.error?.includes('filter') || data.error?.includes('violated');
        const msg = isFilter
          ? (ja ? 'この画像はコンテンツフィルターによりブロックされました。スタジオで画像を再生成してからお試しください。' : 'This image was blocked by the content filter. Please regenerate the image in studio and try again.')
          : (ja ? `クリップ生成失敗: ${data.error}` : `Clip generation failed: ${data.error}`);
        alert(msg);
      }
    } catch (err: any) {
      console.error('[RetryClip] Error:', err);
      alert(ja ? `エラー: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setRetryingClipIdx(null);
    }
  };

  // Cleanup render polling on unmount
  useEffect(() => {
    return () => {
      if (renderPollRef.current) clearInterval(renderPollRef.current);
    };
  }, []);

  const handleStartRender = useCallback(async () => {
    if (!selectedBundle || !storeId || !activeJob) return;

    const clipUrls = activeJob.clipUrls;
    if (!clipUrls || clipUrls.length === 0) return;

    setIsRendering(true);
    setRenderProgress(0);
    setFinalVideoUrl(null);

    try {
      // Build render request
      const settings = videoSettings.getSettings();
      const shots = selectedBundle.looks.map((look, i) => ({
        clipUrl: clipUrls[i] || '',
        durationSec: look.shot_duration_sec || 6,
        telopText: look.telop_caption_en || undefined,
        telopPosition: 'bottom-left' as const,
      }));

      const res = await fetch('/api/video/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: activeJob.id,
          shots,
          textStyle: settings.motionPreset,
          textFont: settings.textFont,
          bgmUrl: settings.bgmId ? undefined : undefined, // TODO: resolve BGM URL from bgmId
          showIntro: settings.showIntro,
          showEnding: settings.showEnding,
          whiteFlash: settings.whiteFlash,
          brandName: store?.name || 'VUAL',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const { renderId, bucketName } = data;

      // Update Zustand
      updateJobStatus(storeId, {
        currentStep: 'rendering',
        currentStepLabel: ja ? 'レンダリング中' : 'Rendering',
      });

      // Poll for render progress
      renderPollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(
            `/api/video/render?renderId=${renderId}&bucketName=${bucketName}&jobId=${activeJob.id}`
          );
          const pollData = await pollRes.json();

          if (pollData.done) {
            if (renderPollRef.current) clearInterval(renderPollRef.current);
            setIsRendering(false);

            if (pollData.outputUrl) {
              setFinalVideoUrl(pollData.outputUrl);
              setRenderProgress(100);
              updateJobStatus(storeId, {
                status: 'completed',
                currentStep: 'complete',
                currentStepLabel: ja ? '完了' : 'Complete',
              });
            } else {
              updateJobStatus(storeId, {
                status: 'failed',
                errorMessage: pollData.errors?.join('; ') || 'Render failed',
              });
            }
          } else {
            setRenderProgress(pollData.progress || 0);
          }
        } catch (err) {
          console.error('Render poll error:', err);
        }
      }, 5000);
    } catch (err: any) {
      console.error('Render error:', err);
      setIsRendering(false);
      updateJobStatus(storeId, {
        status: 'failed',
        errorMessage: err.message,
      });
    }
  }, [selectedBundle, storeId, activeJob, videoSettings, store, ja, updateJobStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[var(--color-text-label)]" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[calc(100vh-140px)]">
      {/* Left: Bundle list */}
      <div className="w-64 flex-shrink-0">
        <h3 className="text-xs font-semibold text-[var(--color-text-label)] uppercase tracking-wider mb-3">
          {ja ? 'バンドル' : 'Bundles'}
        </h3>
        {bundles.length === 0 ? (
          <div className="text-sm text-[var(--color-text-placeholder)] py-8 text-center">
            <Film size={32} className="mx-auto mb-2 opacity-30" />
            <p>{ja ? 'バンドルがありません' : 'No bundles yet'}</p>
            <p className="text-xs mt-1">
              {ja ? 'コレクションでルックをバンドルしてください' : 'Bundle looks in Collection first'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {bundles.map((bundle) => {
              const isSelected = selectedBundleId === bundle.id;
              const hasClips = bundle.looks.some((l) => l.video_clip_url);
              return (
                <button
                  key={bundle.id}
                  onClick={() => setSelectedBundleId(bundle.id)}
                  className={`
                    w-full text-left p-3 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
                      : 'border-[var(--color-line)] hover:border-[var(--color-accent)]/30'
                    }
                  `}
                >
                  {/* Thumbnail strip */}
                  <div className="flex gap-1 mb-2">
                    {bundle.looks.slice(0, 4).map((look) => (
                      <div
                        key={look.id}
                        className="w-12 h-12 rounded-md overflow-hidden bg-[var(--color-bg-element)] flex-shrink-0 flex items-center justify-center"
                      >
                        <img src={look.image_url} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                    ))}
                    {bundle.looks.length > 4 && (
                      <div className="w-12 h-12 rounded-md bg-[var(--color-bg-element)] flex items-center justify-center text-xs text-[var(--color-text-placeholder)]">
                        +{bundle.looks.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link2 size={10} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-medium text-[var(--color-title-active)]">
                      {bundle.looks.length} {ja ? 'ルック' : 'looks'}
                    </span>
                    {hasClips && <Video size={10} className="text-emerald-500" />}
                  </div>
                  {bundle.looks[0]?.title && (
                    <p className="text-[10px] text-[var(--color-text-placeholder)] truncate mt-0.5">
                      {bundle.looks[0].title}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Center: Preview */}
      <div className="flex-1 min-w-0">
        {selectedBundle ? (
          <div className="space-y-4">
            {/* Bundle preview header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--color-title-active)]">
                {selectedBundle.looks[0]?.title || (ja ? 'バンドル' : 'Bundle')}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-label)]">
                <span>{clipCount} {ja ? 'ショット' : 'shots'}</span>
                {clipsWithVideo > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={12} />
                    {clipsWithVideo}/{clipCount} {ja ? 'クリップ' : 'clips'}
                  </span>
                )}
              </div>
            </div>

            {/* Shot grid */}
            <div className="grid grid-cols-3 gap-3">
              {selectedBundle.looks.map((look, idx) => (
                <div
                  key={look.id}
                  className="rounded-xl overflow-hidden border border-[var(--color-line)] bg-white"
                >
                  <div className="aspect-[3/4] bg-[var(--color-bg-element)] flex items-center justify-center relative">
                    <img src={look.image_url} alt="" className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                      {idx + 1}
                    </div>
                    {look.video_clip_url ? (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1 rounded-md">
                        <Video size={10} />
                      </div>
                    ) : !isGenerating && clipsWithVideo > 0 && retryingClipIdx !== idx ? (
                      <button
                        onClick={() => handleRetryClip(look, idx)}
                        disabled={retryingClipIdx !== null}
                        className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity disabled:opacity-0"
                      >
                        <RefreshCw size={20} className="text-white" />
                        <span className="text-white text-[10px] font-medium">{ja ? '再生成' : 'Retry'}</span>
                      </button>
                    ) : retryingClipIdx === idx ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    ) : null}
                    {/* Pipeline progress overlay */}
                    {pipelineProgress && pipelineProgress.clipProgress[idx] && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {pipelineProgress.clipProgress[idx].status === 'generating' && (
                          <Loader2 size={24} className="text-white animate-spin" />
                        )}
                        {pipelineProgress.clipProgress[idx].status === 'done' && (
                          <CheckCircle2 size={24} className="text-emerald-400" />
                        )}
                        {pipelineProgress.clipProgress[idx].status === 'failed' && (
                          <AlertCircle size={24} className="text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-[11px] font-medium text-[var(--color-title-active)] truncate">
                      {look.title || `Shot ${idx + 1}`}
                    </p>
                    {look.telop_caption_en && (
                      <p className="text-[10px] text-[var(--color-text-placeholder)] truncate italic">
                        {look.telop_caption_en}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-[var(--color-text-label)]">
                        {look.shot_duration_sec || 6}s
                      </span>
                      {look.video_clip_url && (
                        <a
                          href={look.video_clip_url}
                          download
                          className="text-[9px] text-[var(--color-accent)] hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={8} />
                          clip
                        </a>
                      )}
                      {!look.video_clip_url && !isGenerating && clipsWithVideo > 0 && (
                        <button
                          onClick={() => handleRetryClip(look, idx)}
                          disabled={retryingClipIdx !== null}
                          className="text-[9px] text-red-500 hover:text-red-700 flex items-center gap-0.5 disabled:opacity-40"
                        >
                          {retryingClipIdx === idx ? (
                            <Loader2 size={8} className="animate-spin" />
                          ) : (
                            <RefreshCw size={8} />
                          )}
                          {ja ? '再生成' : 'retry'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {pipelineProgress && (
              <div className="bg-white rounded-xl border border-[var(--color-line)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="text-[var(--color-accent)] animate-spin" />
                  <span className="text-sm font-medium text-[var(--color-title-active)]">
                    {pipelineProgress.stepLabel}
                  </span>
                </div>
                <div className="h-2 bg-[var(--color-bg-element)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                    style={{ width: `${pipelineProgress.overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                leftIcon={isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                disabled={isGenerating || !selectedBundle}
                onClick={handleStartGeneration}
                className="!px-8"
              >
                {isGenerating
                  ? (ja ? 'クリップ生成中...' : 'Generating...')
                  : clipsWithVideo > 0
                    ? (ja ? '再生成' : 'Regenerate')
                    : (ja ? 'クリップを生成' : 'Generate Clips')}
              </Button>
              {clipsWithVideo === clipCount && clipCount > 0 && (
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={isRendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
                  disabled={isRendering || isGenerating}
                  onClick={handleStartRender}
                  className="!px-6"
                >
                  {isRendering
                    ? (ja ? `レンダリング中 ${renderProgress}%` : `Rendering ${renderProgress}%`)
                    : finalVideoUrl
                      ? (ja ? '再レンダリング' : 'Re-render')
                      : (ja ? 'レンダリング' : 'Render Video')}
                </Button>
              )}
            </div>

            {/* Render progress */}
            {isRendering && (
              <div className="bg-white rounded-xl border border-[var(--color-line)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Loader2 size={14} className="text-purple-500 animate-spin" />
                  <span className="text-sm font-medium text-[var(--color-title-active)]">
                    {ja ? `レンダリング中... ${renderProgress}%` : `Rendering... ${renderProgress}%`}
                  </span>
                </div>
                <div className="h-2 bg-[var(--color-bg-element)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Final video download */}
            {finalVideoUrl && !isRendering && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">
                      {ja ? '動画が完成しました' : 'Video is ready'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={finalVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <Download size={14} />
                      {ja ? 'ダウンロード' : 'Download'}
                    </a>
                    <a
                      href={finalVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 border border-emerald-300 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      <ExternalLink size={12} />
                      {ja ? 'プレビュー' : 'Preview'}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Active job error */}
            {activeJob?.status === 'failed' && activeJob.errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{activeJob.errorMessage}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Video size={48} className="text-[var(--color-text-placeholder)]/30 mb-3" />
            <p className="text-sm text-[var(--color-text-placeholder)]">
              {ja ? 'バンドルを選択してください' : 'Select a bundle'}
            </p>
          </div>
        )}
      </div>

      {/* Right: Settings panel */}
      <div className="w-56 flex-shrink-0 border-l border-[var(--color-line)] pl-5">
        <VideoSettingsPanel shotCount={clipCount || 6} locale={locale} />
      </div>
    </div>
  );
}
