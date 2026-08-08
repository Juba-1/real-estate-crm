export {
  OPPORTUNITY_ALGORITHM_VERSION,
  OPPORTUNITY_CANDIDATE_LIMIT,
  OPPORTUNITY_LEVEL_THRESHOLDS,
  OPPORTUNITY_WEIGHTS,
  levelFromConfidence,
} from "@/lib/intelligence/opportunities/config"
export {
  discoverFromPropertySide,
  discoverFromRequestSide,
} from "@/lib/intelligence/opportunities/discover"
export { scorePropertyRequestOpportunity } from "@/lib/intelligence/opportunities/score"
export { groupOpportunities, buildEmptyGuidance } from "@/lib/intelligence/opportunities/explain"
export {
  decideOpportunityNotify,
} from "@/lib/intelligence/opportunities/notify/anti-spam"
export {
  opportunityFingerprint,
  priorityFromOpportunity,
  NOTIFY_MIN_CONFIDENCE,
} from "@/lib/intelligence/opportunities/notify/policy"
