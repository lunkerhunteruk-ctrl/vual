import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!isSupabaseConfigured()) {
    if (id) {
      return NextResponse.json(null);
    }
    return NextResponse.json({ roles: [] });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Fetch single role by ID
    if (id) {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    // Fetch multiple roles
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('store_id', await resolveStoreIdFromRequest(request))
      .order('name', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ roles: data || [] });
  } catch (error: any) {
    console.error('Roles API error:', error);
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
      .from('roles')
      .insert({
        store_id: await resolveStoreIdFromRequest(request),
        is_system: false,
        ...body,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Roles POST error:', error);
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
      return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
    }

    // Check if it's a system role
    const { data: existing } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', id)
      .single();

    if (existing?.is_system) {
      return NextResponse.json({ error: 'Cannot edit system roles' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Roles PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Role ID required' }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }

  try {
    // Check if it's a system role
    const { data: existing } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', id)
      .single();

    if (existing?.is_system) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 403 });
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Roles DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
