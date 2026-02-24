import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const slug = searchParams.get('slug');
  const category = searchParams.get('category');
  const isPublished = searchParams.get('isPublished');
  const limitParam = searchParams.get('limit');
  const pageLimit = limitParam ? parseInt(limitParam) : 20;

  if (!isSupabaseConfigured()) {
    if (id || slug) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ posts: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Fetch single post by ID
    if (id) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch by slug
    if (slug) {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('store_id', await resolveStoreIdFromRequest(request))
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple posts
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('created_at', { ascending: false })
      .limit(pageLimit);

    if (category) {
      query = query.eq('category', category);
    }

    if (isPublished !== null && isPublished !== undefined) {
      query = query.eq('is_published', isPublished === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ posts: data || [] });
  } catch (error: any) {
    console.error('Blog API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        store_id: await resolveStoreIdFromRequest(request),
        ...body,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Blog POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Blog PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Blog DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
