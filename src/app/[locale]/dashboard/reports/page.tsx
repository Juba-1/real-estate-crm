import { getTranslations } from "next-intl/server"

import { getAgentDetailedReports } from "@/actions/reports"
import { AgentReportsPanel } from "@/components/dashboard/agent-reports-panel"

export default async function ReportsPage() {
  const [result, t] = await Promise.all([
    getAgentDetailedReports(),
    getTranslations("reports"),
  ])

  if ("error" in result) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="print:hidden">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <AgentReportsPanel reportData={result.data} />
    </div>
  )
}
