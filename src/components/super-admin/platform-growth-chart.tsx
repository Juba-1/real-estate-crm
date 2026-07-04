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

const MOCK_COUNTS = [4, 7, 5, 9, 12, 8]

export function PlatformGrowthChart() {
  const t = useTranslations("superAdmin")
  const locale = useLocale()

  const chartConfig = {
    companies: {
      label: t("chartCompaniesLabel"),
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig

  const chartData = useMemo(() => {
    const now = new Date()

    return MOCK_COUNTS.map((count, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)

      return {
        label: date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
          month: "short",
        }),
        companies: count,
      }
    })
  }, [locale])

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
