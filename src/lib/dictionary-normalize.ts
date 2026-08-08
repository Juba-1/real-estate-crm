/**
 * Shared dictionary string normalization.
 * Used by suggest + review flows — single source of truth.
 */

export function normalizeDictionaryValue(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFC")
}

/** Lightweight similarity for near-duplicate suggestions (0–1). */
export function dictionarySimilarity(a: string, b: string): number {
  const left = normalizeDictionaryValue(a).toLowerCase()
  const right = normalizeDictionaryValue(b).toLowerCase()

  if (!left || !right) {
    return 0
  }

  if (left === right) {
    return 1
  }

  // Containment / prefix heuristics — cheap, Arabic-friendly enough for V1.
  if (left.includes(right) || right.includes(left)) {
    const shorter = Math.min(left.length, right.length)
    const longer = Math.max(left.length, right.length)
    return shorter / longer
  }

  // Dice coefficient on bigrams
  if (left.length < 2 || right.length < 2) {
    return left[0] === right[0] ? 0.5 : 0
  }

  const bigrams = (value: string) => {
    const set = new Map<string, number>()
    for (let i = 0; i < value.length - 1; i += 1) {
      const gram = value.slice(i, i + 2)
      set.set(gram, (set.get(gram) ?? 0) + 1)
    }
    return set
  }

  const aGrams = bigrams(left)
  const bGrams = bigrams(right)
  let overlap = 0

  for (const [gram, count] of aGrams) {
    const other = bGrams.get(gram)
    if (other) {
      overlap += Math.min(count, other)
    }
  }

  return (2 * overlap) / (left.length - 1 + (right.length - 1))
}

export const DICTIONARY_SIMILARITY_THRESHOLD = 0.72
