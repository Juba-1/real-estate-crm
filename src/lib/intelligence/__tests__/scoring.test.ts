import { describe, expect, it } from "vitest"

import {
  dictionarySimilarity,
  normalizeDictionaryValue,
} from "@/lib/dictionary-normalize"
import { resolveProfileKey } from "@/lib/intelligence/shared/profile"
import { numberSimilarity, normalizeIdentityText } from "@/lib/intelligence/shared/normalize"
import { scorePropertyRequestOpportunity } from "@/lib/intelligence/opportunities/score"
import { buildPropertyDna } from "@/lib/intelligence/identity/dna"
import { scoreSimilarity } from "@/lib/intelligence/identity/similarity"
import { parsePage } from "@/lib/pagination"

describe("dictionary normalization", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeDictionaryValue("  حي   النور  ")).toBe("حي النور")
  })

  it("scores exact and near duplicates", () => {
    expect(dictionarySimilarity("الدمام", "الدمام")).toBe(1)
    expect(dictionarySimilarity("الفيصلية", "الفيصليه")).toBeGreaterThan(0.5)
  })
})

describe("shared intelligence helpers", () => {
  it("resolves profile keys by property family", () => {
    expect(resolveProfileKey("land")).toBe("land")
    expect(resolveProfileKey("villa")).toBe("villa")
    expect(resolveProfileKey("duplex_villa")).toBe("villa")
    expect(resolveProfileKey("apartment")).toBe("apartment")
    expect(resolveProfileKey("building")).toBe("generic")
  })

  it("normalizes identity text case-insensitively", () => {
    expect(normalizeIdentityText("  Dammam ")).toBe(
      normalizeIdentityText("dammam")
    )
  })

  it("scores number similarity within tolerance", () => {
    expect(numberSimilarity(100, 100, 0.2)).toBe(1)
    expect(numberSimilarity(100, 110, 0.2)).toBeGreaterThan(0.4)
    expect(numberSimilarity(100, 0, 0.2)).toBe(0)
  })
})

describe("identity scoring", () => {
  it("scores near-identical villas highly", () => {
    const a = buildPropertyDna({
      type: "villa",
      city: "الدمام",
      neighborhood: "الفيصلية",
      area: 450,
      specs: { rooms: 5 },
    })
    const b = buildPropertyDna({
      type: "villa",
      city: "الدمام",
      neighborhood: "الفيصلية",
      area: 455,
      specs: { rooms: 5 },
    })
    const score = scoreSimilarity(a, b)
    expect(score.confidence).toBeGreaterThan(60)
  })

  it("scores different cities low", () => {
    const a = buildPropertyDna({
      type: "villa",
      city: "الدمام",
      neighborhood: "الفيصلية",
      area: 450,
    })
    const b = buildPropertyDna({
      type: "villa",
      city: "الخبر",
      neighborhood: "العقربية",
      area: 450,
    })
    const score = scoreSimilarity(a, b)
    expect(score.confidence).toBeLessThan(80)
  })
})

describe("opportunity scoring", () => {
  it("rewards in-band budget and area matches", () => {
    const score = scorePropertyRequestOpportunity(
      {
        type: "villa",
        offer_type: "sale",
        city: "الدمام",
        district: "الفيصلية",
        area: 450,
        price: 2_400_000,
      },
      {
        type: "villa",
        offer_type: "sale",
        city: "الدمام",
        district: "الفيصلية",
        area_min: 400,
        area_max: 500,
        budget_min: 2_000_000,
        budget_max: 3_000_000,
      }
    )
    expect(score.confidence).toBeGreaterThan(70)
    expect(score.level).not.toBe("none")
  })

  it("penalizes mismatched offer types", () => {
    const score = scorePropertyRequestOpportunity(
      {
        type: "apartment",
        offer_type: "sale",
        city: "الخبر",
        price: 800_000,
        area: 120,
      },
      {
        type: "apartment",
        offer_type: "rent",
        city: "الخبر",
        budget_min: 20_000,
        budget_max: 40_000,
        area_min: 100,
        area_max: 140,
      }
    )
    expect(score.confidence).toBeLessThan(85)
  })
})

describe("pagination", () => {
  it("parses page bounds safely", () => {
    expect(parsePage({ page: "2", pageSize: "24" })).toMatchObject({
      page: 2,
      pageSize: 24,
      from: 24,
      to: 47,
    })
    expect(parsePage({ page: "-1" }).page).toBe(1)
    expect(parsePage({ pageSize: "999" }).pageSize).toBeLessThanOrEqual(100)
  })
})

describe("authorization contracts (pure)", () => {
  it("documents manage rules: owner or admin only", () => {
    const canManage = (
      userId: string,
      agentId: string,
      role: string,
      sameCompany: boolean
    ) => {
      if (!sameCompany) return false
      return agentId === userId || role === "admin" || role === "super_admin"
    }

    expect(canManage("a", "a", "agent", true)).toBe(true)
    expect(canManage("a", "b", "agent", true)).toBe(false)
    expect(canManage("a", "b", "admin", true)).toBe(true)
    expect(canManage("a", "a", "agent", false)).toBe(false)
  })
})
