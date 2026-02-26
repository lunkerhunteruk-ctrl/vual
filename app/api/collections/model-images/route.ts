import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Fetch all unique model images (for AddLookModal model tab)
export async function GET() {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ images: [] });
    }

    const { data, error } = await supabase
      .from('product_model_images')
      .select('id, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ images: [] });
      throw error;
    }

    return NextResponse.json({ images: data || [] });
  } catch (error: any) {
    console.error('Collection model-images error:', error);
    return NextResponse.json({ images: [] });
  }
}
