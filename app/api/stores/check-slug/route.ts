import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

const RESERVED_SLUGS = ['admin', 'api', 'www', 'app', 'signup', 'login', 'vual', 'help', 'support', 'blog', 'docs'];

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  // Validate format
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ available: false, reason: 'invalid' });
  }

  // Check reserved
  if (RESERVED_SLUGS.includes(slug)) {
    return NextResponse.json({ available: false, reason: 'reserved' });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { data } = await supabase
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .single();

  return NextResponse.json({ available: !data });
}
