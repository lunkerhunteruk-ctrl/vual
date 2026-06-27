import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 10;

const APIMART_API_KEY = process.env.APIMART_API_KEY;
const APIMART_TASK_URL = 'https://api.apimart.ai/v1/tasks';

// GET /api/my/generate/poll?taskId=xxx&creditId=yyy&firebaseUid=zzz
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');
  const creditId = searchParams.get('creditId');
  const firebaseUid = searchParams.get('firebaseUid');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 });
  }

  if (!APIMART_API_KEY) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(`${APIMART_TASK_URL}/${taskId}`, {
      headers: { 'Authorization': `Bearer ${APIMART_API_KEY}` },
    });

    if (!res.ok) {
      return NextResponse.json({ status: 'processing' });
    }

    const data = await res.json();
    const status: string = data.data?.status ?? data.status ?? 'unknown';

    if (status === 'failed' || status === 'error') {
      return NextResponse.json({ status: 'failed', error: data.data?.error ?? '生成に失敗しました' });
    }

    if (status === 'completed') {
      // Extract CDN URLs: data.result.images[].url is an array of strings
      const cdnUrls: string[] = [];
      for (const img of data.data?.result?.images ?? []) {
        const urls = img.url;
        if (Array.isArray(urls)) {
          for (const u of urls) { if (typeof u === 'string' && u) cdnUrls.push(u); }
        } else if (typeof urls === 'string' && urls) {
          cdnUrls.push(urls);
        }
      }

      if (cdnUrls.length === 0) {
        return NextResponse.json({ status: 'failed', error: '画像URLが見つかりません' });
      }

      // Download CDN image → base64 data URL
      const imgRes = await fetch(cdnUrls[0]);
      const buf = await imgRes.arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const ct = imgRes.headers.get('content-type') || 'image/png';
      const image = `data:${ct};base64,${b64}`;

      // Deduct credit after confirmed success
      if (creditId && firebaseUid) {
        try {
          const supa = createServerClient();
          if (supa) {
            await supa.rpc('deduct_consumer_credit', { p_consumer_credit_id: creditId });
          }
        } catch (e) {
          console.error('[Poll] Credit deduction failed (non-blocking):', e);
        }
      }

      return NextResponse.json({ status: 'completed', image });
    }

    // submitted / processing / pending
    return NextResponse.json({ status: 'processing' });
  } catch (err) {
    console.error('[Poll] Error:', err);
    return NextResponse.json({ status: 'processing' });
  }
}
