import {
  IDENTITY_VERSION,
  IDENTITY_WARN_THRESHOLD,
} from "@/lib/intelligence/identity/config"
import {
  buildPropertyDna,
  type BuildDnaInput,
} from "@/lib/intelligence/identity/dna"
import { scoreSimilarity } from "@/lib/intelligence/identity/similarity"
import type {
  AnalyzeIdentityResult,
  IdentityMatchResult,
  PropertyDna,
} from "@/types/intelligence/identity"

export type CandidateDnaRow = {
  property_id: string
  dna: PropertyDna
  type: string
  city: string
  district: string
  area: number
  agent_name: string | null
  created_at: string
}

export function analyzePropertyIdentity(
  input: BuildDnaInput,
  candidates: CandidateDnaRow[]
): AnalyzeIdentityResult {
  const sourceDna = buildPropertyDna(input)

  const matches: IdentityMatchResult[] = []

  for (const candidate of candidates) {
    const scored = scoreSimilarity(sourceDna, candidate.dna)
    if (scored.confidence < IDENTITY_WARN_THRESHOLD * 0.6) {
      continue
    }

    matches.push({
      property_id: candidate.property_id,
      confidence: scored.confidence,
      level: scored.level,
      reasons: scored.reasons,
      confidence_breakdown: scored.confidence_breakdown,
      agent_name: candidate.agent_name,
      created_at: candidate.created_at,
      type: candidate.type,
      city: candidate.city,
      district: candidate.district,
      area: candidate.area,
    })
  }

  matches.sort((a, b) => b.confidence - a.confidence)

  const top = matches[0]
  const warn = Boolean(top && top.confidence >= IDENTITY_WARN_THRESHOLD)

  return {
    matches: warn ? matches.filter((m) => m.confidence >= IDENTITY_WARN_THRESHOLD) : [],
    warn,
    identity_version: IDENTITY_VERSION,
  }
}

export {
  buildPropertyDna,
  dnaToProjection,
  resolveDistrict,
} from "@/lib/intelligence/identity/dna"
export {
  buildRequestDna,
  resolveRequestDistrict,
} from "@/lib/intelligence/identity/request-dna"
export type { BuildRequestDnaInput, RequestDna } from "@/lib/intelligence/identity/request-dna"
export {
  IDENTITY_VERSION,
  IDENTITY_WARN_THRESHOLD,
  resolveProfileKey,
} from "@/lib/intelligence/identity/config"
export { parseMapsCoordinates } from "@/lib/intelligence/identity/maps-coordinates"
export { scoreSimilarity } from "@/lib/intelligence/identity/similarity"
export type { BuildDnaInput }
