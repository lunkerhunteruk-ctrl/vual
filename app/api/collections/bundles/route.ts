import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// POST: Create a bundle from selected look IDs
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { lookIds } = body as { lookIds: string[] };

    if (!lookIds || lookIds.length < 2) {
      return NextResponse.json({ error: 'At least 2 look IDs required' }, { status: 400 });
    }

    // Verify looks exist, belong to this store, and aren't already bundled
    const { data: existingLooks, error: lookError } = await supabase
      .from('collection_looks')
      .select('id, bundle_id, position')
      .eq('store_id', storeId)
      .in('id', lookIds);

    if (lookError) throw lookError;

    if (!existingLooks || existingLooks.length !== lookIds.length) {
      return NextResponse.json({ error: 'Some looks not found' }, { status: 404 });
    }

    const alreadyBundled = existingLooks.filter(l => l.bundle_id);
    if (alreadyBundled.length > 0) {
      return NextResponse.json({ error: 'Some looks are already in a bundle' }, { status: 400 });
    }

    // Use the minimum position of selected looks for bundle position
    const minPosition = Math.min(...existingLooks.map(l => l.position));

    // Create bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('collection_bundles')
      .insert({ store_id: storeId, position: minPosition })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Assign looks to bundle with positions matching lookIds order
    for (let i = 0; i < lookIds.length; i++) {
      const { error } = await supabase
        .from('collection_looks')
        .update({ bundle_id: bundle.id, bundle_position: i })
        .eq('id', lookIds[i]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true, bundleId: bundle.id });
  } catch (error: any) {
    console.error('[Bundles] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Disband a bundle (unlink looks, delete bundle record)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Bundle ID required' }, { status: 400 });
    }

    // Unlink all looks from this bundle
    const { error: unlinkError } = await supabase
      .from('collection_looks')
      .update({ bundle_id: null, bundle_position: 0 })
      .eq('bundle_id', id);

    if (unlinkError) throw unlinkError;

    // Delete bundle record
    const { error: deleteError } = await supabase
      .from('collection_bundles')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bundles] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Add or remove a single look from a bundle
export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();
    const { bundleId, action, lookId } = body as { bundleId: string; action: 'add' | 'remove'; lookId: string };

    if (!bundleId || !action || !lookId) {
      return NextResponse.json({ error: 'bundleId, action, and lookId required' }, { status: 400 });
    }

    if (action === 'add') {
      // Verify look exists, belongs to this store, and isn't already bundled
      const { data: look, error: lookError } = await supabase
        .from('collection_looks')
        .select('id, bundle_id')
        .eq('id', lookId)
        .eq('store_id', storeId)
        .single();

      if (lookError || !look) {
        return NextResponse.json({ error: 'Look not found' }, { status: 404 });
      }
      if (look.bundle_id) {
        return NextResponse.json({ error: 'Look is already in a bundle' }, { status: 400 });
      }

      // Get max bundle_position in this bundle
      const { data: bundleLooks } = await supabase
        .from('collection_looks')
        .select('bundle_position')
        .eq('bundle_id', bundleId)
        .order('bundle_position', { ascending: false })
        .limit(1);

      const nextPos = (bundleLooks?.[0]?.bundle_position ?? -1) + 1;

      const { error: updateError } = await supabase
        .from('collection_looks')
        .update({ bundle_id: bundleId, bundle_position: nextPos })
        .eq('id', lookId);

      if (updateError) throw updateError;

    } else if (action === 'remove') {
      // Count how many looks remain in this bundle
      const { count } = await supabase
        .from('collection_looks')
        .select('id', { count: 'exact', head: true })
        .eq('bundle_id', bundleId);

      // Unlink the look
      const { error: updateError } = await supabase
        .from('collection_looks')
        .update({ bundle_id: null, bundle_position: 0 })
        .eq('id', lookId)
        .eq('bundle_id', bundleId);

      if (updateError) throw updateError;

      // If only 1 look remains after removal, auto-disband the bundle
      if (count !== null && count <= 2) {
        await supabase
          .from('collection_looks')
          .update({ bundle_id: null, bundle_position: 0 })
          .eq('bundle_id', bundleId);

        await supabase
          .from('collection_bundles')
          .delete()
          .eq('id', bundleId);

        return NextResponse.json({ success: true, disbanded: true });
      }

      // Re-sequence bundle_positions
      const { data: remaining } = await supabase
        .from('collection_looks')
        .select('id')
        .eq('bundle_id', bundleId)
        .order('bundle_position', { ascending: true });

      if (remaining) {
        for (let i = 0; i < remaining.length; i++) {
          await supabase
            .from('collection_looks')
            .update({ bundle_position: i })
            .eq('id', remaining[i].id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bundles] PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Reorder looks within a bundle
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { bundleId, lookIds } = body as { bundleId: string; lookIds: string[] };

    if (!bundleId || !lookIds) {
      return NextResponse.json({ error: 'bundleId and lookIds required' }, { status: 400 });
    }

    // Update bundle_position for each look
    for (let i = 0; i < lookIds.length; i++) {
      const { error } = await supabase
        .from('collection_looks')
        .update({ bundle_position: i })
        .eq('id', lookIds[i])
        .eq('bundle_id', bundleId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Bundles] PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
