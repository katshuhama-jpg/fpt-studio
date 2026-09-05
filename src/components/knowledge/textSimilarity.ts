/** Normalizes text for duplicate-question comparison: lowercase, diacritics stripped,
 * punctuation removed, whitespace collapsed. Two questions that only differ by case, accents,
 * or punctuation normalize to the same string and count as an exact match. */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Dice coefficient over character bigrams — cheap, order-sensitive-enough similarity metric
 * for short question strings. Returns 0..1; 1 means identical (after normalization). */
export function similarity(a: string, b: string): number {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };

  const ba = bigrams(na);
  const bb = bigrams(nb);
  let intersection = 0;
  for (const [bg, count] of ba) {
    const other = bb.get(bg);
    if (other) intersection += Math.min(count, other);
  }
  const totalA = [...ba.values()].reduce((s, c) => s + c, 0);
  const totalB = [...bb.values()].reduce((s, c) => s + c, 0);
  if (totalA + totalB === 0) return 0;
  return (2 * intersection) / (totalA + totalB);
}
