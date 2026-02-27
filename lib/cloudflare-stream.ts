// Cloudflare Stream configuration for live streaming
// Server-side only - use in API routes

export const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
export const CF_STREAM_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

const CF_API_BASE = `https://api.cloudflare.com/client/v4/accounts`;

function getHeaders() {
  return {
    'Authorization': `Bearer ${CF_STREAM_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

// Create a live input (equivalent to Mux live stream)
export async function createLiveInput(meta?: Record<string, string>) {
  const res = await fetch(`${CF_API_BASE}/${CF_ACCOUNT_ID}/stream/live_inputs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      meta: meta || {},
      recording: {
        mode: 'automatic',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudflare Stream API error: ${err}`);
  }

  const data = await res.json();
  return data.result;
}

// Get a live input
export async function getLiveInput(liveInputId: string) {
  const res = await fetch(`${CF_API_BASE}/${CF_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.result;
}

// Delete a live input
export async function deleteLiveInput(liveInputId: string) {
  await fetch(`${CF_API_BASE}/${CF_ACCOUNT_ID}/stream/live_inputs/${liveInputId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

// List live inputs
export async function listLiveInputs() {
  const res = await fetch(`${CF_API_BASE}/${CF_ACCOUNT_ID}/stream/live_inputs`, {
    headers: getHeaders(),
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.result || [];
}

// ─── Playback URLs ───────────────────────────────────────────

// Cloudflare assigns a customer subdomain per account (e.g. customer-iachfaxtqeo2l99t)
// This must be a NEXT_PUBLIC_ var so client components can build playback URLs
const CF_CUSTOMER_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_STREAM_SUBDOMAIN || 'customer-iachfaxtqeo2l99t';

// HLS playback URL for a live input
export function getPlaybackUrl(uid: string): string {
  return `https://${CF_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${uid}/manifest/video.m3u8`;
}

// Thumbnail URL
export function getThumbnailUrl(videoId: string, options?: { width?: number; height?: number; time?: string }): string {
  const params = new URLSearchParams();
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.time) params.set('time', options.time);

  const queryString = params.toString();
  return `https://${CF_CUSTOMER_SUBDOMAIN}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg${queryString ? `?${queryString}` : ''}`;
}

// ─── Types ───────────────────────────────────────────────────

export interface CloudflareLiveInput {
  uid: string;
  rtmps: {
    url: string;
    streamKey: string;
  };
  rtmpsPlayback?: {
    url: string;
    streamKey: string;
  };
  srt?: {
    url: string;
    streamId: string;
    passphrase: string;
  };
  webRTC?: {
    url: string;
  };
  meta?: Record<string, string>;
  created: string;
  modified: string;
  status?: {
    current: {
      state: string; // 'connected' | 'disconnected'
    };
  };
}

// Stream configuration
export const STREAM_CONFIG = {
  recording: { mode: 'automatic' as const },
};

// Player configuration
export const PLAYER_CONFIG = {
  autoplay: 'muted' as const,
  defaultShowControls: true,
};
