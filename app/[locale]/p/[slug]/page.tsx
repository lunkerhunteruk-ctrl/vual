"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ThemeSection } from "@/components/daily/ThemeSection";
import { ThemeToggle } from "@/components/daily/ThemeToggle";
import { NavPill } from "@/components/wardrobe/NavPill";
import { RecipeTryOnModal } from "@/components/daily/RecipeTryOnModal";
import { LightboxModal } from "@/components/daily/LightboxModal";
import { getCollectionsBySlug, formatCollectionDate, VaultCollection, StoreProfile } from "@/lib/daily/collections";
import { LookRecipe, VaultMedia } from "@/lib/daily/types";
import { useVaultStore } from "@/lib/daily/store";

const MONO = "'JetBrains Mono', 'SF Mono', 'Courier New', monospace";

export default function PortfolioPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "ja";
  const slug = params?.slug as string;

  const [collections, setCollections] = useState<VaultCollection[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipeTryOn, setRecipeTryOn] = useState<{ recipe: LookRecipe; imageUrl: string; bundleId: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const user = useVaultStore((s) => s.user);

  useEffect(() => {
    if (!slug) return;
    getCollectionsBySlug(slug).then(({ storeProfile, collections }) => {
      setStoreProfile(storeProfile);
      setCollections(collections);
      setLoading(false);
    });
  }, [slug]);

  const themes = collections.map((col) => ({
    id: col.id,
    date: formatCollectionDate(col),
    city: col.city,
    subtitle: col.subtitle || '',
    hasRecipe: col.hasRecipe ?? false,
    storeProfile: col.storeProfile ?? null,
    locations: [{
      id: col.id,
      name: col.city,
      implantPrompt: "",
      film: "leicaPortra800",
      media: col.media.map((m) => ({ ...m, file: m.file })),
    }],
  }));

  return (
    <div
      className="daily-vault min-h-screen"
      data-theme="light"
      style={{ background: "var(--vault-bg)", color: "var(--vault-text)", fontFamily: MONO }}
    >
      <NavPill active="feed" locale={locale} />

      {/* Portfolio header */}
      {storeProfile && !loading && (
        <div className="flex flex-col items-center pt-24 pb-8 gap-3">
          {storeProfile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={storeProfile.avatarUrl}
              alt=""
              className="rounded-full object-cover"
              style={{ width: 56, height: 56 }}
            />
          ) : (
            <div className="rounded-full" style={{ width: 56, height: 56, background: "var(--vault-border)" }} />
          )}
          <p className="text-[11px] tracking-[3px]" style={{ color: "var(--vault-text)" }}>
            {storeProfile.displayName || storeProfile.slug}
          </p>
          <div className="h-[1px] w-16" style={{ background: "var(--vault-border)" }} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div
            className="w-4 h-4 rounded-full border border-t-transparent animate-spin"
            style={{ borderColor: "var(--vault-text-dim)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {!loading && collections.length === 0 && (
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <p className="text-[10px] tracking-widest" style={{ color: "var(--vault-text-dim)" }}>
            コレクションがありません
          </p>
        </div>
      )}

      {themes.map((theme, idx) => (
        <ThemeSection
          key={theme.id}
          theme={theme}
          isLatest={idx === 0}
          hasRecipe={theme.hasRecipe}
          storeProfile={null}
          onImageClick={(img) => {
            if ((img as any).recipe) {
              setRecipeTryOn({ recipe: (img as any).recipe, imageUrl: img.file, bundleId: theme.id });
            } else {
              setLightboxSrc(img.file);
            }
          }}
          onVideoClick={() => {}}
        />
      ))}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <ThemeToggle />
      </div>

      <LightboxModal src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {recipeTryOn && (
        <RecipeTryOnModal
          lookImageUrl={recipeTryOn.imageUrl}
          recipe={recipeTryOn.recipe}
          bundleId={recipeTryOn.bundleId}
          onClose={() => setRecipeTryOn(null)}
        />
      )}
    </div>
  );
}
