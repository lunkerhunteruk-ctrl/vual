import { promises as fs } from 'fs';
import path from 'path';

// LATITUDE の号ごとのレシピの目印（data/latitude-recipes/<slug>/recipe.json）を読む。サーバーだけで使う。
// 体験「Step into this look」：ページの場面の写真＋そのLOOKの服＋見る人の顔で、その場所にいる1枚を作る。

export const RECIPE_DIR = path.join(process.cwd(), 'data', 'latitude-recipes');

export type RecipePage = { page: number; look: number | null; kind: string; scene: string | null; location: string; situation: string; film: string; aspectRatio: string | null };
export type Recipe = { issue: string; looks: Record<string, { garments: string[]; fitting: string[]; outfitText: string }>; pages: RecipePage[] };

export async function loadRecipe(slug: string): Promise<Recipe | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    return JSON.parse(await fs.readFile(path.join(RECIPE_DIR, slug, 'recipe.json'), 'utf8')) as Recipe;
  } catch {
    return null;
  }
}

// 画面に渡す最小限：どのページが体験できるか、そのLOOKの服の写真の名前
export type StepIntoPage = { page: number; look: number; garments: string[] };
export async function stepIntoPages(slug: string): Promise<StepIntoPage[]> {
  const r = await loadRecipe(slug);
  if (!r) return [];
  return r.pages
    .filter((p) => p.look && p.scene)
    .map((p) => ({ page: p.page, look: p.look as number, garments: r.looks[String(p.look)]?.garments ?? [] }));
}

// レシピの中のファイルを読む（data/latitude-recipes/<slug>/ の外は読ませない）
export async function readRecipeFile(slug: string, rel: string): Promise<Buffer | null> {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^(garments|scenes)\/[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/.test(rel)) return null;
  try {
    return await fs.readFile(path.join(RECIPE_DIR, slug, rel));
  } catch {
    return null;
  }
}

// 体験の合言葉（公開前の確認用）。本番で開けるようにする時は、ここをログインと回数の上限に置き換える
export const stepIntoAllowed = (key?: string | null) =>
  !!key && !!process.env.LATITUDE_PREVIEW_KEY && key === process.env.LATITUDE_PREVIEW_KEY;
