import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';
import { parseMp4Duration } from '@/lib/utils/parse-mp4-duration';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse duration from mp4 metadata
    const durationSec = parseMp4Duration(buffer) ?? 0;

    // Upload to Supabase Storage
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const filename = `video-clips/imports/${timestamp}-${randomStr}.mp4`;

    const { error: uploadError } = await storage
      .from('model-images')
      .upload(filename, buffer, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload Clip] Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video clip' }, { status: 500 });
    }

    const { data: urlData } = storage
      .from('model-images')
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      durationSec,
    });
  } catch (error: any) {
    console.error('[Upload Clip] Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
