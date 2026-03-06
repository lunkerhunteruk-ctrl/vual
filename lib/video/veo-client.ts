/**
 * Google Veo 3.1 API Client
 *
 * Uses Vertex AI predictLongRunning endpoint for image-to-video generation.
 * Requires a GCP service account with "Vertex AI User" role.
 *
 * Environment variables:
 * - GCP_PROJECT_ID: Google Cloud project ID
 * - GCP_SERVICE_ACCOUNT_JSON: Full JSON string of the service account key
 */

import { GoogleAuth } from 'google-auth-library';

const REGION = 'us-central1';
const MODEL_ID = 'veo-3.1-generate-001';

// Lazy-initialized auth client
let authClient: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (authClient) return authClient;

  const credentialsJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!credentialsJson) {
    throw new Error('GCP_SERVICE_ACCOUNT_JSON environment variable is not set');
  }

  authClient = new GoogleAuth({
    credentials: JSON.parse(credentialsJson),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  return authClient;
}

async function getAccessToken(): Promise<string> {
  const auth = getAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) {
    throw new Error('Failed to obtain access token');
  }
  return tokenResponse.token;
}

function getProjectId(): string {
  const projectId = process.env.GCP_PROJECT_ID;
  if (!projectId) {
    throw new Error('GCP_PROJECT_ID environment variable is not set');
  }
  return projectId;
}

function getBaseUrl(): string {
  const projectId = getProjectId();
  return `https://${REGION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${REGION}/publishers/google/models/${MODEL_ID}`;
}

export interface VeoJobRequest {
  /** Base64 encoded image (no data:image prefix) */
  imageBase64: string;
  /** MIME type of the image */
  imageMimeType?: string;
  /** Video generation prompt */
  prompt: string;
  /** Duration in seconds: 4, 6, or 8 */
  durationSeconds: 4 | 6 | 8;
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16';
  /** Output resolution */
  resolution?: '720p' | '1080p';
  /** GCS URI for output storage (recommended for production) */
  storageUri?: string;
  /** Negative prompt */
  negativePrompt?: string;
}

export interface VeoOperationResult {
  /** Operation name for polling */
  operationName: string;
}

export interface VeoPollResult {
  done: boolean;
  /** Video data when done (base64 or GCS URI) */
  video?: {
    bytesBase64Encoded?: string;
    gcsUri?: string;
    mimeType: string;
  };
  /** Error info if failed */
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Submit an image-to-video generation job to Veo 3.1.
 * Returns immediately with an operation name for polling.
 */
export async function submitVeoJob(request: VeoJobRequest): Promise<VeoOperationResult> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const body: any = {
    instances: [
      {
        prompt: request.prompt,
        image: {
          bytesBase64Encoded: request.imageBase64,
          mimeType: request.imageMimeType || 'image/jpeg',
        },
      },
    ],
    parameters: {
      aspectRatio: request.aspectRatio || '16:9',
      durationSeconds: request.durationSeconds,
      sampleCount: 1,
      resolution: request.resolution || '1080p',
      generateAudio: false,
      personGeneration: 'allow_adult',
    },
  };

  if (request.negativePrompt) {
    body.parameters.negativePrompt = request.negativePrompt;
  }

  if (request.storageUri) {
    body.parameters.storageUri = request.storageUri;
  }

  const res = await fetch(`${baseUrl}:predictLongRunning`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Veo API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();

  if (!data.name) {
    throw new Error('Veo API did not return an operation name');
  }

  return { operationName: data.name };
}

/**
 * Poll a Veo operation for completion.
 */
export async function pollVeoOperation(operationName: string): Promise<VeoPollResult> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}:fetchPredictOperation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ operationName }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Veo poll error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();

  if (data.error) {
    return {
      done: true,
      error: {
        code: data.error.code || 500,
        message: data.error.message || 'Unknown error',
      },
    };
  }

  if (!data.done) {
    return { done: false };
  }

  // Extract video from response
  const videos = data.response?.videos;
  if (!videos || videos.length === 0) {
    // Log full response for debugging
    const raiResult = data.response?.raiMediaFilteredReasons;
    const filterReason = raiResult ? JSON.stringify(raiResult) : 'unknown';
    console.error('[Veo] No videos in response. Full response keys:', Object.keys(data.response || {}), 'RAI filter:', filterReason);
    return {
      done: true,
      error: { code: 500, message: `No videos in response (filter: ${filterReason})` },
    };
  }

  return {
    done: true,
    video: {
      bytesBase64Encoded: videos[0].bytesBase64Encoded,
      gcsUri: videos[0].gcsUri,
      mimeType: videos[0].mimeType || 'video/mp4',
    },
  };
}

/**
 * Submit and wait for a Veo job to complete.
 * Polls every 10 seconds. Useful for server-side background jobs.
 *
 * WARNING: This can take 30s-6min. Do NOT use in Vercel API routes
 * (use submitVeoJob + pollVeoOperation separately instead).
 */
export async function generateVideoSync(
  request: VeoJobRequest,
  maxWaitMs = 360000, // 6 minutes
  pollIntervalMs = 10000
): Promise<VeoPollResult> {
  const { operationName } = await submitVeoJob(request);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const result = await pollVeoOperation(operationName);
    if (result.done) return result;
  }

  return {
    done: true,
    error: { code: 408, message: `Timed out after ${maxWaitMs / 1000}s` },
  };
}
