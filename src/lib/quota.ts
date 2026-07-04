export const QUOTA_EXCEEDED = "QUOTA_EXCEEDED" as const

export type QuotaExceededResult = {
  error: typeof QUOTA_EXCEEDED
  message: string
}

export function isQuotaExceededResult(
  result: { error: string; message?: string } | null | undefined
): result is QuotaExceededResult {
  return result?.error === QUOTA_EXCEEDED
}
