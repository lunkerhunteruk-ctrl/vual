export interface VaultMedia {
  file: string;          // main file (image for INJECT, or video)
  previewFile?: string;  // optional: video preview for grid display (clicks still use file)
  type: "image" | "video";
  aspect: "9:16" | "3:4" | "4:3" | "16:9" | "1:1";
  isHero?: boolean;
  isCatwalk?: boolean;
}

// Backward compat alias
export type VaultImage = VaultMedia;

export interface VaultLocation {
  id: string;
  name: string;
  implantPrompt: string;
  film: string;
  media: VaultMedia[];
}

export interface VaultTheme {
  id: string;
  date: string;
  city: string;
  subtitle?: string;
  locations: VaultLocation[];
}

export interface VaultEntity {
  id: string;
  name: string;
  thumbnailUrl: string;
  referenceUrl: string;
}
