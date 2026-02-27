'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { LivePreview, StreamSettings, ProductCasting, BroadcastHistory } from '@/components/admin/live';
import { useStoreContext } from '@/lib/store/store-context';

interface CastProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  imageUrl?: string;
}

interface StreamData {
  id: string;
  streamKey: string;
  rtmpsUrl: string;
  playbackId: string;
}

export default function LiveBroadcastPage() {
  const locale = useLocale();
  const store = useStoreContext((s) => s.store);

  // Stream state
  const [isLive, setIsLive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [castProducts, setCastProducts] = useState<CastProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Handle "Go Live" — create Cloudflare Stream
  const handleGoLive = useCallback(async (title: string) => {
    if (!store?.id) {
      setError(locale === 'ja' ? 'ストア情報が取得できません' : 'Store information not available');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          shopId: store.id,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create stream');
      }

      const data = await res.json();

      setStreamData({
        id: data.id,
        streamKey: data.streamKey,
        rtmpsUrl: data.rtmpsUrl,
        playbackId: data.playbackId,
      });

      setIsLive(true);
    } catch {
      setError(
        locale === 'ja'
          ? '配信の開始に失敗しました。もう一度お試しください。'
          : 'Failed to start stream. Please try again.'
      );
    } finally {
      setIsConnecting(false);
    }
  }, [store?.id, locale]);

  // Handle "End Stream"
  const handleEndStream = useCallback(() => {
    setIsLive(false);

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }

    if (streamData?.id) {
      fetch(`/api/streams/${streamData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' }),
      }).catch(() => {});
    }

    setStreamData(null);
  }, [mediaStream, streamData]);

  const handleStreamReady = useCallback((stream: MediaStream | null) => {
    setMediaStream(stream);
  }, []);

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[var(--radius-md)] text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Stream Key Info (shown when live) */}
      {isLive && streamData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-[var(--radius-md)]">
          <p className="text-sm font-medium text-green-800 mb-2">
            {locale === 'ja' ? '配信中 — OBSなどで以下の情報を使用してください' : 'Live — Use these details in OBS or your streaming software'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-green-600 font-medium">RTMPS URL:</span>
              <code className="block mt-1 p-2 bg-white rounded border border-green-200 text-green-900 break-all select-all">
                {streamData.rtmpsUrl}
              </code>
            </div>
            <div>
              <span className="text-green-600 font-medium">Stream Key:</span>
              <code className="block mt-1 p-2 bg-white rounded border border-green-200 text-green-900 break-all select-all">
                {streamData.streamKey}
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Top Section - Preview and Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Preview */}
        <div className="lg:col-span-2">
          <LivePreview
            isLive={isLive}
            viewerCount={0}
            onStreamReady={handleStreamReady}
          />
        </div>

        {/* Right - Settings & Products */}
        <div className="space-y-6">
          <StreamSettings
            onGoLive={handleGoLive}
            onEndStream={handleEndStream}
            isLive={isLive}
            isConnecting={isConnecting}
            streamTitle={streamTitle}
            onTitleChange={setStreamTitle}
          />
          <ProductCasting
            products={castProducts}
            onProductsChange={setCastProducts}
            disabled={isLive}
          />
        </div>
      </div>

      {/* Bottom Section - Broadcast History */}
      <BroadcastHistory />
    </div>
  );
}
