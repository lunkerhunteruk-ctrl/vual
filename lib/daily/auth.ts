import { GoogleAuthProvider, signInWithPopup, getRedirectResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

const googleProvider = new GoogleAuthProvider();

export interface VaultUser {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  paidCredits: number;
  freeUsed: number;
  points: number;
  earnedCredits: number;
  createdAt: Date;
}

async function upsertUser(firebaseUser: import('firebase/auth').User): Promise<VaultUser> {
  const fallback: VaultUser = {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || undefined,
    paidCredits: 0,
    freeUsed: 0,
    points: 0,
    earnedCredits: 0,
    createdAt: new Date(),
  };
  if (!supabase) return fallback;

  const { data } = await supabase
    .from('consumer_credits')
    .select('paid_credits, free_tickets_remaining, free_tickets_reset_at, points, created_at')
    .eq('firebase_uid', firebaseUser.uid)
    .single();

  if (data) {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || '',
      photoURL: firebaseUser.photoURL || undefined,
      paidCredits: data.paid_credits ?? 0,
      freeUsed: Math.max(0, 3 - (data.free_tickets_remaining ?? 3)),
      points: data.points ?? 0,
      earnedCredits: (data as any).earned_credits ?? 0,
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
    };
  }

  // New user — insert row
  const resetAt = new Date();
  resetAt.setDate(resetAt.getDate() + 1);
  resetAt.setHours(0, 0, 0, 0);

  const { data: inserted } = await supabase
    .from('consumer_credits')
    .insert({
      firebase_uid: firebaseUser.uid,
      free_tickets_remaining: 0,
      free_tickets_reset_at: resetAt.toISOString(),
      paid_credits: 16,
      subscription_credits: 0,
      points: 0,
    })
    .select('created_at')
    .single();

  return { ...fallback, createdAt: inserted?.created_at ? new Date(inserted.created_at) : new Date() };
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

export async function fetchCreditsFromSupabase(
  userId: string
): Promise<{ paidCredits: number; freeUsed: number; freeResetDate?: string; points?: number; faceImageUrl?: string; earnedCredits: number } | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from('consumer_credits')
    .select('paid_credits, free_tickets_remaining, free_tickets_reset_at, points, face_image_url, earned_credits')
    .eq('firebase_uid', userId)
    .single();
  if (!data) return null;

  const resetAt = data.free_tickets_reset_at ? new Date(data.free_tickets_reset_at) : null;
  return {
    paidCredits: data.paid_credits ?? 0,
    freeUsed: Math.max(0, 3 - (data.free_tickets_remaining ?? 3)),
    freeResetDate: resetAt ? resetAt.toISOString().slice(0, 10) : undefined,
    points: data.points ?? 0,
    faceImageUrl: data.face_image_url ?? undefined,
    earnedCredits: (data as any).earned_credits ?? 0,
  };
}

export async function syncEarnedCreditsToSupabase(userId: string, earnedCredits: number): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('consumer_credits')
    .update({ earned_credits: Math.max(0, earnedCredits), updated_at: new Date().toISOString() })
    .eq('firebase_uid', userId);
}

export const syncEarnedCreditsToFirestore = syncEarnedCreditsToSupabase;

// Backward-compat alias (VaultContent imports this name)
export const fetchCreditsFromFirestore = fetchCreditsFromSupabase;

export async function syncCreditsToSupabase(
  userId: string,
  paidCredits: number,
  _freeUsed: number,
  _freeResetDate?: string,
  points?: number
): Promise<void> {
  if (!supabase) return;
  const update: Record<string, unknown> = {
    paid_credits: paidCredits,
    updated_at: new Date().toISOString(),
  };
  if (points !== undefined) update.points = points;
  await supabase.from('consumer_credits').update(update).eq('firebase_uid', userId);
}

// Backward-compat alias (store.ts imports this name)
export const syncCreditsToFirestore = syncCreditsToSupabase;

export async function addPointsToSupabase(userId: string, amount: number): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase
    .from('consumer_credits')
    .select('points')
    .eq('firebase_uid', userId)
    .single();
  const current = data?.points ?? 0;
  await supabase
    .from('consumer_credits')
    .update({ points: current + amount, updated_at: new Date().toISOString() })
    .eq('firebase_uid', userId);
}

// Backward-compat alias (store.ts imports this name)
export const addPointsToFirestore = addPointsToSupabase;

export async function signOutVault(): Promise<void> {
  if (!auth) return;
  await auth.signOut();
}
