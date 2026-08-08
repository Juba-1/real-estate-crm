import type { OpportunityReason } from "@/types/intelligence/opportunities"
import type {
  NotificationPriority,
  OpportunityNotifyEventType,
} from "@/lib/intelligence/opportunities/notify/policy"

/** Concise Arabic reason labels — matches existing in-app notification language. */
const REASON_AR: Record<string, string> = {
  match_type: "نوع العقار متوافق",
  match_offer: "نفس نوع العرض",
  match_city: "نفس المدينة",
  match_district: "نفس الحي",
  match_area: "المساحة ضمن النطاق",
  match_budget: "ضمن الميزانية",
  nego_area: "المساحة قريبة للتفاوض",
  nego_budget: "الميزانية قريبة للتفاوض",
}

const PRIORITY_AR: Record<NotificationPriority, string> = {
  critical: "فرصة ممتازة",
  high: "فرصة قوية",
  normal: "فرصة محتملة",
  low: "فرصة مستقبلية",
}

export function formatMatchedReasonsAr(
  reasons: OpportunityReason[],
  max = 3
): string {
  const matched = reasons
    .filter((r) => r.matched)
    .map((r) => REASON_AR[r.key] ?? r.key)
    .filter(Boolean)
    .slice(0, max)

  return matched.join(" · ")
}

export function buildGroupedOpportunityCopy(input: {
  priority: NotificationPriority
  eventType: OpportunityNotifyEventType
  count: number
  topConfidence: number
  city: string
  typeLabel: string
  reasonsSummary: string
  direction: "property_to_requests" | "request_to_properties"
}): { title: string; message: string; linkPath: string } {
  const priorityLabel = PRIORITY_AR[input.priority]
  const linkPath =
    input.direction === "property_to_requests"
      ? "/dashboard/requests"
      : "/dashboard/search"

  const whySingle =
    input.reasonsSummary ||
    (input.eventType === "confidence_increased"
      ? "تحسّن التوافق بشكل ملحوظ"
      : input.eventType === "became_matchable"
        ? "أصبح التطابق مؤهلاً للإشعار"
        : "تطابق جديد من محرك الفرص")

  if (input.count === 1) {
    return {
      title: `${priorityLabel} — ${input.typeLabel}`,
      message: `${whySingle} · ${input.city} · توافق ${Math.round(input.topConfidence)}%`,
      linkPath,
    }
  }

  return {
    title: `${priorityLabel} — ${input.count} فرص`,
    message: `أعلى توافق ${Math.round(input.topConfidence)}% · ${input.city}${
      input.reasonsSummary ? ` · ${input.reasonsSummary}` : " · تطابقات متعددة"
    }`,
    linkPath,
  }
}
