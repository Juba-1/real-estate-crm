export const AGENCY_AUTH_EMAIL_DOMAIN = "@agency.local"

export function resolveAuthEmail(identifier: string): string {
  const trimmed = identifier.trim()

  if (!trimmed) {
    return trimmed
  }

  if (trimmed.includes("@")) {
    return trimmed
  }

  return `${trimmed.toLowerCase()}${AGENCY_AUTH_EMAIL_DOMAIN}`
}
