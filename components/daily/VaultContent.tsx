"use client";

import { useState, useEffect } from "react";
import { ThemeSection } from "./ThemeSection";
import { ImplantModal } from "./ImplantModal";
import { RecipeTryOnModal } from "./RecipeTryOnModal";
import { VaultMedia, LookRecipe } from "@/lib/daily/types";
import { sampleEntities } from "@/lib/daily/sample";
import { handleGoogleRedirectResult, fetchCreditsFromFirestore } from "@/lib/daily/auth";
import { useVaultStore } from "@/lib/daily/store";
import { UserBadge } from "./UserBadge";
import { VideoModal } from "./VideoModal";
import { getPublishedCollections, formatCollectionDate, VaultCollection } from "@/lib/daily/collections";
import { LightboxModal } from "./LightboxModal";

export function VaultContent({ tier }: { tier?: 'high' | 'daily' } = {}) {
  const [collections, setCollections] = useState<VaultCollection[]>([]);
  const [selectedImage, setSelectedImage] = useState<
    (VaultMedia & { locationId: string }) | null
  >(null);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedTotalLooks, setSelectedTotalLooks] = useState<number>(12);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [selectedHasRecipe, setSelectedHasRecipe] = useState(false);
  const [recipeTryOn, setRecipeTryOn] = useState<{ recipe: LookRecipe; imageUrl: string } | null>(null);
  const setUser = useVaultStore((s) => s.setUser);
  const addPaidCredits = useVaultStore((s) => s.addPaidCredits);
  const user = useVaultStore((s) => s.user);
  const syncCredits = useVaultStore((s) => s.syncFromFirestore);

  // Fetch published collections with tier="daily" filter
  useEffect(() => {
    getPublishedCollections(tier).then(setCollections);
  }, []);

  useEffect(() => {
    handleGoogleRedirectResult().then((u) => {
      if (u) setUser(u);
    });
  }, [setUser]);

  useEffect(() => {
    if (user?.id) {
      fetchCreditsFromFirestore(user.id).then((credits) => {
        if (credits) syncCredits(credits.paidCredits, credits.freeUsed, credits.freeResetDate, credits.points);
      });
    }
  }, [user?.id, syncCredits]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("credit_success") === "true") {
      const credits = parseInt(params.get("credits") || "0", 10);
      if (credits > 0) {
        addPaidCredits(credits);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("credit_canceled") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [addPaidCredits]);

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
    <>
      <UserBadge />

      {themes.map((theme, idx) => (
        <ThemeSection
          key={theme.id}
          theme={theme}
          isLatest={idx === 0}
          hasRecipe={theme.hasRecipe}
          storeProfile={theme.storeProfile}
          onImageClick={(img) => {
            if (img.recipe) {
              setRecipeTryOn({ recipe: img.recipe, imageUrl: img.file });
            } else if (theme.hasRecipe) {
              setSelectedImage(img);
              setSelectedCity(theme.city);
              setSelectedHasRecipe(true);
              setSelectedTotalLooks(theme.locations.flatMap(l => l.media).filter(m => m.type === "image").length);
            } else {
              setLightboxSrc(img.file);
            }
          }}
          onVideoClick={setVideoSrc}
        />
      ))}

      <VideoModal src={videoSrc} onClose={() => setVideoSrc(null)} />

      <ImplantModal
        image={selectedImage}
        entities={sampleEntities}
        themeCity={selectedCity}
        totalLooks={selectedTotalLooks}
        onClose={() => { setSelectedImage(null); setSelectedHasRecipe(false); }}
      />

      <LightboxModal
        src={lightboxSrc}
        onClose={() => setLightboxSrc(null)}
      />

      {recipeTryOn && (
        <RecipeTryOnModal
          lookImageUrl={recipeTryOn.imageUrl}
          recipe={recipeTryOn.recipe}
          onClose={() => setRecipeTryOn(null)}
        />
      )}
    </>
  );
}
