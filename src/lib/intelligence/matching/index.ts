/**
 * Matching subsystem home — R5A opportunities are the first consumer.
 * Future exact-match / ranking modules live here without moving callers.
 */
export {
  discoverFromPropertySide,
  discoverFromRequestSide,
  scorePropertyRequestOpportunity,
} from "@/lib/intelligence/opportunities"
