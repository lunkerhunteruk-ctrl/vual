import { supabase } from '@/lib/supabase';

export interface VaultGeneration {
  id?: string;
  userId: string;
  imageUrl: string;
  lookFile: string;
  city: string;
  createdAt: Date;
}

export async function getUserGenerations(userId: string): Promise<VaultGeneration[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('user_generations')
    .select('id, firebase_uid, image_url, look_file, city, created_at')
    .eq('firebase_uid', userId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return data.map((row) => ({
    id: row.id,
    userId: row.firebase_uid,
    imageUrl: row.image_url,
    lookFile: row.look_file || '',
    city: row.city || '',
    createdAt: new Date(row.created_at),
  }));
}

export async function saveGenerationRecord(gen: Omit<VaultGeneration, 'id' | 'createdAt'>): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('user_generations')
    .insert({
      firebase_uid: gen.userId,
      image_url: gen.imageUrl,
      look_file: gen.lookFile || null,
      city: gen.city || null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}
