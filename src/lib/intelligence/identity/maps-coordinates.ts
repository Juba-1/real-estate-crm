export type LatLng = { lat: number; lng: number }

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  )
}

/**
 * Best-effort parse of Google Maps / Apple Maps / generic lat,lng URLs.
 * Never throws — returns null when unparseable.
 */
export function parseMapsCoordinates(
  url: string | null | undefined
): LatLng | null {
  if (!url?.trim()) {
    return null
  }

  const raw = url.trim()

  const patterns: RegExp[] = [
    /@(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /\/search\/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/,
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)
    if (!match) {
      continue
    }
    const lat = Number(match[1])
    const lng = Number(match[2])
    if (isValidCoord(lat, lng)) {
      return { lat, lng }
    }
  }

  return null
}

/** Haversine distance in meters. */
export function distanceMeters(
  a: LatLng,
  b: LatLng
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
