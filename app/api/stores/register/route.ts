import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';

const RESERVED_SLUGS = ['admin', 'api', 'www', 'app', 'signup', 'login', 'vual', 'help', 'support', 'blog', 'docs'];

function getFirestoreAdmin() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp({ projectId });
    }
  }
  return getFirestore();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopName, slug, ownerUid, ownerEmail } = body;

    if (!shopName || !slug || !ownerUid || !ownerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate slug
    if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 });
    }

    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ error: 'This slug is reserved' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Check slug availability
    const { data: existing } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This URL is already taken' }, { status: 409 });
    }

    // Create store in Supabase
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: shopName,
        slug,
        owner_id: ownerUid,
      })
      .select('id')
      .single();

    if (storeError) {
      console.error('Store creation error:', storeError);
      return NextResponse.json({ error: 'Failed to create store', detail: storeError.message, code: storeError.code }, { status: 500 });
    }

    // Add subdomain to Vercel automatically
    const vercelToken = process.env.VERCEL_API_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (vercelToken && vercelProjectId) {
      try {
        const domainRes = await fetch(`https://api.vercel.com/v10/projects/${vercelProjectId}/domains`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: `${slug}.vual.jp` }),
        });
        if (!domainRes.ok) {
          const domainErr = await domainRes.json();
          console.error('Vercel domain add error:', domainErr);
        }
      } catch (vercelError) {
        console.error('Vercel domain add failed:', vercelError);
        // Non-blocking: store was created, domain can be added manually
      }
    }

    // Add subdomain to Firebase Authorized Domains
    const firebaseClientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const firebasePrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (firebaseClientEmail && firebasePrivateKey && firebaseProjectId) {
      try {
        const googleAuth = new GoogleAuth({
          credentials: {
            client_email: firebaseClientEmail,
            private_key: firebasePrivateKey,
          },
          scopes: ['https://www.googleapis.com/auth/identitytoolkit', 'https://www.googleapis.com/auth/cloud-platform'],
        });
        const accessToken = await googleAuth.getAccessToken();

        // Get current config
        const configUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${firebaseProjectId}/config`;
        const configRes = await fetch(configUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (configRes.ok) {
          const config = await configRes.json();
          const currentDomains: string[] = config.authorizedDomains || [];
          const newDomain = `${slug}.vual.jp`;
          if (!currentDomains.includes(newDomain)) {
            currentDomains.push(newDomain);
            await fetch(`${configUrl}?updateMask=authorizedDomains`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ authorizedDomains: currentDomains }),
            });
          }
        }
      } catch (firebaseAuthDomainError) {
        console.error('Firebase authorized domain add failed:', firebaseAuthDomainError);
      }
    }

    // Save owner to Firestore users collection
    try {
      const db = getFirestoreAdmin();
      await db.collection('users').doc(ownerUid).set({
        email: ownerEmail,
        displayName: shopName,
        role: 'admin',
        shopId: store.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (firestoreError) {
      console.error('Firestore user creation error:', firestoreError);
      // Store was created, continue even if Firestore fails
    }

    return NextResponse.json({ storeId: store.id, slug });
  } catch (error) {
    console.error('Store registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
