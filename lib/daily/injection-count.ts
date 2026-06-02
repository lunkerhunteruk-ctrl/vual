import { doc, getDoc, setDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function lookFileToId(file: string): string {
  const dateMatch = file.match(/(\d{2}-\d{2}-\d{4})\/look(\d+)\.\w+/);
  if (dateMatch) return `${dateMatch[1]}_look${dateMatch[2]}`;
  const namedMatch = file.match(/collections\/([^/]+)\/look(\d+)\.\w+/);
  if (namedMatch) return `${namedMatch[1]}_look${namedMatch[2]}`;
  return file.replace(/[^a-zA-Z0-9]/g, '_');
}

function seededInitialCount(lookId: string): number {
  let hash = 0;
  for (let i = 0; i < lookId.length; i++) {
    hash = ((hash << 5) - hash) + lookId.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.sin(hash * 9301 + 49297) * 49297;
  return 3 + Math.floor((seed - Math.floor(seed)) * 3);
}

export async function getRemainingInjections(lookId: string): Promise<number> {
  if (!db) return 0;
  const ref = doc(db, 'injection_counts', lookId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data().remaining ?? 0;
  }
  const initial = seededInitialCount(lookId);
  await setDoc(ref, { remaining: initial, initial, createdAt: new Date() });
  return initial;
}

export async function getInjectionInfo(lookId: string): Promise<{ remaining: number; initial: number }> {
  if (!db) return { remaining: 0, initial: 0 };
  const ref = doc(db, 'injection_counts', lookId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return { remaining: data.remaining ?? 0, initial: data.initial ?? data.remaining ?? 0 };
  }
  const initial = seededInitialCount(lookId);
  await setDoc(ref, { remaining: initial, initial, createdAt: new Date() });
  return { remaining: initial, initial };
}

export async function decrementInjection(lookId: string): Promise<number> {
  if (!db) return -1;
  const ref = doc(db, 'injection_counts', lookId);

  try {
    const newRemaining = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) {
        const initial = seededInitialCount(lookId);
        transaction.set(ref, { remaining: initial - 1, initial, createdAt: new Date() });
        return initial - 1;
      }
      const current = snap.data().remaining ?? 0;
      if (current <= 0) return -1;
      transaction.update(ref, { remaining: current - 1 });
      return current - 1;
    });
    return newRemaining;
  } catch (err) {
    console.error('Failed to decrement injection:', err);
    return -1;
  }
}
