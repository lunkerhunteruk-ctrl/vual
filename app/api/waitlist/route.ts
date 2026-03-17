import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json({ error: 'Email and type required' }, { status: 400 });
    }

    // Upsert to avoid duplicates
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        { email: email.toLowerCase().trim(), type, updated_at: new Date().toISOString() },
        { onConflict: 'email' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Waitlist] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
