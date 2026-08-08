import { describe, expect, it } from "vitest"

import {
  isSafeInternalPath,
  localizeDashboardPath,
} from "@/lib/notifications/localize-path"
import { shouldPersistOpportunityReceipt } from "@/lib/intelligence/opportunities/notify/policy"
import { compareByUrgency, isCurrentlyUrgent } from "@/lib/urgent"

describe("isCurrentlyUrgent", () => {
  it("treats null and undefined as not urgent", () => {
    expect(isCurrentlyUrgent(null)).toBe(false)
    expect(isCurrentlyUrgent(undefined)).toBe(false)
  })

  it("treats future timestamps as urgent", () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(isCurrentlyUrgent(future)).toBe(true)
  })

  it("treats past timestamps as expired", () => {
    const past = new Date(Date.now() - 60_000).toISOString()
    expect(isCurrentlyUrgent(past)).toBe(false)
  })
})

describe("compareByUrgency", () => {
  it("orders urgent rows before normal rows", () => {
    const urgent: { urgent_until: string | null; created_at: string } = {
      urgent_until: new Date(Date.now() + 60_000).toISOString(),
      created_at: "2026-01-01T00:00:00.000Z",
    }
    const normal: { urgent_until: string | null; created_at: string } = {
      urgent_until: null,
      created_at: "2026-06-01T00:00:00.000Z",
    }
    expect(compareByUrgency(urgent, normal)).toBeLessThan(0)
    expect(compareByUrgency(normal, urgent)).toBeGreaterThan(0)
  })
})

describe("localizeDashboardPath", () => {
  it("prefixes locale when missing", () => {
    expect(localizeDashboardPath("en", "/dashboard/search")).toBe(
      "/en/dashboard/search"
    )
    expect(localizeDashboardPath("ar", "/dashboard/requests")).toBe(
      "/ar/dashboard/requests"
    )
  })

  it("does not double-prefix an existing locale", () => {
    expect(localizeDashboardPath("en", "/ar/dashboard")).toBe("/ar/dashboard")
  })

  it("falls back to ar for unknown locale", () => {
    expect(localizeDashboardPath("fr", "/dashboard")).toBe("/ar/dashboard")
  })
})

describe("isSafeInternalPath", () => {
  it("allows relative app paths", () => {
    expect(isSafeInternalPath("/dashboard")).toBe(true)
    expect(isSafeInternalPath("/ar/dashboard/search")).toBe(true)
  })

  it("rejects open redirects and protocols", () => {
    expect(isSafeInternalPath("https://evil.example")).toBe(false)
    expect(isSafeInternalPath("//evil.example")).toBe(false)
    expect(isSafeInternalPath("javascript:alert(1)")).toBe(false)
    expect(isSafeInternalPath(null)).toBe(false)
    expect(isSafeInternalPath("")).toBe(false)
  })
})

describe("shouldPersistOpportunityReceipt", () => {
  it("persists only when notify has no error", () => {
    expect(shouldPersistOpportunityReceipt(null)).toBe(true)
    expect(shouldPersistOpportunityReceipt({ error: "no_recipients" })).toBe(
      false
    )
    expect(shouldPersistOpportunityReceipt({ error: "Unauthorized." })).toBe(
      false
    )
  })
})
