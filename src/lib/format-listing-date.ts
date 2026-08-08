/**
 * Formats a property listing timestamp as:
 * "12 July 2026 • 03:45 PM"
 * Uses locale-aware month names (Arabic or English). Never relative.
 */
export function formatListingDate(
  isoDate: string,
  locale: string
): string {
  const date = new Date(isoDate)
  const dateLocale = locale === "ar" ? "ar-SA" : "en-GB"

  const datePart = new Intl.DateTimeFormat(dateLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)

  const timePart = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)

  return `${datePart} • ${timePart}`
}
