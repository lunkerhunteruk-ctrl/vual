import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Fetch store policy settings
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const { data, error } = await supabase
      .from('stores')
      .select('shipping_policy, free_shipping_threshold, cod_policy, return_policy')
      .eq('id', storeId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      shippingPolicy: data.shipping_policy || '',
      freeShippingThreshold: data.free_shipping_threshold || null,
      codPolicy: data.cod_policy || '',
      returnPolicy: data.return_policy || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update store policy settings
export async function PUT(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const body = await request.json();

    const { error } = await supabase
      .from('stores')
      .update({
        shipping_policy: body.shippingPolicy || null,
        free_shipping_threshold: body.freeShippingThreshold || null,
        cod_policy: body.codPolicy || null,
        return_policy: body.returnPolicy || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Policies updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
