import { supabase } from '@/lib/supabase';

export interface StoreProfile {
  displayName: string | null;
  avatarUrl: string | null;
  slug: string | null;
}

export interface VaultCollection {
  id: string;
  city: string;
  subtitle?: string;
  published: boolean;
  publishAt: Date | null;
  createdAt: Date;
  hasRecipe?: boolean;
  tier?: 'high' | 'daily';
  storeProfile?: StoreProfile | null;
  media: {
    file: string;
    previewFile?: string;
    type: 'image' | 'video';
    aspect: '3:4' | '4:3' | '9:16' | '16:9' | '1:1' | '4:5';
    isHero?: boolean;
    hidden?: boolean;
  }[];
}

// Map category → legacy tier for backward compat
function categoryToTier(category: string | null): 'high' | 'daily' | undefined {
  if (category === 'high_fashion') return 'high';
  if (category) return 'daily';
  return undefined;
}

export async function getPublishedCollections(tier?: 'high' | 'daily'): Promise<VaultCollection[]> {
  if (!supabase) return [];

  let q = supabase
    .from('collection_looks')
    .select(`
      id,
      image_url,
      position,
      published_at,
      category,
      bundle_id,
      recipe,
      collection_bundles!inner (
        id,
        title,
        subtitle,
        published_at,
        created_at,
        stores ( display_name, avatar_url, slug )
      )
    `)
    .eq('is_public', true)
    .not('bundle_id', 'is', null);

  if (tier === 'high') {
    q = q.eq('category', 'high_fashion');
  } else if (tier === 'daily') {
    q = q.neq('category', 'high_fashion');
  }

  const { data, error } = await q.order('published_at', { ascending: false });
  if (error || !data) return [];

  // Group by bundle_id
  const bundleMap = new Map<string, {
    bundle: { id: string; title: string; subtitle?: string; published_at: string | null; created_at: string; stores?: { display_name: string | null; avatar_url: string | null; slug: string | null } | null };
    looks: typeof data;
  }>();

  for (const look of data) {
    const b = (look as any).collection_bundles;
    if (!b) continue;
    const bId = look.bundle_id as string;
    if (!bundleMap.has(bId)) {
      bundleMap.set(bId, { bundle: b, looks: [] });
    }
    bundleMap.get(bId)!.looks.push(look);
  }

  const results: VaultCollection[] = [];
  for (const [bundleId, { bundle, looks }] of bundleMap) {
    const sortedLooks = looks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const publishAt = bundle.published_at ? new Date(bundle.published_at) : null;
    const createdAt = bundle.created_at ? new Date(bundle.created_at) : new Date();
    const firstLook = sortedLooks[0];
    const tierValue = categoryToTier((firstLook as any).category ?? null);

    const store = (bundle as any).stores;
    const storeProfile: StoreProfile | null = store
      ? { displayName: store.display_name ?? null, avatarUrl: store.avatar_url ?? null, slug: store.slug ?? null }
      : null;

    results.push({
      id: bundleId,
      city: bundle.title || '',
      subtitle: bundle.subtitle || '',
      published: true,
      publishAt,
      createdAt,
      hasRecipe: sortedLooks.some((l) => !!(l as any).recipe),
      tier: tierValue,
      storeProfile,
      media: sortedLooks.map((look, i) => ({
        file: (look as any).image_url || '',
        type: 'image' as const,
        aspect: (['3:4','9:16','1:1','16:9','4:3','4:5'].includes((look as any).recipe?.aspectRatio)
          ? (look as any).recipe.aspectRatio
          : '3:4') as '3:4' | '9:16' | '1:1' | '16:9' | '4:3' | '4:5',
        isHero: i === 0,
        recipe: (look as any).recipe ?? undefined,
        lookId: (look as any).id ?? undefined,
      })),
    });
  }

  // Sort by publishAt desc
  results.sort((a, b) => {
    const aTime = a.publishAt?.getTime() ?? a.createdAt.getTime();
    const bTime = b.publishAt?.getTime() ?? b.createdAt.getTime();
    return bTime - aTime;
  });

  return results;
}

export async function getCollectionsBySlug(slug: string): Promise<{ storeProfile: StoreProfile | null; collections: VaultCollection[] }> {
  if (!supabase) return { storeProfile: null, collections: [] };

  // Resolve store by slug
  const { data: store } = await supabase
    .from('stores')
    .select('id, display_name, avatar_url, slug')
    .eq('slug', slug)
    .single();

  if (!store) return { storeProfile: null, collections: [] };

  const storeProfile: StoreProfile = {
    displayName: (store as any).display_name ?? null,
    avatarUrl: (store as any).avatar_url ?? null,
    slug: (store as any).slug ?? null,
  };

  const { data, error } = await supabase
    .from('collection_looks')
    .select(`
      id,
      image_url,
      position,
      published_at,
      category,
      bundle_id,
      recipe,
      collection_bundles!inner (
        id,
        title,
        subtitle,
        published_at,
        created_at,
        store_id
      )
    `)
    .eq('is_public', true)
    .eq('collection_bundles.store_id', (store as any).id)
    .not('bundle_id', 'is', null);

  if (error || !data) return { storeProfile, collections: [] };

  const bundleMap = new Map<string, {
    bundle: { id: string; title: string; subtitle?: string; published_at: string | null; created_at: string };
    looks: typeof data;
  }>();

  for (const look of data) {
    const b = (look as any).collection_bundles;
    if (!b) continue;
    const bId = look.bundle_id as string;
    if (!bundleMap.has(bId)) bundleMap.set(bId, { bundle: b, looks: [] });
    bundleMap.get(bId)!.looks.push(look);
  }

  const collections: VaultCollection[] = [];
  for (const [bundleId, { bundle, looks }] of bundleMap) {
    const sortedLooks = looks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const publishAt = bundle.published_at ? new Date(bundle.published_at) : null;
    const createdAt = bundle.created_at ? new Date(bundle.created_at) : new Date();
    const firstLook = sortedLooks[0];
    const tierValue = categoryToTier((firstLook as any).category ?? null);

    collections.push({
      id: bundleId,
      city: bundle.title || '',
      subtitle: bundle.subtitle || '',
      published: true,
      publishAt,
      createdAt,
      hasRecipe: sortedLooks.some((l) => !!(l as any).recipe),
      tier: tierValue,
      storeProfile,
      media: sortedLooks.map((look, i) => ({
        file: (look as any).image_url || '',
        type: 'image' as const,
        aspect: (['3:4','9:16','1:1','16:9','4:3','4:5'].includes((look as any).recipe?.aspectRatio)
          ? (look as any).recipe.aspectRatio
          : '3:4') as '3:4' | '9:16' | '1:1' | '16:9' | '4:3' | '4:5',
        isHero: i === 0,
        recipe: (look as any).recipe ?? undefined,
        lookId: (look as any).id ?? undefined,
      })),
    });
  }

  collections.sort((a, b) => {
    const aTime = a.publishAt?.getTime() ?? a.createdAt.getTime();
    const bTime = b.publishAt?.getTime() ?? b.createdAt.getTime();
    return bTime - aTime;
  });

  return { storeProfile, collections };
}

export function formatCollectionDate(col: VaultCollection): string {
  const d = col.publishAt || col.createdAt;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
