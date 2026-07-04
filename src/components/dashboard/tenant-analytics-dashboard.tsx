"use client"

import {
  Building2Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HomeIcon,
  UsersIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Cell, Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { TenantDashboardStats } from "@/lib/data/analytics"
import { cn } from "@/lib/utils"
import type { PropertyStatus } from "@/types/property"

const STATUS_COLORS: Record<PropertyStatus, string> = {
  available: "var(--chart-1)",
  pending: "var(--chart-4)",
  sold: "var(--chart-2)",
  rented: "var(--chart-3)",
}

type TenantAnalyticsDashboardProps = {
  stats: TenantDashboardStats
  displayName: string
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  iconWrap,
  iconColor,
}: {
  title: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  iconWrap: string
  iconColor: string
}) {
  return (
    <Card className={cn("border shadow-sm", accent)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconWrap
          )}
        >
          <Icon className={cn("size-5", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function TenantAnalyticsDashboard({
  stats,
  displayName,
}: TenantAnalyticsDashboardProps) {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const { status: statusLabel } = usePropertyLabels()

  const chartData = stats.statusDistribution.map((item) => ({
    status: item.status,
    label: statusLabel(item.status),
    count: item.count,
    fill: STATUS_COLORS[item.status],
  }))

  const chartConfig = chartData.reduce<ChartConfig>(
    (config, item) => {
      config[item.status] = {
        label: item.label,
        color: STATUS_COLORS[item.status],
      }
      return config
    },
    {
      count: { label: t("statusChartCount") },
    }
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {stats.isAdminView
            ? t("adminTitle")
            : tCommon("welcomeBack", { name: displayName })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {stats.isAdminView
            ? t("adminSubtitle", { name: displayName })
            : t("agentSubtitle")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("totalProperties")}
          value={stats.totalProperties}
          description={
            stats.isAdminView
              ? t("totalPropertiesAdminDesc")
              : t("totalPropertiesAgentDesc")
          }
          icon={Building2Icon}
          accent="border-blue-200/70 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20"
          iconWrap="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <MetricCard
          title={t("available")}
          value={stats.available}
          description={t("availableDesc")}
          icon={HomeIcon}
          accent="border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
          iconWrap="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <MetricCard
          title={t("sold")}
          value={stats.sold}
          description={t("soldDesc")}
          icon={CheckCircle2Icon}
          accent="border-violet-200/70 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20"
          iconWrap="bg-violet-500/10"
          iconColor="text-violet-600 dark:text-violet-400"
        />
        <MetricCard
          title={t("activeRequests")}
          value={stats.activeRequests}
          description={t("activeRequestsDesc")}
          icon={ClipboardListIcon}
          accent="border-amber-200/70 bg-amber-50/40 dark:border-amber-900/50 dark:bg-amber-950/20"
          iconWrap="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      <div
        className={cn(
          "grid gap-6",
          stats.isAdminView ? "lg:grid-cols-2" : "max-w-2xl"
        )}
      >
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>{t("statusDistributionTitle")}</CardTitle>
            <CardDescription>{t("statusDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("statusDistributionEmpty")}
              </p>
            ) : (
              <ChartContainer
                config={chartConfig}
                className="mx-auto h-[300px] max-h-[300px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel nameKey="label" />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {stats.isAdminView ? (
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-5 text-primary" />
                {t("agentPerformanceTitle")}
              </CardTitle>
              <CardDescription>{t("agentPerformanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0 sm:px-6 sm:pb-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("agentColumn")}</TableHead>
                    <TableHead className="text-end">
                      {t("totalListedColumn")}
                    </TableHead>
                    <TableHead className="text-end">{t("soldColumn")}</TableHead>
                    <TableHead className="text-end">
                      {t("rentedColumn")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.agentPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t("agentPerformanceEmpty")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.agentPerformance.map((agent) => (
                      <TableRow key={agent.agentId}>
                        <TableCell className="font-medium">
                          {agent.agentName}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {agent.totalProperties}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {agent.soldProperties}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {agent.rentedProperties}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
