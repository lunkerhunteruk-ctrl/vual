import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function ensureInitialized() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim(),
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      initializeApp({ projectId });
    }
  }
}

export function getFirebaseAdminAuth() {
  ensureInitialized();
  return getAuth();
}

export function getFirebaseAdminFirestore() {
  ensureInitialized();
  return getFirestore();
}
