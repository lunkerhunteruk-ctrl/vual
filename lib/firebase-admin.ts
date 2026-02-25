import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function ensureInitialized() {
  if (!getApps().length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (privateKey) {
      // Handle various formats of private key from env vars
      privateKey = privateKey.replace(/\\n/g, '\n');
      // Remove surrounding quotes if present
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n');
      }

      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
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
