import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VideoSettingsState {
  videoModel: 'veo' | 'kling';
  totalDurationSec: number;
  motionPreset: 'slide' | 'shuffle' | 'minimal';
  bgmId: string | null;
  showIntro: boolean;
  showEnding: boolean;
  whiteFlash: boolean;
  textFont: 'impact' | 'noto-sans' | 'montserrat';
}

interface VideoSettingsStore extends VideoSettingsState {
  setVideoModel: (model: 'veo' | 'kling') => void;
  setTotalDuration: (sec: number) => void;
  setMotionPreset: (preset: 'slide' | 'shuffle' | 'minimal') => void;
  setBgmId: (id: string | null) => void;
  setShowIntro: (show: boolean) => void;
  setShowEnding: (show: boolean) => void;
  setWhiteFlash: (show: boolean) => void;
  setTextFont: (font: 'impact' | 'noto-sans' | 'montserrat') => void;
  getSettings: () => VideoSettingsState;
}

export const useVideoSettingsStore = create<VideoSettingsStore>()(
  persist(
    (set, get) => ({
      videoModel: 'veo',
      totalDurationSec: 26,
      motionPreset: 'slide',
      bgmId: null,
      showIntro: true,
      showEnding: true,
      whiteFlash: true,
      textFont: 'impact',

      setVideoModel: (model) => set({ videoModel: model }),
      setTotalDuration: (sec) => set({ totalDurationSec: sec }),
      setMotionPreset: (preset) => set({ motionPreset: preset }),
      setBgmId: (id) => set({ bgmId: id }),
      setShowIntro: (show) => set({ showIntro: show }),
      setShowEnding: (show) => set({ showEnding: show }),
      setWhiteFlash: (show) => set({ whiteFlash: show }),
      setTextFont: (font) => set({ textFont: font }),

      getSettings: () => {
        const s = get();
        return {
          videoModel: s.videoModel,
          totalDurationSec: s.totalDurationSec,
          motionPreset: s.motionPreset,
          bgmId: s.bgmId,
          showIntro: s.showIntro,
          showEnding: s.showEnding,
          whiteFlash: s.whiteFlash,
          textFont: s.textFont,
        };
      },
    }),
    { name: 'vual-video-settings' }
  )
);
