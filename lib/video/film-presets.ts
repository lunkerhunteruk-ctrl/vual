export type EffectLevel = "off" | "weak" | "medium" | "strong";

export interface FilmEffects {
  vignette: EffectLevel;
  colorChrome: EffectLevel;
  colorChromeBlue: EffectLevel;
  grain: EffectLevel;
  colorShift: EffectLevel;
}

export interface FilmLookPreset {
  id: string;
  labelEn: string;
  labelJa: string;
  effects: FilmEffects;
}

export const DEFAULT_FILM_EFFECTS: FilmEffects = {
  vignette: "off",
  colorChrome: "off",
  colorChromeBlue: "off",
  grain: "off",
  colorShift: "off",
};

export const FILM_LOOK_PRESETS: FilmLookPreset[] = [
  {
    id: "none",
    labelEn: "None",
    labelJa: "なし",
    effects: { vignette: "off", colorChrome: "off", colorChromeBlue: "off", grain: "off", colorShift: "off" },
  },
  {
    id: "portra-400",
    labelEn: "Portra 400",
    labelJa: "Portra 400",
    effects: { vignette: "weak", colorChrome: "medium", colorChromeBlue: "off", grain: "weak", colorShift: "medium" },
  },
  {
    id: "pro-400h",
    labelEn: "Pro 400H",
    labelJa: "Pro 400H",
    effects: { vignette: "weak", colorChrome: "weak", colorChromeBlue: "medium", grain: "weak", colorShift: "weak" },
  },
  {
    id: "cinestill-800t",
    labelEn: "Cinestill 800T",
    labelJa: "Cinestill 800T",
    effects: { vignette: "medium", colorChrome: "strong", colorChromeBlue: "strong", grain: "medium", colorShift: "strong" },
  },
  {
    id: "classic-chrome",
    labelEn: "Classic Chrome",
    labelJa: "Classic Chrome",
    effects: { vignette: "medium", colorChrome: "medium", colorChromeBlue: "weak", grain: "medium", colorShift: "weak" },
  },
  {
    id: "superia-400",
    labelEn: "Superia 400",
    labelJa: "Superia 400",
    effects: { vignette: "weak", colorChrome: "strong", colorChromeBlue: "off", grain: "medium", colorShift: "medium" },
  },
];
