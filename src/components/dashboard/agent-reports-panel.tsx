"use client"

import { FileSpreadsheetIcon, PrinterIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import { formatNeighborhoodLabel } from "@/lib/property-utils"
import type {
  AgentDetailedReportsData,
  AgentReportTableRow,
} from "@/types/reports"

const ALL_AGENTS = "all"

type AgentReportsPanelProps = {
  reportData: AgentDetailedReportsData
}

function flattenReportRows(
  reportData: AgentDetailedReportsData
): AgentReportTableRow[] {
  return reportData.agents.flatMap((agent) =>
    agent.properties.map((property) => ({
      agentId: agent.agentId,
      agentName: agent.agentName,
      propertyId: property.id,
      type: property.type,
      custom_property_type: property.custom_property_type,
      neighborhood: property.neighborhood,
      custom_neighborhood: property.custom_neighborhood,
      price: property.price,
      status: property.status,
      created_at: property.created_at,
    }))
  )
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

export function AgentReportsPanel({ reportData }: AgentReportsPanelProps) {
  const t = useTranslations("reports")
  const locale = useLocale()
  const { propertyType, status, formatPrice } = usePropertyLabels()
  const [selectedAgentId, setSelectedAgentId] = useState(ALL_AGENTS)

  const allRows = useMemo(() => flattenReportRows(reportData), [reportData])

  const filteredRows = useMemo(() => {
    if (selectedAgentId === ALL_AGENTS) {
      return allRows
    }

    return allRows.filter((row) => row.agentId === selectedAgentId)
  }, [allRows, selectedAgentId])

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value))
  }

  function handleExportCsv() {
    const headers = [
      t("agentName"),
      t("propertyType"),
      t("neighborhood"),
      t("price"),
      t("status"),
      t("dateAdded"),
    ]

    const lines = [
      headers.map(escapeCsvValue).join(","),
      ...filteredRows.map((row) =>
        [
          row.agentName,
          propertyType(row.type, row.custom_property_type),
          formatNeighborhoodLabel(row.neighborhood, row.custom_neighborhood),
          row.price,
          status(row.status),
          formatDate(row.created_at),
        ]
          .map(escapeCsvValue)
          .join(",")
      ),
    ]

    const csvContent = `\uFEFF${lines.join("\n")}`
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "agent-report.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="space-y-6" id="agent-reports-print-root">
      <div className="hidden print:block">
        <h1 className="font-heading text-2xl font-semibold">{t("printTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {reportData.companyName} · {t("generatedAt")}:{" "}
          {formatDate(new Date().toISOString())}
        </p>
      </div>

      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-xs space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t("selectAgent")}
          </p>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("selectAgent")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AGENTS}>{t("allAgents")}</SelectItem>
              {reportData.agents.map((agent) => (
                <SelectItem key={agent.agentId} value={agent.agentId}>
                  {agent.agentName} ({agent.properties.length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
          >
            <FileSpreadsheetIcon className="size-4" />
            {t("exportExcel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handlePrint}
            disabled={filteredRows.length === 0}
          >
            <PrinterIcon className="size-4" />
            {t("printPdf")}
          </Button>
        </div>
      </div>

      <Card className="border-border/80 shadow-sm print:border-0 print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle>{t("tableTitle")}</CardTitle>
          <CardDescription>{t("tableDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0 print:px-0 print:pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("agentName")}</TableHead>
                <TableHead>{t("propertyType")}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t("neighborhood")}
                </TableHead>
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("dateAdded")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("emptyReport")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.propertyId}>
                    <TableCell className="font-medium">{row.agentName}</TableCell>
                    <TableCell>
                      {propertyType(row.type, row.custom_property_type)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatNeighborhoodLabel(
                        row.neighborhood,
                        row.custom_neighborhood
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatPrice(row.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{status(row.status)}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatDate(row.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
