import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Fetch store profile
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const { data, error } = await supabase
      .from('stores')
      .select('name, description, logo_url, contact_email, contact_phone, social_instagram, social_twitter, social_youtube, social_line')
      .eq('id', storeId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      name: data.name || '',
      description: data.description || '',
      logoUrl: data.logo_url || '',
      contactEmail: data.contact_email || '',
      contactPhone: data.contact_phone || '',
      socialInstagram: data.social_instagram || '',
      socialTwitter: data.social_twitter || '',
      socialYoutube: data.social_youtube || '',
      socialLine: data.social_line || '',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update store profile
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
        name: body.name || null,
        description: body.description || null,
        logo_url: body.logoUrl || null,
        contact_email: body.contactEmail || null,
        contact_phone: body.contactPhone || null,
        social_instagram: body.socialInstagram || null,
        social_twitter: body.socialTwitter || null,
        social_youtube: body.socialYoutube || null,
        social_line: body.socialLine || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
