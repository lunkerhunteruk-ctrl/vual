'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, CheckCircle2, AlertCircle, Loader2, X, Download, ChevronUp, ChevronDown } from 'lucide-react';
import { useVideoJobStore, type VideoJob } from '@/lib/store/video-job-store';
import { useStoreContext } from '@/lib/store/store-context';

const POLL_INTERVAL = 5000;

const stepLabels: Record<string, { en: string; ja: string }> = {
  'look-generation': { en: 'Generating looks', ja: 'ルック生成中' },
  'copywriting': { en: 'Generating copy', ja: 'コピー生成中' },
  'clip-generation': { en: 'Generating clips', ja: '動画クリップ生成中' },
  'edit-prep': { en: 'Preparing edit', ja: '編集準備中' },
  'rendering': { en: 'Rendering video', ja: '動画レンダリング中' },
  'complete': { en: 'Complete', ja: '完成' },
};

export function VideoProgressTracker({ locale = 'ja' }: { locale?: string }) {
  const store = useStoreContext((s) => s.store);
  const storeId = store?.id;
  const { activeJobs, updateJobStatus, removeJob } = useVideoJobStore();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const activeJob = storeId ? activeJobs[storeId] : null;

  // Poll for job status updates
  useEffect(() => {
    if (!activeJob || !storeId) return;
    if (activeJob.status === 'completed' || activeJob.status === 'failed' || activeJob.status === 'cancelled') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/video/jobs/${activeJob.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.job) {
          updateJobStatus(storeId, {
            status: data.job.status,
            currentStep: data.job.current_step,
            currentStepLabel: data.job.current_step_label,
            steps: data.job.steps || [],
            clipUrls: data.job.clip_urls || [],
            finalVideoUrl: data.job.final_video_url,
            errorMessage: data.job.error_message,
          });
        }
      } catch {
        // Silently ignore poll errors
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status, storeId, updateJobStatus]);

  // Reset dismissed when a new job starts
  useEffect(() => {
    if (activeJob && activeJob.status === 'processing') {
      setDismissed(false);
    }
  }, [activeJob?.id]);

  if (!activeJob || dismissed) return null;

  const ja = locale === 'ja';
  const isComplete = activeJob.status === 'completed';
  const isFailed = activeJob.status === 'failed';
  const isProcessing = activeJob.status === 'processing' || activeJob.status === 'pending';

  // Calculate progress from steps
  const totalSteps = activeJob.steps.length || 6;
  const completedSteps = activeJob.steps.filter((s) => s.status === 'completed').length;
  const progress = isComplete ? 100 : isFailed ? 0 : Math.round((completedSteps / totalSteps) * 100);

  const currentLabel = activeJob.currentStep
    ? (ja
        ? stepLabels[activeJob.currentStep]?.ja || activeJob.currentStepLabel || activeJob.currentStep
        : stepLabels[activeJob.currentStep]?.en || activeJob.currentStepLabel || activeJob.currentStep)
    : (ja ? '準備中...' : 'Preparing...');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-4 right-4 z-50 w-80"
      >
        <div className="bg-white rounded-2xl border border-[var(--color-line)] shadow-xl overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[var(--color-bg-element)]/50 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            <div className="flex items-center gap-2">
              {isProcessing && <Loader2 size={16} className="text-[var(--color-accent)] animate-spin" />}
              {isComplete && <CheckCircle2 size={16} className="text-emerald-500" />}
              {isFailed && <AlertCircle size={16} className="text-red-500" />}
              <span className="text-sm font-semibold text-[var(--color-title-active)]">
                {isComplete
                  ? (ja ? '動画が完成しました' : 'Video Complete')
                  : isFailed
                    ? (ja ? '生成に失敗しました' : 'Generation Failed')
                    : (ja ? '動画生成中...' : 'Generating Video...')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {(isComplete || isFailed) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissed(true);
                    if (storeId) removeJob(storeId);
                  }}
                  className="p-1 rounded-md hover:bg-[var(--color-bg-element)] transition-colors"
                >
                  <X size={14} className="text-[var(--color-text-placeholder)]" />
                </button>
              )}
              {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-[var(--color-bg-element)]">
            <motion.div
              className={`h-full ${isFailed ? 'bg-red-500' : 'bg-[var(--color-accent)]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Expanded content */}
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 space-y-2">
                  {/* Current step */}
                  {isProcessing && (
                    <p className="text-xs text-[var(--color-text-body)]">
                      {currentLabel}
                    </p>
                  )}

                  {/* Step list */}
                  {activeJob.steps.length > 0 && (
                    <div className="space-y-1">
                      {activeJob.steps.map((step) => (
                        <div key={step.id} className="flex items-center gap-2">
                          {step.status === 'completed' && (
                            <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                          )}
                          {step.status === 'processing' && (
                            <Loader2 size={12} className="text-[var(--color-accent)] animate-spin flex-shrink-0" />
                          )}
                          {step.status === 'pending' && (
                            <div className="w-3 h-3 rounded-full border border-[var(--color-line)] flex-shrink-0" />
                          )}
                          {step.status === 'failed' && (
                            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              step.status === 'processing'
                                ? 'text-[var(--color-title-active)] font-medium'
                                : step.status === 'completed'
                                  ? 'text-[var(--color-text-placeholder)]'
                                  : 'text-[var(--color-text-placeholder)]'
                            }`}
                          >
                            {ja ? step.labelJa : step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Error message */}
                  {isFailed && activeJob.errorMessage && (
                    <p className="text-xs text-red-500">{activeJob.errorMessage}</p>
                  )}

                  {/* Download button */}
                  {isComplete && activeJob.finalVideoUrl && (
                    <a
                      href={activeJob.finalVideoUrl}
                      download
                      className="flex items-center gap-2 px-3 py-2 bg-[var(--color-accent)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Download size={14} />
                      {ja ? '動画をダウンロード' : 'Download Video'}
                    </a>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
