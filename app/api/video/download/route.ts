import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/video/download?url=...
 * Proxy download to avoid S3 CORS restrictions.
 * Only allows URLs from known S3 buckets.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Only allow S3 remotion bucket URLs
  if (!url.includes('remotionlambda-') && !url.includes('.s3.')) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="vual-video.mp4"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
