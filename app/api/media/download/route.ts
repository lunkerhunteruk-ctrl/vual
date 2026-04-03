import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = [
  '.r2.dev',
  '.s3.',
  'remotionlambda-',
];

/**
 * GET /api/media/download?url=...
 * Server-side proxy to bypass CORS restrictions for R2/S3 media.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.some((h) => url.includes(h))) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 403 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch media' }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
