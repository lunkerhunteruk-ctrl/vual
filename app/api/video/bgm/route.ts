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

// POST: Upload a new BGM track
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;

    if (!file || !name) {
      return NextResponse.json({ error: 'file and name are required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('audio/') && !file.name.endsWith('.mp3')) {
      return NextResponse.json({ error: 'Only audio files are allowed' }, { status: 400 });
    }

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'mp3';
    const filename = `bgm/${storeId}/${timestamp}-${randomStr}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('model-images')
      .upload(filename, buffer, {
        contentType: file.type || 'audio/mpeg',
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[BGM] Upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('model-images')
      .getPublicUrl(filename);

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
      // Extract path from URL: .../model-images/bgm/store-id/file.mp3
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
