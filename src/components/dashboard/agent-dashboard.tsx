"use client"

import {
  Building2Icon,
  CheckCircle2Icon,
  ClipboardListIcon,
  HomeIcon,
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
import { usePropertyLabels } from "@/hooks/use-property-labels"
import type { DashboardStats } from "@/lib/data/analytics"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

type AgentDashboardProps = {
  stats: DashboardStats
  displayName: string
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: number
  description: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function AgentDashboard({ stats, displayName }: AgentDashboardProps) {
  const t = useTranslations("dashboard")
  const tCommon = useTranslations("common")
  const tProps = useTranslations("properties")
  const { propertyType } = usePropertyLabels()

  const chartData = stats.typeDistribution.map((item, index) => ({
    type: item.type,
    label: propertyType(item.type),
    count: item.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }))

  const chartConfig = chartData.reduce<ChartConfig>(
    (config, item, index) => {
      config[item.type] = {
        label: item.label,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
      return config
    },
    {
      count: { label: tProps("chartCount") },
    }
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {tCommon("welcomeBack", { name: displayName })}
        </h1>
        <p className="text-sm text-muted-foreground">{t("agentSubtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("totalListings")}
          value={stats.totalProperties}
          description={t("totalListingsAgentDesc")}
          icon={Building2Icon}
        />
        <MetricCard
          title={t("available")}
          value={stats.available}
          description={t("availableDesc")}
          icon={HomeIcon}
        />
        <MetricCard
          title={t("sold")}
          value={stats.sold}
          description={t("soldDesc")}
          icon={CheckCircle2Icon}
        />
        <MetricCard
          title={t("activeRequests")}
          value={stats.activeRequests}
          description={t("activeRequestsDesc")}
          icon={ClipboardListIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("propertyTypesTitle")}</CardTitle>
          <CardDescription>{t("propertyTypesDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("propertyTypesEmpty")}
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
                    <Cell key={entry.type} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
