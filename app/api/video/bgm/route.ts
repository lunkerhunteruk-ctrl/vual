import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: List BGM tracks for this store
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ tracks: [] });
    }

    const storeId = await resolveStoreIdFromRequest(request);

    const { data, error } = await supabase
      .from('bgm_tracks')
      .select('id, name, url, file_size, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ tracks: [] });
      }
      throw error;
    }

    return NextResponse.json({ tracks: data || [] });
  } catch (error: any) {
    console.error('[BGM] GET error:', error);
    return NextResponse.json({ tracks: [] });
  }
}

// POST: Upload BGM file and register track (server-side upload with service_role)
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;

    if (!file || !name?.trim()) {
      return NextResponse.json({ error: 'file and name are required' }, { status: 400 });
    }

    // Upload to Supabase Storage with service_role (bypasses RLS)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'mp3';
    const filename = `bgm/${timestamp}-${randomStr}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('model-images')
      .upload(filename, buffer, {
        contentType: file.type || 'audio/mpeg',
        cacheControl: '31536000',
      });

    if (uploadError) {
      console.error('[BGM] Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('model-images')
      .getPublicUrl(filename);

    // Register metadata in database
    const { data: track, error: insertError } = await supabase
      .from('bgm_tracks')
      .insert({
        store_id: storeId,
        name: name.trim(),
        url: urlData.publicUrl,
        file_size: file.size,
      })
      .select('id, name, url, file_size, created_at')
      .single();

    if (insertError) {
      console.error('[BGM] Insert error:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('model-images').remove([filename]);
      return NextResponse.json({ error: 'Failed to save track' }, { status: 500 });
    }

    return NextResponse.json({ success: true, track });
  } catch (error: any) {
    console.error('[BGM] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a BGM track
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
    }

    // Get track URL to delete from storage
    const { data: track } = await supabase
      .from('bgm_tracks')
      .select('url')
      .eq('id', id)
      .single();

    if (track?.url) {
      const match = track.url.match(/model-images\/(.+)$/);
      if (match) {
        await supabase.storage.from('model-images').remove([match[1]]);
      }
    }

    const { error } = await supabase
      .from('bgm_tracks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[BGM] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
