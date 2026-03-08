import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface VideoSettingsState {
  videoModel: 'veo' | 'kling';
  totalDurationSec: number;
  motionPreset: 'slide' | 'shuffle' | 'minimal';
  bgmId: string | null;
  showIntro: boolean;
  introStyle: 'flatlay' | 'text-only';
  introText: string;
  locationText: string;
  dateText: string;
  showEnding: boolean;
  whiteFlash: boolean;
  textFont: 'impact' | 'noto-sans' | 'montserrat';
  aspectRatio: '16:9' | '9:16' | '1:1';
  letterbox: boolean;
  colorPreset: 'none' | 'natural' | 'chrome' | 'film';
}

export interface VideoPreset {
  id: string;
  name: string;
  settings: VideoSettingsState;
  createdAt: number;
}

interface VideoSettingsStore extends VideoSettingsState {
  presets: VideoPreset[];
  activePresetId: string | null;
  setVideoModel: (model: 'veo' | 'kling') => void;
  setTotalDuration: (sec: number) => void;
  setMotionPreset: (preset: 'slide' | 'shuffle' | 'minimal') => void;
  setBgmId: (id: string | null) => void;
  setShowIntro: (show: boolean) => void;
  setIntroStyle: (style: 'flatlay' | 'text-only') => void;
  setIntroText: (text: string) => void;
  setLocationText: (text: string) => void;
  setDateText: (text: string) => void;
  setShowEnding: (show: boolean) => void;
  setWhiteFlash: (show: boolean) => void;
  setTextFont: (font: 'impact' | 'noto-sans' | 'montserrat') => void;
  setAspectRatio: (ar: '16:9' | '9:16' | '1:1') => void;
  setLetterbox: (on: boolean) => void;
  setColorPreset: (preset: 'none' | 'natural' | 'chrome' | 'film') => void;
  getSettings: () => VideoSettingsState;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
}

export const useVideoSettingsStore = create<VideoSettingsStore>()(
  persist(
    (set, get) => ({
      videoModel: 'veo',
      totalDurationSec: 26,
      motionPreset: 'slide',
      bgmId: null,
      showIntro: true,
      introStyle: 'flatlay',
      introText: 'FROM FLATLAY TO RUNWAY',
      locationText: '',
      dateText: '',
      showEnding: true,
      whiteFlash: true,
      textFont: 'impact',
      aspectRatio: '9:16',
      letterbox: false,
      colorPreset: 'none',
      presets: [],
      activePresetId: null,

      setVideoModel: (model) => set({ videoModel: model, activePresetId: null }),
      setTotalDuration: (sec) => set({ totalDurationSec: sec, activePresetId: null }),
      setMotionPreset: (preset) => set({ motionPreset: preset, activePresetId: null }),
      setBgmId: (id) => set({ bgmId: id, activePresetId: null }),
      setShowIntro: (show) => set({ showIntro: show, activePresetId: null }),
      setIntroStyle: (style) => set({ introStyle: style, activePresetId: null }),
      setIntroText: (text) => set({ introText: text, activePresetId: null }),
      setLocationText: (text) => set({ locationText: text, activePresetId: null }),
      setDateText: (text) => set({ dateText: text, activePresetId: null }),
      setShowEnding: (show) => set({ showEnding: show, activePresetId: null }),
      setWhiteFlash: (show) => set({ whiteFlash: show, activePresetId: null }),
      setTextFont: (font) => set({ textFont: font, activePresetId: null }),
      setAspectRatio: (ar) => set({ aspectRatio: ar, activePresetId: null }),
      setLetterbox: (on) => set({ letterbox: on, activePresetId: null }),
      setColorPreset: (preset) => set({ colorPreset: preset, activePresetId: null }),

      getSettings: () => {
        const s = get();
        return {
          videoModel: s.videoModel,
          totalDurationSec: s.totalDurationSec,
          motionPreset: s.motionPreset,
          bgmId: s.bgmId,
          showIntro: s.showIntro,
          introStyle: s.introStyle,
          introText: s.introText,
          locationText: s.locationText,
          dateText: s.dateText,
          showEnding: s.showEnding,
          whiteFlash: s.whiteFlash,
          textFont: s.textFont,
          aspectRatio: s.aspectRatio,
          letterbox: s.letterbox,
          colorPreset: s.colorPreset,
        };
      },

      savePreset: (name) => {
        const s = get();
        const id = `preset-${Date.now()}`;
        const preset: VideoPreset = {
          id,
          name,
          settings: s.getSettings(),
          createdAt: Date.now(),
        };
        set({ presets: [...s.presets, preset], activePresetId: id });
      },

      loadPreset: (id) => {
        const preset = get().presets.find((p) => p.id === id);
        if (preset) {
          set({ ...preset.settings, activePresetId: id });
        }
      },

      deletePreset: (id) => {
        const s = get();
        set({
          presets: s.presets.filter((p) => p.id !== id),
          activePresetId: s.activePresetId === id ? null : s.activePresetId,
        });
      },

      renamePreset: (id, name) => {
        const s = get();
        set({
          presets: s.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        });
      },
    }),
    { name: 'vual-video-settings' }
  )
);
