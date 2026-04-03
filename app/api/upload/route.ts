import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        error: 'Storage not configured',
        // Return a placeholder URL for development
        url: '/placeholder-image.jpg',
        mock: true
      });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'products';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${randomStr}.${extension}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error || !data) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed', details: error?.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = storage
      .from('media')
      .getPublicUrl(filename);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filename,
      filename: file.name,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
