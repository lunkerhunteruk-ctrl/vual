import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/auth/line?returnTo=<url>
 * Redirects user to LINE Login OAuth authorization page.
 * Works in any browser (not dependent on LIFF SDK).
 */
export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') || 'https://vual.jp/ja';

  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: 'LINE_CHANNEL_ID not configured' }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // Store state and returnTo in a cookie for validation on callback
  const callbackData = JSON.stringify({ state, returnTo });

  const redirectUri = `${request.nextUrl.origin}/api/auth/line/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid',
    nonce,
  });

  const authUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('line-auth-state', callbackData, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutes
  });

  return response;
}
