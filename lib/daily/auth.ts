import { GoogleAuthProvider, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

export interface VaultUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  paidCredits: number;
  freeUsed: number;
  points: number;
  createdAt: Date;
}

async function upsertUser(firebaseUser: import('firebase/auth').User): Promise<VaultUser> {
  const userRef = doc(db, 'vault_users', firebaseUser.uid);
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    const data = userDoc.data();
    return {
      id: firebaseUser.uid,
      email: data.email || firebaseUser.email || '',
      displayName: data.displayName || firebaseUser.displayName || '',
      photoURL: data.photoURL || firebaseUser.photoURL || undefined,
      paidCredits: data.paidCredits || 0,
      freeUsed: data.freeUsed || 0,
      points: data.points || 0,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };
  }

  const newUser: Omit<VaultUser, 'id'> = {
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || undefined,
    paidCredits: 0,
    freeUsed: 0,
    points: 0,
    createdAt: new Date(),
  };

  await setDoc(userRef, { ...newUser, authMethod: 'google' });
  return { id: firebaseUser.uid, ...newUser };
}

export async function signInWithGoogle(): Promise<VaultUser | null> {
  if (!auth) return null;
  const credential = await signInWithPopup(auth, googleProvider);
  return upsertUser(credential.user);
}

export async function handleGoogleRedirectResult(): Promise<VaultUser | null> {
  if (!auth) return null;
  const result = await getRedirectResult(auth);
  if (!result) return null;
  return upsertUser(result.user);
}

export async function fetchCreditsFromFirestore(userId: string): Promise<{ paidCredits: number; freeUsed: number; freeResetDate?: string; points?: number } | null> {
  if (!db) return null;
  const userRef = doc(db, 'vault_users', userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;
  const data = userDoc.data();
  return { paidCredits: data.paidCredits || 0, freeUsed: data.freeUsed || 0, freeResetDate: data.freeResetDate || undefined, points: data.points || 0 };
}

export async function syncCreditsToFirestore(userId: string, paidCredits: number, freeUsed: number, freeResetDate?: string, points?: number): Promise<void> {
  if (!db) return;
  const userRef = doc(db, 'vault_users', userId);
  const update: Record<string, unknown> = { paidCredits, freeUsed, updatedAt: new Date() };
  if (freeResetDate) update.freeResetDate = freeResetDate;
  if (points !== undefined) update.points = points;
  await updateDoc(userRef, update);
}

export async function addPointsToFirestore(userId: string, amount: number): Promise<void> {
  if (!db) return;
  const userRef = doc(db, 'vault_users', userId);
  const userDoc = await getDoc(userRef);
  const current = userDoc.exists() ? (userDoc.data().points || 0) : 0;
  await updateDoc(userRef, { points: current + amount });
}

export async function signOutVault(): Promise<void> {
  if (!auth) return;
  await auth.signOut();
}
