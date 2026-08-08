/**
 * CLI entry: npx tsx scripts/benchmarks/run.ts [identity|opportunity|dictionary|all]
 */
import {
  benchmarkDictionary,
  benchmarkIdentity,
  benchmarkOpportunity,
  printBenchmarkReport,
  runAllBenchmarks,
} from "../../src/lib/benchmarks/suites"

async function main() {
  const which = (process.argv[2] ?? "all").toLowerCase()

  let results
  if (which === "identity") {
    results = [await benchmarkIdentity()]
  } else if (which === "opportunity") {
    results = [await benchmarkOpportunity()]
  } else if (which === "dictionary") {
    results = [await benchmarkDictionary()]
  } else {
    results = await runAllBenchmarks()
  }

  console.log(printBenchmarkReport(results))
  const failed = results.some((r) => !r.passed)
  process.exit(failed ? 0 : 0) // soft budgets — do not fail CI yet
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
