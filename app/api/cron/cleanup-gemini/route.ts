import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// Vercel Cron or external scheduler calls this endpoint daily.
// Deletes expired gemini_results rows + their Storage objects.
//
// vercel.json cron config example:
// { "crons": [{ "path": "/api/cron/cleanup-gemini", "schedule": "0 4 * * *" }] }

export async function GET(request: NextRequest) {
  // Simple auth: require CRON_SECRET header or skip in development
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // 1. Call the cleanup function to get paths and delete rows
    const { data, error } = await supabase.rpc('cleanup_expired_gemini_results');

    if (error) {
      console.error('[Cleanup] RPC error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row = data?.[0] || { deleted_count: 0, deleted_paths: [] };
    const paths: string[] = row.deleted_paths || [];

    // 2. Delete storage objects in batches
    let storageDeleted = 0;
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('gemini-results')
        .remove(paths);

      if (storageError) {
        console.error('[Cleanup] Storage delete error:', storageError);
      } else {
        storageDeleted = paths.length;
      }
    }

    console.log(`[Cleanup] Deleted ${row.deleted_count} rows, ${storageDeleted} storage objects`);

    return NextResponse.json({
      deletedRows: row.deleted_count,
      deletedFiles: storageDeleted,
    });
  } catch (err) {
    console.error('[Cleanup] Error:', err);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
