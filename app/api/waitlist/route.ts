import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { email, company, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json({ error: 'Email and type required' }, { status: 400 });
    }

    // Upsert to avoid duplicates
    const { error } = await supabase
      .from('waitlist')
      .upsert(
        { email: email.toLowerCase().trim(), company: company?.trim() || null, type, updated_at: new Date().toISOString() },
        { onConflict: 'email' }
      );

    if (error) throw error;

    // Notify via Formspree (fire-and-forget)
    fetch('https://formspree.io/f/xnjbbwev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _subject: `[VUAL Waitlist] New ${type} signup: ${company || 'N/A'}`,
        email,
        company,
        type,
        message: `New waitlist signup: ${company || 'N/A'} / ${email} (${type})`,
      }),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Waitlist] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
