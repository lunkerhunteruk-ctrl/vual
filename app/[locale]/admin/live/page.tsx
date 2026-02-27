'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LivePreview, StreamSettings, ProductCasting, BroadcastHistory } from '@/components/admin/live';
import { useStoreContext } from '@/lib/store/store-context';
import { WHIPClient } from '@/lib/whip-client';

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
  webRTCUrl: string | null;
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
  const [connectionState, setConnectionState] = useState<string>('');

  const whipClientRef = useRef<WHIPClient | null>(null);

  // Sync products to Firestore directly (client SDK) when they change
  useEffect(() => {
    if (!isLive || !streamData?.id || !db) return;

    const productData = castProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      imageUrl: p.imageUrl || null,
    }));

    updateDoc(doc(db, 'streams', streamData.id), {
      products: productData,
      updatedAt: serverTimestamp(),
    }).catch((err) => console.error('Product sync error:', err));
  }, [castProducts, isLive, streamData?.id]);

  // Handle "Go Live" — create Cloudflare Stream + WebRTC publish
  const handleGoLive = useCallback(async (title: string) => {
    if (!store?.id) {
      setError(locale === 'ja' ? 'ストア情報が取得できません' : 'Store information not available');
      return;
    }

    if (!mediaStream) {
      setError(locale === 'ja' ? 'カメラをONにしてから配信を開始してください' : 'Please turn on the camera before going live');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 1. Create stream on Cloudflare via API
      const res = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, shopId: store.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.details || 'Failed to create stream');
      }

      const data = await res.json();

      if (!data.webRTCUrl) {
        throw new Error('WebRTC URL not available from Cloudflare');
      }

      setStreamData({
        id: data.id,
        streamKey: data.streamKey,
        rtmpsUrl: data.rtmpsUrl,
        webRTCUrl: data.webRTCUrl,
        playbackId: data.playbackId,
      });

      // 2. Save stream info to Firestore via client SDK
      if (db) {
        await setDoc(doc(db, 'streams', data.id), {
          shopId: store.id,
          title,
          status: 'live',
          playbackId: data.id,
          viewerCount: 0,
          peakViewerCount: 0,
          products: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          startedAt: serverTimestamp(),
        });
      }

      // 3. Connect via WHIP
      const client = new WHIPClient(data.webRTCUrl);

      client.onConnectionStateChange((state) => {
        setConnectionState(state);
        if (state === 'failed' || state === 'disconnected') {
          setError(
            locale === 'ja'
              ? '配信接続が切断されました。再接続してください。'
              : 'Stream connection lost. Please reconnect.'
          );
        }
      });

      await client.publish(mediaStream);
      whipClientRef.current = client;

      setIsLive(true);
    } catch (err) {
      console.error('Go live error:', err);
      setError(
        locale === 'ja'
          ? `配信の開始に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`
          : `Failed to start stream: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsConnecting(false);
    }
  }, [store?.id, locale, mediaStream]);

  // Handle "End Stream"
  const handleEndStream = useCallback(async () => {
    // Disconnect WHIP
    if (whipClientRef.current) {
      await whipClientRef.current.disconnect();
      whipClientRef.current = null;
    }

    // Update Firestore status via client SDK
    if (streamData?.id && db) {
      updateDoc(doc(db, 'streams', streamData.id), {
        status: 'ended',
        endedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    setIsLive(false);
    setStreamData(null);
    setConnectionState('');
  }, [streamData]);

  const handleStreamReady = useCallback((stream: MediaStream | null) => {
    setMediaStream(stream);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (whipClientRef.current) {
        whipClientRef.current.disconnect();
      }
    };
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

      {/* Live Status */}
      {isLive && streamData && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-[var(--radius-md)]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-green-800">
              {locale === 'ja' ? '配信中' : 'Live'}
              {connectionState && (
                <span className="ml-2 text-xs font-normal text-green-600">
                  ({connectionState})
                </span>
              )}
            </p>
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
            disabled={false}
          />
        </div>
      </div>

      {/* Bottom Section - Broadcast History */}
      <BroadcastHistory />
    </div>
  );
}
