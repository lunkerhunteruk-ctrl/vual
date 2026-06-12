import { NextRequest, NextResponse } from 'next/server';
import { getVeoStatus } from '@/lib/video/kie-client';

/**
 * GET /api/video-generator/status?taskId=...&passcode=...
 *
 * Thin proxy over Kie's record-info endpoint so the API key stays server-side.
 * The client polls this every few seconds until status !== 'generating'.
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
    return NextResponse.json(status);
  } catch (error: any) {
    console.error('[Video Generator] status error:', error);
    return NextResponse.json({ error: error.message || 'Status check failed' }, { status: 500 });
  }
}
