export interface LookRecipe {
  garmentUrls: string[];
  garmentNames?: (string | null)[];
  garmentLinks?: (string | null)[];
  aspectRatio: string;
  background: string;
  location: string;
  situation: string;
  filmMode: string;
  variant: 'A' | 'B';
  gender: 'female' | 'male';
  height: number;
  ethnicity: string;
  outfitIdx?: number;
  templateId?: string;
  mode?: string;
}

export interface VaultMedia {
  file: string;          // main file (image for INJECT, or video)
  previewFile?: string;  // optional: video preview for grid display (clicks still use file)
  type: "image" | "video";
  aspect: "9:16" | "3:4" | "4:3" | "16:9" | "1:1" | "4:5";
  isHero?: boolean;
  isCatwalk?: boolean;
  recipe?: LookRecipe;
  lookId?: string;
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
