import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET: Fetch saved VTON results
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data: results, error } = await supabase
      .from('vton_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results: results || [],
    });
  } catch (error) {
    console.error('VTON Results GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a saved result
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Result ID is required' },
        { status: 400 }
      );
    }

    // Get the result to find the image URL
    const { data: result } = await supabase
      .from('vton_results')
      .select('image_url')
      .eq('id', id)
      .single();

    if (result?.image_url) {
      // Extract filename from URL and delete from storage
      const filename = result.image_url.split('/').pop();
      if (filename) {
        await supabase.storage
          .from('vton-results')
          .remove([filename]);
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('vton_results')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete result' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Result deleted successfully',
    });
  } catch (error) {
    console.error('VTON Results DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
