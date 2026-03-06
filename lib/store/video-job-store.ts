import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VideoJobStep {
  id: string;
  label: string;
  labelJa: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface VideoJob {
  id: string;
  storeId: string;
  bundleId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  videoModel: 'veo' | 'kling';
  totalDurationSec: number;
  currentStep: string | null;
  currentStepLabel: string | null;
  steps: VideoJobStep[];
  clipUrls: string[];
  finalVideoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface VideoJobStore {
  // Active jobs (keyed by store ID for multi-tenant)
  activeJobs: Record<string, VideoJob>;

  // Actions
  setJob: (storeId: string, job: VideoJob) => void;
  updateJobStatus: (storeId: string, updates: Partial<VideoJob>) => void;
  removeJob: (storeId: string) => void;
  getActiveJob: (storeId: string) => VideoJob | null;
}

export const useVideoJobStore = create<VideoJobStore>()(
  persist(
    (set, get) => ({
      activeJobs: {},

      setJob: (storeId, job) =>
        set((state) => ({
          activeJobs: { ...state.activeJobs, [storeId]: job },
        })),

      updateJobStatus: (storeId, updates) =>
        set((state) => {
          const current = state.activeJobs[storeId];
          if (!current) return state;
          return {
            activeJobs: {
              ...state.activeJobs,
              [storeId]: { ...current, ...updates },
            },
          };
        }),

      removeJob: (storeId) =>
        set((state) => {
          const { [storeId]: _, ...rest } = state.activeJobs;
          return { activeJobs: rest };
        }),

      getActiveJob: (storeId) => {
        return get().activeJobs[storeId] || null;
      },
    }),
    {
      name: 'vual-video-jobs',
    }
  )
);
