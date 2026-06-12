import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { storage } from '@/lib/storage';
import { createVeoTask, VeoModel, AspectRatio, VeoDuration } from '@/lib/video/kie-client';

/**
 * POST /api/video-generator/generate
 *
 * Standalone Video Generator: submit a Veo 3.1 job to Kie.ai.
 * Accepts multipart/form-data so a drag-dropped image can ride along:
 *   - image      (File, optional)  → uploaded to R2, used as image-to-video input
 *   - prompt     (string, required)
 *   - duration   ('4' | '6' | '8')
 *   - aspectRatio('16:9' | '9:16')
 *   - model      ('veo3' | 'veo3_fast' | 'veo3_lite')
 *   - passcode   (string)          → gate so the endpoint can't be hit anonymously
 *
 * Returns { taskId, imageUrl } — poll status via /api/video-generator/status.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    // Passcode gate (same shared secret as the other studio tools).
    const passcode = form.get('passcode');
    const expected = process.env.STUDIO_TOOLS_PASSCODE || process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE;
    if (expected && passcode !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const prompt = String(form.get('prompt') || '').trim();
    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const duration = (Number(form.get('duration')) || 8) as VeoDuration;
    const aspectRatio = (String(form.get('aspectRatio') || '16:9')) as AspectRatio;
    const model = (String(form.get('model') || 'veo3')) as VeoModel;

    // Upload the dropped image to R2 so Kie can fetch it from a public URL.
    let imageUrl: string | undefined;
    const file = form.get('image');
    if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as File).size > 0) {
      const f = file as File;
      const buf = Buffer.from(await f.arrayBuffer());
      const ext = (f.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const key = `video-generator/${randomUUID()}.${ext}`;
      const { error } = await storage.from('media').upload(key, buf, {
        contentType: f.type || 'image/jpeg',
        upsert: true,
      });
      if (error) {
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
      }
      imageUrl = storage.from('media').getPublicUrl(key).data.publicUrl;
    }

    const taskId = await createVeoTask({
      prompt,
      imageUrls: imageUrl ? [imageUrl] : undefined,
      model,
      aspectRatio,
      duration,
      resolution: '1080p',
    });

    return NextResponse.json({ taskId, imageUrl: imageUrl ?? null });
  } catch (error: any) {
    console.error('[Video Generator] generate error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
