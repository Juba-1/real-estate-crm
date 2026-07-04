"use client"

import {
  Building2Icon,
  CircleDollarSignIcon,
  HomeIcon,
  KeyRoundIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
import type { DashboardStats } from "@/lib/data/analytics"

type AdminDashboardProps = {
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
  value: string | number
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
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function AdminDashboard({ stats, displayName }: AdminDashboardProps) {
  const t = useTranslations("dashboard")
  const tProps = useTranslations("properties")
  const { propertyType, formatPrice } = usePropertyLabels()

  const chartConfig = {
    count: {
      label: tProps("chartCount"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const chartData = stats.typeDistribution.map((item) => ({
    label: propertyType(item.type),
    count: item.count,
  }))

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("adminTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("adminSubtitle", { name: displayName })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("totalListings")}
          value={stats.totalProperties}
          description={t("totalListingsAdminDesc")}
          icon={Building2Icon}
        />
        <MetricCard
          title={t("sold")}
          value={stats.sold}
          description={t("soldAdminDesc")}
          icon={HomeIcon}
        />
        <MetricCard
          title={t("rented")}
          value={stats.rented}
          description={t("rentedDesc")}
          icon={KeyRoundIcon}
        />
        <MetricCard
          title={t("closedDealValue")}
          value={formatPrice(stats.closedDealsValue)}
          description={t("closedDealValueDesc")}
          icon={CircleDollarSignIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("listingsByTypeTitle")}</CardTitle>
          <CardDescription>{t("listingsByTypeDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("listingsByTypeEmpty")}
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("topAgentsTitle")}</CardTitle>
          <CardDescription>{t("topAgentsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-(--card-spacing)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("agentColumn")}</TableHead>
                <TableHead className="text-end">{t("addedColumn")}</TableHead>
                <TableHead className="text-end">{t("soldColumn")}</TableHead>
                <TableHead className="text-end">{t("rentedColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.agentPerformance.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("topAgentsEmpty")}
                  </TableCell>
                </TableRow>
              ) : (
                stats.agentPerformance.map((agent) => (
                  <TableRow key={agent.agentId}>
                    <TableCell className="font-medium">
                      {agent.agentName}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {agent.totalAdded}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {agent.totalSold}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {agent.totalRented}
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
