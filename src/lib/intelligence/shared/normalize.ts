import { normalizeDictionaryValue } from "@/lib/dictionary-normalize"

/** Shared text normalization for Intelligence domains (identity, opportunity, matching). */
export function normalizeIdentityText(raw: string): string {
  return normalizeDictionaryValue(raw).toLowerCase()
}

export function textsEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a?.trim() || !b?.trim()) {
    return false
  }
  return normalizeIdentityText(a) === normalizeIdentityText(b)
}

export function numberSimilarity(
  a: number,
  b: number,
  toleranceRatio: number
): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    return 0
  }
  const diff = Math.abs(a - b)
  const avg = (a + b) / 2
  const ratio = diff / avg
  if (ratio <= toleranceRatio * 0.25) {
    return 1
  }
  if (ratio >= toleranceRatio) {
    return Math.max(0, 1 - ratio / (toleranceRatio * 2))
  }
  return 1 - ratio / toleranceRatio
}
