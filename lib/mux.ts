// Mux configuration for live streaming
// Server-side only - use in API routes

export const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
export const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

export interface LiveStream {
  id: string;
  streamKey: string;
  playbackId: string;
  status: 'idle' | 'active' | 'disabled';
  createdAt: string;
}

export interface Asset {
  id: string;
  playbackId: string;
  status: 'preparing' | 'ready' | 'errored';
  duration: number;
  aspectRatio: string;
  createdAt: string;
}

// Generate playback URL
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

// Generate thumbnail URL
export function getThumbnailUrl(
  playbackId: string,
  options?: {
    width?: number;
    height?: number;
    time?: number;
    fitMode?: 'preserve' | 'stretch' | 'crop' | 'smartcrop' | 'pad';
  }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.time) params.set('time', options.time.toString());
  if (options?.fitMode) params.set('fit_mode', options.fitMode);

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
}

// Generate animated GIF URL
export function getGifUrl(
  playbackId: string,
  options?: {
    width?: number;
    height?: number;
    start?: number;
    end?: number;
    fps?: number;
  }
): string {
  const params = new URLSearchParams();
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.start) params.set('start', options.start.toString());
  if (options?.end) params.set('end', options.end.toString());
  if (options?.fps) params.set('fps', options.fps.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/animated.gif${queryString ? `?${queryString}` : ''}`;
}

// Stream configuration
export const STREAM_CONFIG = {
  latencyMode: 'low' as const,
  reconnectWindow: 60,
  maxContinuousDuration: 43200, // 12 hours in seconds
};

// Player configuration
export const PLAYER_CONFIG = {
  autoplay: 'muted' as const,
  defaultShowControls: true,
  primaryColor: '#6366f1',
  secondaryColor: '#ffffff',
};
