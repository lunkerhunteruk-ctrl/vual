import { collection, getDocs, addDoc, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface VaultGeneration {
  id?: string;
  userId: string;
  imageUrl: string;
  lookFile: string;
  city: string;
  createdAt: Date;
}

export async function getUserGenerations(userId: string): Promise<VaultGeneration[]> {
  if (!db) return [];
  const q = query(
    collection(db, 'vault_user_generations'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  const results: VaultGeneration[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    results.push({
      id: d.id,
      userId: data.userId,
      imageUrl: data.imageUrl,
      lookFile: data.lookFile || '',
      city: data.city || '',
      createdAt: data.createdAt?.toDate?.() || new Date(),
    });
  });
  return results;
}

export async function saveGenerationRecord(gen: Omit<VaultGeneration, 'id' | 'createdAt'>): Promise<string> {
  if (!db) throw new Error('No database');
  const ref = await addDoc(collection(db, 'vault_user_generations'), {
    ...gen,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}
