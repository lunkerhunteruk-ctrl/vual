import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface VaultCollection {
  id: string;
  city: string;
  subtitle?: string;
  published: boolean;
  publishAt: Date | null;
  createdAt: Date;
  hasRecipe?: boolean;
  tier?: "high" | "daily";
  media: {
    file: string;
    previewFile?: string;
    type: "image" | "video";
    aspect: "3:4" | "4:3" | "9:16" | "16:9" | "1:1";
    isHero?: boolean;
    hidden?: boolean;
  }[];
}

// Fetch published collections filtered by tier
export async function getPublishedCollections(tier?: "high" | "daily"): Promise<VaultCollection[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'vault_collections'));
  const now = new Date();
  const results: VaultCollection[] = [];

  snapshot.forEach((d) => {
    const data = d.data();
    const publishAt = data.publishAt?.toDate?.() || null;
    const published = data.published ?? false;

    // Show if published=true AND (no schedule OR schedule has passed)
    if (published && (!publishAt || publishAt <= now)) {
      const docTier = data.tier || undefined;

      // Tier filter
      if (tier && docTier !== tier) return;

      results.push({
        id: d.id,
        city: data.city || '',
        subtitle: data.subtitle || '',
        published,
        publishAt,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        hasRecipe: data.hasRecipe ?? false,
        tier: docTier,
        media: (data.media || []).filter((m: any) => !m.hidden),
      });
    }
  });

  // Sort by publishAt descending (newest first)
  results.sort((a, b) => {
    const aTime = a.publishAt?.getTime() || a.createdAt.getTime();
    const bTime = b.publishAt?.getTime() || b.createdAt.getTime();
    return bTime - aTime;
  });

  return results;
}

// Format publishAt date for display: "5.27"
export function formatCollectionDate(col: VaultCollection): string {
  const d = col.publishAt || col.createdAt;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}
