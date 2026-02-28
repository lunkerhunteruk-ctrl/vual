'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Settings, Check } from 'lucide-react';

export type Resolution = '1080p' | '720p';

// Portrait (9:16) resolutions for mobile-optimized streaming
const RESOLUTION_MAP: Record<Resolution, { width: number; height: number; label: string }> = {
  '1080p': { width: 1080, height: 1920, label: '1080p (縦)' },
  '720p': { width: 720, height: 1280, label: '720p (縦)' },
};

interface LivePreviewProps {
  isLive?: boolean;
  viewerCount?: number;
  onStreamReady?: (stream: MediaStream | null) => void;
}

export function LivePreview({ isLive = false, viewerCount = 0, onStreamReady }: LivePreviewProps) {
  const t = useTranslations('admin.live');
  const locale = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [showSettings, setShowSettings] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start/stop camera
  const startCamera = useCallback(async (res: Resolution) => {
    try {
      setCameraError(null);
      const config = RESOLUTION_MAP[res];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: config.width },
          height: { ideal: config.height },
          facingMode: 'user',
        },
        audio: isMicOn,
      });

      // Stop previous stream
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      setMediaStream(stream);
      onStreamReady?.(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError(
        locale === 'ja'
          ? 'カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。'
          : 'Camera access denied. Please check browser settings.'
      );
      setIsCameraOn(false);
    }
  }, [isMicOn, mediaStream, onStreamReady, locale]);

  const stopCamera = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
      onStreamReady?.(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [mediaStream, onStreamReady]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (isCameraOn) {
      stopCamera();
      setIsCameraOn(false);
    } else {
      setIsCameraOn(true);
      startCamera(resolution);
    }
  }, [isCameraOn, stopCamera, startCamera, resolution]);

  // Toggle mic
  const toggleMic = useCallback(() => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = newMicState;
      });
    }
  }, [isMicOn, mediaStream]);

  // Change resolution (restart camera)
  const changeResolution = useCallback((res: Resolution) => {
    setResolution(res);
    setShowSettings(false);
    if (isCameraOn) {
      startCamera(res);
    }
  }, [isCameraOn, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] overflow-hidden"
    >
      <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-title-active)] uppercase tracking-wide">
          {t('preview')}
        </h3>
        <div className="flex items-center gap-2">
          {/* Camera toggle */}
          <button
            onClick={toggleCamera}
            className={`p-2 rounded-[var(--radius-md)] transition-colors ${
              isCameraOn
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
            }`}
            title={isCameraOn ? 'カメラOFF' : 'カメラON'}
          >
            {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          {/* Mic toggle */}
          <button
            onClick={toggleMic}
            className={`p-2 rounded-[var(--radius-md)] transition-colors ${
              isMicOn
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
            }`}
            title={isMicOn ? 'マイクOFF' : 'マイクON'}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Settings (resolution) */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-[var(--radius-md)] transition-colors ${
                showSettings
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)]'
              }`}
              title={locale === 'ja' ? '解像度設定' : 'Resolution Settings'}
            >
              <Settings size={18} />
            </button>

            {/* Resolution Dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white border border-[var(--color-line)] rounded-[var(--radius-md)] shadow-lg z-10 overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-[var(--color-line)]">
                    <p className="text-xs font-medium text-[var(--color-text-label)] uppercase">
                      {locale === 'ja' ? '解像度' : 'Resolution'}
                    </p>
                  </div>
                  {(Object.keys(RESOLUTION_MAP) as Resolution[]).map(res => (
                    <button
                      key={res}
                      onClick={() => changeResolution(res)}
                      className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-[var(--color-text-body)] hover:bg-[var(--color-bg-element)] transition-colors"
                    >
                      <span>{RESOLUTION_MAP[res].label}</span>
                      {resolution === res && <Check size={14} className="text-[var(--color-accent)]" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Resolution badge */}
          <span className="text-xs text-[var(--color-text-label)] bg-[var(--color-bg-element)] px-2 py-1 rounded">
            {resolution}
          </span>
        </div>
      </div>

      {/* Video Preview (9:16 portrait) */}
      <div className="bg-[var(--color-bg-inverse)] relative" style={{ aspectRatio: '9/16', maxHeight: '70vh' }}>
        {/* Real video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${isCameraOn ? '' : 'hidden'}`}
        />

        {/* Camera off placeholder */}
        {!isCameraOn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <VideoOff size={48} className="mb-4 opacity-50" />
            <p className="text-sm opacity-70">{t('cameraFeed')}</p>
            <p className="text-xs opacity-50">{t('clickCameraToEnable')}</p>
          </div>
        )}

        {/* Camera error */}
        {cameraError && (
          <div className="absolute inset-x-0 bottom-0 p-3 bg-red-600/90 text-white text-xs text-center">
            {cameraError}
          </div>
        )}

        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-medium text-white">LIVE</span>
          </div>
        )}

        {/* Viewer count */}
        {isLive && viewerCount > 0 && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 rounded-full">
            <span className="text-xs font-medium text-white">
              {viewerCount.toLocaleString()} {locale === 'ja' ? '人視聴中' : 'viewers'}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default LivePreview;
