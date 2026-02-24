import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, type UserCredential } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '@/lib/firebase';
import type { Customer } from '@/lib/types';

const googleProvider = new GoogleAuthProvider();

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|Android/i.test(navigator.userAgent);
}

async function upsertCustomer(credential: UserCredential): Promise<Customer> {
  const firebaseUser = credential.user;
  const customerRef = doc(db, COLLECTIONS.CUSTOMERS, firebaseUser.uid);
  const customerDoc = await getDoc(customerRef);

  if (customerDoc.exists()) {
    const data = customerDoc.data();
    return {
      id: firebaseUser.uid,
      email: data.email || firebaseUser.email || '',
      displayName: data.displayName || firebaseUser.displayName || '',
      photoURL: data.photoURL || firebaseUser.photoURL || undefined,
      lineUserId: data.lineUserId || undefined,
      addresses: data.addresses || [],
      orderCount: data.orderCount || 0,
      totalSpent: data.totalSpent || 0,
      isVip: data.isVip || false,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: new Date(),
    };
  }

  // Create new customer
  const newCustomer: Omit<Customer, 'id'> = {
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || undefined,
    addresses: [],
    orderCount: 0,
    totalSpent: 0,
    isVip: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await setDoc(customerRef, {
    ...newCustomer,
    authMethod: 'google',
  });

  return { id: firebaseUser.uid, ...newCustomer };
}

export async function signInWithGoogle(): Promise<Customer | null> {
  if (!auth) return null;

  if (isMobile()) {
    await signInWithRedirect(auth, googleProvider);
    return null; // redirect will reload the page
  }

  const credential = await signInWithPopup(auth, googleProvider);
  return upsertCustomer(credential);
}

export async function handleGoogleRedirectResult(): Promise<Customer | null> {
  if (!auth) return null;

  const result = await getRedirectResult(auth);
  if (!result) return null;

  return upsertCustomer(result);
}

export async function signOutGoogle(): Promise<void> {
  if (!auth) return;
  await auth.signOut();
}
