import { NextRequest, NextResponse } from 'next/server';
import { getVeoStatus } from '@/lib/video/kie-client';

/**
 * GET /api/video-generator/download?taskId=...&passcode=...
 *
 * Streams the finished video back through our own origin with a
 * Content-Disposition: attachment header so the browser actually downloads it.
 *
 * Why proxy instead of linking Kie's URL directly: Kie serves the video from
 * tempfile.aiquickdraw.com (a different origin), and browsers ignore the
 * `download` attribute on cross-origin links — they just open the file. We
 * also avoid being an open proxy by looking the URL up via taskId rather than
 * accepting an arbitrary `url` param.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const expected = process.env.STUDIO_TOOLS_PASSCODE || process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE;
    if (expected && searchParams.get('passcode') !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskId = searchParams.get('taskId');
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const status = await getVeoStatus(taskId);
    const videoUrl = status.videoUrls[0];
    if (status.status !== 'success' || !videoUrl) {
      return NextResponse.json({ error: 'Video not ready' }, { status: 409 });
    }

    const upstream = await fetch(videoUrl);
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
        'Content-Disposition': `attachment; filename="video-${taskId}.mp4"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[Video Generator] download error:', error);
    return NextResponse.json({ error: error.message || 'Download failed' }, { status: 500 });
  }
}
