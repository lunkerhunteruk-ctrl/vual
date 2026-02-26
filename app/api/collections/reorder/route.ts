import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// PUT: Reorder collection looks
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { lookIds } = body;

    if (!lookIds || !Array.isArray(lookIds)) {
      return NextResponse.json({ error: 'lookIds array required' }, { status: 400 });
    }

    // Update positions
    const updates = lookIds.map((id: string, index: number) =>
      supabase
        .from('collection_looks')
        .update({ position: index, updated_at: new Date().toISOString() })
        .eq('id', id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Collections reorder error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
