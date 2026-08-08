import { describe, expect, it } from "vitest"

import { decideOpportunityNotify } from "@/lib/intelligence/opportunities/notify/anti-spam"
import {
  MEANINGFUL_CONFIDENCE_DELTA,
  NOTIFY_COOLDOWN_MS,
  opportunityFingerprint,
  priorityFromOpportunity,
} from "@/lib/intelligence/opportunities/notify/policy"
import { formatMatchedReasonsAr } from "@/lib/intelligence/opportunities/notify/copy"

describe("opportunity notify policy", () => {
  it("builds stable fingerprints", () => {
    expect(opportunityFingerprint("p1", "r1")).toBe("prop:p1|req:r1")
  })

  it("maps levels to priorities", () => {
    expect(priorityFromOpportunity("excellent", 95)).toBe("critical")
    expect(priorityFromOpportunity("strong", 80)).toBe("high")
    expect(priorityFromOpportunity("potential", 60)).toBe("normal")
    expect(priorityFromOpportunity("future", 30)).toBe("low")
  })
})

describe("opportunity anti-spam", () => {
  it("notifies first strong match", () => {
    const decision = decideOpportunityNotify({
      confidence: 82,
      level: "strong",
      receipt: null,
    })
    expect(decision.notify).toBe(true)
    if (decision.notify) {
      expect(decision.eventType).toBe("new_strong")
      expect(decision.priority).toBe("high")
    }
  })

  it("suppresses below threshold", () => {
    const decision = decideOpportunityNotify({
      confidence: 60,
      level: "potential",
      receipt: null,
    })
    expect(decision).toEqual({ notify: false, reason: "below_threshold" })
  })

  it("suppresses duplicates inside cooldown without material change", () => {
    const decision = decideOpportunityNotify({
      confidence: 82,
      level: "strong",
      receipt: {
        last_confidence: 80,
        last_priority: "high",
        last_notified_at: new Date().toISOString(),
      },
      nowMs: Date.now(),
    })
    expect(decision.notify).toBe(false)
  })

  it("notifies on meaningful confidence increase", () => {
    const decision = decideOpportunityNotify({
      confidence: 76 + MEANINGFUL_CONFIDENCE_DELTA,
      level: "strong",
      receipt: {
        last_confidence: 76,
        last_priority: "high",
        last_notified_at: new Date().toISOString(),
      },
    })
    expect(decision.notify).toBe(true)
    if (decision.notify) {
      expect(decision.eventType).toBe("confidence_increased")
    }
  })

  it("notifies on priority upgrade even in cooldown", () => {
    const decision = decideOpportunityNotify({
      confidence: 95,
      level: "excellent",
      receipt: {
        last_confidence: 80,
        last_priority: "high",
        last_notified_at: new Date().toISOString(),
      },
    })
    expect(decision.notify).toBe(true)
    if (decision.notify) {
      expect(decision.eventType).toBe("priority_upgraded")
      expect(decision.priority).toBe("critical")
    }
  })

  it("notifies when becoming matchable after weak receipt", () => {
    const decision = decideOpportunityNotify({
      confidence: 78,
      level: "strong",
      receipt: {
        last_confidence: 50,
        last_priority: "normal",
        last_notified_at: new Date(
          Date.now() - NOTIFY_COOLDOWN_MS - 1000
        ).toISOString(),
      },
    })
    expect(decision.notify).toBe(true)
    if (decision.notify) {
      expect(["became_matchable", "confidence_increased", "priority_upgraded"]).toContain(
        decision.eventType
      )
    }
  })
})

describe("opportunity notify copy", () => {
  it("formats matched reasons in Arabic", () => {
    const text = formatMatchedReasonsAr([
      { key: "match_city", matched: true },
      { key: "diff_type", matched: false },
      { key: "match_budget", matched: true },
    ])
    expect(text).toContain("نفس المدينة")
    expect(text).toContain("ضمن الميزانية")
    expect(text).not.toContain("diff_type")
  })
})
