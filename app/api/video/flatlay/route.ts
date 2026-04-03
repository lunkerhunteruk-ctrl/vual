import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { storage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'sign') {
      const { fileName } = body;
      if (!fileName) {
        return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
      }

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const ext = fileName.split('.').pop() || 'png';
      const storagePath = `flatlay/${timestamp}-${randomStr}.${ext}`;

      const { data, error: signError } = await storage
        .from('model-images')
        .createSignedUploadUrl(storagePath);

      if (signError || !data) {
        console.error('[Flatlay] Signed URL error:', signError);
        return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
      }

      // Get the public URL for after upload
      const { data: urlData } = storage
        .from('model-images')
        .getPublicUrl(storagePath);

      return NextResponse.json({
        signedUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
        publicUrl: urlData.publicUrl,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Flatlay] POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
