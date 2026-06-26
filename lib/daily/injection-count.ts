import { supabase } from '@/lib/supabase';

// Extract the matchable key from a look file path
// e.g. "collections/01-06-2026_1247/look3.webp" → "01-06-2026_1247/look3"
function lookFileToKey(lookFile: string): string | null {
  const m = lookFile.match(/collections\/([^/]+\/look\d+)\./);
  return m ? m[1] : null;
}

// Kept for backward compat — callers that still call lookFileToId can use this
export function lookFileToId(file: string): string {
  const dateMatch = file.match(/(\d{2}-\d{2}-\d{4})\/look(\d+)\.\w+/);
  if (dateMatch) return `${dateMatch[1]}_look${dateMatch[2]}`;
  const namedMatch = file.match(/collections\/([^/]+)\/look(\d+)\.\w+/);
  if (namedMatch) return `${namedMatch[1]}_look${namedMatch[2]}`;
  return file.replace(/[^a-zA-Z0-9]/g, '_');
}

function seededInitialCount(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.sin(hash * 9301 + 49297) * 49297;
  return 3 + Math.floor((seed - Math.floor(seed)) * 3);
}

async function findLook(lookFile: string): Promise<{ id: string; injection_remaining: number | null; injection_initial: number | null } | null> {
  if (!supabase) return null;
  const key = lookFileToKey(lookFile);
  if (!key) return null;
  const { data } = await supabase
    .from('collection_looks')
    .select('id, injection_remaining, injection_initial')
    .ilike('image_url', `%${key}%`)
    .limit(1)
    .single();
  return data ?? null;
}

// lookFile: raw file path like "collections/01-06-2026_1247/look3.webp"
export async function getRemainingInjections(lookFile: string): Promise<number> {
  const look = await findLook(lookFile);
  if (look?.injection_remaining != null) return look.injection_remaining;
  return seededInitialCount(lookFile);
}

export async function getInjectionInfo(lookFile: string): Promise<{ remaining: number; initial: number }> {
  const look = await findLook(lookFile);
  if (look?.injection_remaining != null) {
    return {
      remaining: look.injection_remaining,
      initial: look.injection_initial ?? look.injection_remaining,
    };
  }
  const initial = seededInitialCount(lookFile);
  return { remaining: initial, initial };
}

export async function decrementInjection(lookFile: string): Promise<number> {
  if (!supabase) return -1;
  const look = await findLook(lookFile);
  if (!look) return seededInitialCount(lookFile) - 1;

  const { data, error } = await supabase.rpc('decrement_injection', { p_look_id: look.id });
  if (error) {
    console.error('decrement_injection error:', error);
    return -1;
  }
  return data ?? -1;
}
