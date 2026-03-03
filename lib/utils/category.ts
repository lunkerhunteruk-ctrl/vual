/**
 * Get localized category label from category slug
 */
export function getCategoryLabel(category: string, locale: string): string {
  if (!category) return '-';
  if (category.includes('bags')) return locale === 'ja' ? 'バッグ' : 'Bags';
  if (category.includes('shoes')) return locale === 'ja' ? 'シューズ' : 'Shoes';
  if (category.includes('tops') || category.includes('blouse') || category.includes('shirt'))
    return locale === 'ja' ? 'トップス' : 'Tops';
  if (category.includes('pants')) return locale === 'ja' ? 'パンツ' : 'Pants';
  if (category.includes('skirt')) return locale === 'ja' ? 'スカート' : 'Skirts';
  if (category.includes('dress')) return locale === 'ja' ? 'ワンピース' : 'Dresses';
  if (category.includes('outer') || category.includes('jacket') || category.includes('coat'))
    return locale === 'ja' ? 'アウター' : 'Outerwear';
  if (category.includes('accessor')) return locale === 'ja' ? 'アクセサリー' : 'Accessories';
  return category.split('-').pop() || category;
}
