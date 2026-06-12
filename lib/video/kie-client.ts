/**
 * Kie.ai Veo 3.1 video generation client.
 *
 * Why Kie.ai instead of the existing Vertex AI Veo path (lib/video/veo-client.ts):
 * Kie wraps the same Google Veo 3.1 models at ~25% of official pricing, which is
 * the whole point of this standalone Video Generator tool. The flow is two steps:
 *
 *   1. createVeoTask()  → POST /generate            → returns a taskId
 *   2. getVeoStatus()   → GET  /record-info?taskId  → poll until successFlag flips
 *
 * Docs: https://docs.kie.ai/veo3-api/generate-veo-3-video
 */

const KIE_BASE = 'https://api.kie.ai/api/v1/veo';

function authHeaders(): Record<string, string> {
  const key = process.env.KIE_API_KEY;
  if (!key) throw new Error('KIE_API_KEY is not set');
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

export type VeoModel = 'veo3' | 'veo3_fast' | 'veo3_lite';
export type AspectRatio = '16:9' | '9:16' | 'Auto';
export type VeoDuration = 4 | 6 | 8;
export type VeoResolution = '720p' | '1080p' | '4k';

export interface CreateVeoParams {
  prompt: string;
  /** 1 image: video unfolds around it. 2 images: first/last frame transition. */
  imageUrls?: string[];
  model?: VeoModel;
  aspectRatio?: AspectRatio;
  duration?: VeoDuration;
  resolution?: VeoResolution;
}

/**
 * Submit a generation task. Returns quickly with a taskId — the actual
 * rendering happens async on Kie's side, polled via getVeoStatus().
 */
export async function createVeoTask(params: CreateVeoParams): Promise<string> {
  const hasImage = !!params.imageUrls && params.imageUrls.length > 0;

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    model: params.model ?? 'veo3',
    aspect_ratio: params.aspectRatio ?? '16:9',
    duration: params.duration ?? 8,
    resolution: params.resolution ?? '1080p',
    enableTranslation: true, // translate non-English prompts for better results
    // With an image we drive image-to-video; otherwise plain text-to-video.
    generationType: hasImage ? 'FIRST_AND_LAST_FRAMES_2_VIDEO' : 'TEXT_2_VIDEO',
  };
  if (hasImage) body.imageUrls = params.imageUrls;

  const res = await fetch(`${KIE_BASE}/generate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 200) {
    throw new Error(json?.msg || `Kie generate failed (HTTP ${res.status})`);
  }
  const taskId = json.data?.taskId;
  if (!taskId) throw new Error('Kie generate returned no taskId');
  return taskId;
}

export type VeoStatusValue = 'generating' | 'success' | 'failed';

export interface VeoStatus {
  taskId: string;
  status: VeoStatusValue;
  /** Raw successFlag: 0=generating, 1=success, 2/3=failed. */
  flag: number;
  videoUrls: string[];
  errorMessage?: string;
}

/** Pull video URLs out of a record-info payload, tolerating both shapes Kie returns. */
function extractUrls(data: any): string[] {
  const raw = data?.resultUrls ?? data?.response?.resultUrls ?? data?.response?.resultUrl;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    // resultUrls is sometimes a JSON-encoded array string, sometimes a bare URL.
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [String(parsed)];
    } catch {
      return [raw];
    }
  }
  return [];
}

/** Poll a task's status. Call repeatedly until status !== 'generating'. */
export async function getVeoStatus(taskId: string): Promise<VeoStatus> {
  const res = await fetch(
    `${KIE_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`,
    { headers: authHeaders(), cache: 'no-store' },
  );

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.code !== 200) {
    throw new Error(json?.msg || `Kie status failed (HTTP ${res.status})`);
  }

  const data = json.data ?? {};
  const flag = Number(data.successFlag);
  const status: VeoStatusValue =
    flag === 1 ? 'success' : flag === 2 || flag === 3 ? 'failed' : 'generating';

  return {
    taskId,
    status,
    flag,
    videoUrls: status === 'success' ? extractUrls(data) : [],
    errorMessage: data.errorMessage || data.failMsg || undefined,
  };
}
