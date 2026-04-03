import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
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

// POST: Two-step process
// Step 1: action=sign — Generate signed upload URL (service_role bypasses RLS)
// Step 2: action=register — Register metadata after client uploads to Storage
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { action } = body;

    // Step 1: Generate signed upload URL
    if (action === 'sign') {
      const { fileName, contentType } = body;
      if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = fileName.split('.').pop() || 'mp3';
      const storagePath = `bgm/${timestamp}-${randomStr}.${ext}`;

      const { data, error: signError } = await storage
        .from('model-images')
        .createSignedUploadUrl(storagePath);

      if (signError || !data) {
        console.error('[BGM] Signed URL error:', signError);
        return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
      }

      return NextResponse.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
      });
    }

    // Step 2: Register metadata after upload
    if (action === 'register') {
      const { name, path: storagePath, fileSize } = body;
      if (!name?.trim() || !storagePath) {
        return NextResponse.json({ error: 'name and path are required' }, { status: 400 });
      }

      const { data: urlData } = storage
        .from('model-images')
        .getPublicUrl(storagePath);

      const { data: track, error: insertError } = await supabase
        .from('bgm_tracks')
        .insert({
          store_id: storeId,
          name: name.trim(),
          url: urlData.publicUrl,
          file_size: fileSize || 0,
        })
        .select('id, name, url, file_size, created_at')
        .single();

      if (insertError) {
        console.error('[BGM] Insert error:', insertError);
        return NextResponse.json({ error: 'Failed to save track' }, { status: 500 });
      }

      return NextResponse.json({ success: true, track });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
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
        await storage.from('model-images').remove([match[1]]);
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
