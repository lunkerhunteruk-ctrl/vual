import { NextResponse } from 'next/server';
import { checkVertexAIConnection } from '@/lib/ai/vertex-vton';

export async function GET() {
  try {
    const status = await checkVertexAIConnection();

    return NextResponse.json({
      status: status.connected ? 'connected' : 'disconnected',
      projectId: status.projectId,
      location: status.location,
      error: status.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
