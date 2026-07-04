"use client"

import { useLocale, useTranslations } from "next-intl"
import { useMemo } from "react"
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
import type { PlatformGrowthPoint } from "@/lib/data/super-admin"

type PlatformGrowthChartProps = {
  data: PlatformGrowthPoint[]
}

export function PlatformGrowthChart({ data }: PlatformGrowthChartProps) {
  const t = useTranslations("superAdmin")
  const locale = useLocale()

  const chartConfig = {
    companies: {
      label: t("chartCompaniesLabel"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const chartData = useMemo(
    () =>
      data.map((point) => ({
        label: new Date(point.year, point.month - 1, 1).toLocaleDateString(
          locale === "ar" ? "ar-SA" : "en-US",
          { month: "short" }
        ),
        companies: point.companies,
      })),
    [data, locale]
  )

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{t("platformGrowthTitle")}</CardTitle>
        <CardDescription>{t("platformGrowthDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
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
              dataKey="companies"
              fill="var(--color-companies)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
