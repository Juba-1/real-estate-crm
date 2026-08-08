import {
  evaluateSuite,
  formatSuite,
  runBenchmark,
  type BenchmarkSuiteResult,
} from "@/lib/benchmarks/framework"
import { normalizeDictionaryValue, dictionarySimilarity } from "@/lib/dictionary-normalize"
import { resolveProfileKey } from "@/lib/intelligence/shared/profile"
import { scorePropertyRequestOpportunity } from "@/lib/intelligence/opportunities/score"
import { buildPropertyDna } from "@/lib/intelligence/identity/dna"
import { scoreSimilarity } from "@/lib/intelligence/identity/similarity"

export const PERFORMANCE_TARGETS = {
  identity_score: { avgMs: 0.5, p95Ms: 1.5 },
  opportunity_score: { avgMs: 0.3, p95Ms: 1.0 },
  dictionary_normalize: { avgMs: 0.05, p95Ms: 0.2 },
  dna_build: { avgMs: 0.4, p95Ms: 1.2 },
} as const

const sampleDnaA = buildPropertyDna({
  type: "villa",
  city: "الدمام",
  neighborhood: "الفيصلية",
  area: 450,
  google_maps_url: "https://maps.google.com/?q=26.3927,50.0814",
  specs: { rooms: 5, age: 4, street_width: 15 },
})

const sampleDnaB = buildPropertyDna({
  type: "villa",
  city: "الدمام",
  neighborhood: "الفيصلية",
  area: 460,
  google_maps_url: "https://maps.google.com/?q=26.3928,50.0815",
  specs: { rooms: 5, age: 4, street_width: 15 },
})

export async function benchmarkIdentity(): Promise<BenchmarkSuiteResult> {
  const samples = await Promise.all([
    runBenchmark("identity_score", () => {
      scoreSimilarity(sampleDnaA, sampleDnaB)
    }),
    runBenchmark("dna_build", () => {
      buildPropertyDna({
        type: "apartment",
        city: "الخبر",
        neighborhood: "العقربية",
        area: 120,
        specs: { rooms: 3, floor: 2 },
      })
    }),
  ])

  return evaluateSuite("identity", samples, {
    identity_score: PERFORMANCE_TARGETS.identity_score,
    dna_build: PERFORMANCE_TARGETS.dna_build,
  })
}

export async function benchmarkOpportunity(): Promise<BenchmarkSuiteResult> {
  const sample = await runBenchmark("opportunity_score", () => {
    scorePropertyRequestOpportunity(
      {
        type: "villa",
        offer_type: "sale",
        city: "الدمام",
        district: "الفيصلية",
        area: 450,
        price: 2_500_000,
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
    resolveProfileKey("villa")
  })

  return evaluateSuite("opportunity", [sample], {
    opportunity_score: PERFORMANCE_TARGETS.opportunity_score,
  })
}

export async function benchmarkDictionary(): Promise<BenchmarkSuiteResult> {
  const sample = await runBenchmark("dictionary_normalize", () => {
    normalizeDictionaryValue("  حي   الفيصلية  ")
    dictionarySimilarity("الفيصلية", "الفيصليه")
  })

  return evaluateSuite("dictionary", [sample], {
    dictionary_normalize: PERFORMANCE_TARGETS.dictionary_normalize,
  })
}

export async function runAllBenchmarks(): Promise<BenchmarkSuiteResult[]> {
  const results = await Promise.all([
    benchmarkIdentity(),
    benchmarkOpportunity(),
    benchmarkDictionary(),
  ])
  return results
}

export function printBenchmarkReport(results: BenchmarkSuiteResult[]): string {
  return results.map(formatSuite).join("\n\n")
}
