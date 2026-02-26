import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/line/callback?code=...&state=...
 * Exchanges authorization code for access token, gets profile,
 * and redirects to the original page with lineAuth params.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  // Validate state from cookie
  const cookieValue = request.cookies.get('line-auth-state')?.value;
  if (!cookieValue) {
    console.error('LINE auth: missing state cookie');
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  let storedState: string;
  let returnTo: string;
  try {
    const parsed = JSON.parse(cookieValue);
    storedState = parsed.state;
    returnTo = parsed.returnTo || 'https://vual.jp/ja';
  } catch {
    console.error('LINE auth: invalid state cookie');
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  if (state !== storedState) {
    console.error('LINE auth: state mismatch');
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    console.error('LINE auth: missing channel credentials');
    return NextResponse.redirect(new URL('/ja', request.url));
  }

  try {
    // Exchange code for access token (must match the redirect_uri sent in /api/auth/line)
    const redirectUri = 'https://vual.jp/api/auth/line/callback';
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('LINE token exchange failed:', errText);
      return NextResponse.redirect(new URL('/ja', request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user profile
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileResponse.ok) {
      console.error('LINE profile fetch failed:', profileResponse.status);
      return NextResponse.redirect(new URL(returnTo));
    }

    const profile = await profileResponse.json();

    // Build redirect URL with profile params
    const url = new URL(returnTo);
    // Validate domain
    if (!url.hostname.endsWith('.vual.jp') && url.hostname !== 'vual.jp' && url.hostname !== 'localhost') {
      return NextResponse.redirect(new URL('/ja', request.url));
    }

    url.searchParams.set('lineUserId', profile.userId);
    url.searchParams.set('lineDisplayName', profile.displayName);
    if (profile.pictureUrl) {
      url.searchParams.set('linePhoto', profile.pictureUrl);
    }
    url.searchParams.set('lineAuth', '1');

    const response = NextResponse.redirect(url.toString());
    // Clear the state cookie
    response.cookies.delete('line-auth-state');
    return response;
  } catch (err) {
    console.error('LINE auth callback error:', err);
    return NextResponse.redirect(new URL(returnTo || '/ja', request.url));
  }
}
