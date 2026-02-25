import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();

    // Verify the ID token to get the UID
    const decoded = await auth.verifyIdToken(idToken);

    // Create a custom token for the same user
    const customToken = await auth.createCustomToken(decoded.uid);

    return NextResponse.json({ customToken });
  } catch (error) {
    console.error('Custom token error:', error);
    const hasKey = !!process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    const hasEmail = !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create token',
        debug: { hasKey, hasEmail },
      },
      { status: 500 }
    );
  }
}
