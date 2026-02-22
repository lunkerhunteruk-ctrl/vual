'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, Settings } from 'lucide-react';

export function LivePreview() {
  const t = useTranslations('admin.live');
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);

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
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`p-2 rounded-[var(--radius-md)] transition-colors ${
              isCameraOn
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
            }`}
          >
            {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <button
            onClick={() => setIsMicOn(!isMicOn)}
            className={`p-2 rounded-[var(--radius-md)] transition-colors ${
              isMicOn
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-element)] text-[var(--color-text-body)]'
            }`}
          >
            {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
          <button className="p-2 rounded-[var(--radius-md)] bg-[var(--color-bg-element)] text-[var(--color-text-body)] hover:bg-[var(--color-bg-input)] transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="aspect-video bg-[var(--color-bg-inverse)] relative">
        {isCameraOn ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
            {/* Camera feed would go here */}
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <VideoOff size={48} className="mb-4 opacity-50" />
            <p className="text-sm opacity-70">{t('cameraFeed')}</p>
            <p className="text-xs opacity-50">Click camera icon to enable</p>
          </div>
        )}

        {/* Live indicator (when streaming) */}
        {false && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-full">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-xs font-medium text-white">LIVE</span>
          </div>
        )}

        {/* Viewer count (when streaming) */}
        {false && (
          <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/50 rounded-full">
            <span className="text-xs font-medium text-white">1,234 viewers</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default LivePreview;
