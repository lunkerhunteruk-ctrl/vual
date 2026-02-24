import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveStoreIdFromRequest } from '@/lib/store-resolver-api';

// GET: Fetch store's LINE integration settings
export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const { data, error } = await supabase
      .from('stores')
      .select('line_channel_access_token, line_channel_id, line_bot_basic_id, line_connected_at')
      .eq('id', storeId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      hasToken: !!data.line_channel_access_token,
      lineChannelId: data.line_channel_id,
      lineBotBasicId: data.line_bot_basic_id,
      lineConnectedAt: data.line_connected_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Save LINE integration settings
export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const { channelAccessToken, channelId, botBasicId } = await request.json();

    if (!channelAccessToken) {
      return NextResponse.json({ error: 'Channel Access Token is required' }, { status: 400 });
    }

    // Verify the token by calling LINE API
    const verifyRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${channelAccessToken}` },
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: 'Channel Access Tokenが無効です。正しいトークンを入力してください。' },
        { status: 400 }
      );
    }

    const botInfo = await verifyRes.json();

    const { error } = await supabase
      .from('stores')
      .update({
        line_channel_access_token: channelAccessToken,
        line_channel_id: channelId || null,
        line_bot_basic_id: botInfo.basicId || botBasicId || null,
        line_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      botName: botInfo.displayName,
      botBasicId: botInfo.basicId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Disconnect LINE integration
export async function DELETE(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  try {
    const storeId = await resolveStoreIdFromRequest(request);
    const { error } = await supabase
      .from('stores')
      .update({
        line_channel_access_token: null,
        line_channel_id: null,
        line_bot_basic_id: null,
        line_connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', storeId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
