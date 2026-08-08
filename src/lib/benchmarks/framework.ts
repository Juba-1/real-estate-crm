/**
 * Reusable subsystem benchmark framework for DEERAH.
 *
 * Usage:
 *   npx tsx scripts/benchmarks/run.ts identity
 *   npx tsx scripts/benchmarks/run.ts opportunity
 *   npx tsx scripts/benchmarks/run.ts all
 *
 * Targets are design budgets — fail soft with warnings, not CI blockers yet.
 */

export type BenchmarkSample = {
  name: string
  iterations: number
  totalMs: number
  avgMs: number
  p50Ms: number
  p95Ms: number
  minMs: number
  maxMs: number
}

export type BenchmarkTarget = {
  /** Soft budget for average ms */
  avgMs: number
  /** Soft budget for p95 ms */
  p95Ms: number
}

export type BenchmarkSuiteResult = {
  suite: string
  samples: BenchmarkSample[]
  targets: Record<string, BenchmarkTarget>
  passed: boolean
  failures: string[]
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  )
  return sorted[idx] ?? 0
}

export async function runBenchmark(
  name: string,
  fn: () => void | Promise<void>,
  iterations = 200
): Promise<BenchmarkSample> {
  const times: number[] = []

  // Warmup
  for (let i = 0; i < Math.min(10, iterations); i += 1) {
    await fn()
  }

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now()
    await fn()
    times.push(performance.now() - start)
  }

  const sorted = [...times].sort((a, b) => a - b)
  const totalMs = times.reduce((sum, t) => sum + t, 0)

  return {
    name,
    iterations,
    totalMs,
    avgMs: totalMs / times.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    minMs: sorted[0] ?? 0,
    maxMs: sorted[sorted.length - 1] ?? 0,
  }
}

export function evaluateSuite(
  suite: string,
  samples: BenchmarkSample[],
  targets: Record<string, BenchmarkTarget>
): BenchmarkSuiteResult {
  const failures: string[] = []

  for (const sample of samples) {
    const target = targets[sample.name]
    if (!target) continue
    if (sample.avgMs > target.avgMs) {
      failures.push(
        `${sample.name}: avg ${sample.avgMs.toFixed(3)}ms > ${target.avgMs}ms`
      )
    }
    if (sample.p95Ms > target.p95Ms) {
      failures.push(
        `${sample.name}: p95 ${sample.p95Ms.toFixed(3)}ms > ${target.p95Ms}ms`
      )
    }
  }

  return {
    suite,
    samples,
    targets,
    passed: failures.length === 0,
    failures,
  }
}

export function formatSuite(result: BenchmarkSuiteResult): string {
  const lines = [
    `## Benchmark: ${result.suite}`,
    result.passed ? "Status: PASS" : "Status: WARN (over budget)",
    "",
    "| Sample | avg ms | p50 | p95 | target avg | target p95 |",
    "|---|---:|---:|---:|---:|---:|",
  ]

  for (const sample of result.samples) {
    const t = result.targets[sample.name]
    lines.push(
      `| ${sample.name} | ${sample.avgMs.toFixed(3)} | ${sample.p50Ms.toFixed(3)} | ${sample.p95Ms.toFixed(3)} | ${t?.avgMs ?? "-"} | ${t?.p95Ms ?? "-"} |`
    )
  }

  if (result.failures.length) {
    lines.push("", "Failures:", ...result.failures.map((f) => `- ${f}`))
  }

  return lines.join("\n")
}
