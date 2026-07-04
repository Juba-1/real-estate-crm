import {
  Building2Icon,
  HomeIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { SuperAdminStats } from "@/lib/data/super-admin"

type MetricConfig = {
  title: string
  value: number
  description: string
  icon: LucideIcon
  accent: string
  iconWrap: string
  iconColor: string
}

type SuperAdminMetricCardsProps = {
  stats: SuperAdminStats
  labels: {
    totalCompanies: string
    totalCompaniesDesc: string
    totalUsers: string
    totalUsersDesc: string
    totalProperties: string
    totalPropertiesDesc: string
  }
}

function MetricCard({ title, value, description, icon: Icon, accent, iconWrap, iconColor }: MetricConfig) {
  return (
    <Card className={cn("border shadow-sm", accent)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconWrap)}>
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

export function SuperAdminMetricCards({
  stats,
  labels,
}: SuperAdminMetricCardsProps) {
  const metrics: MetricConfig[] = [
    {
      title: labels.totalCompanies,
      value: stats.totalCompanies,
      description: labels.totalCompaniesDesc,
      icon: Building2Icon,
      accent: "border-blue-200/70 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20",
      iconWrap: "bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: labels.totalUsers,
      value: stats.totalUsers,
      description: labels.totalUsersDesc,
      icon: UsersIcon,
      accent: "border-violet-200/70 bg-violet-50/40 dark:border-violet-900/50 dark:bg-violet-950/20",
      iconWrap: "bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      title: labels.totalProperties,
      value: stats.totalProperties,
      description: labels.totalPropertiesDesc,
      icon: HomeIcon,
      accent: "border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      iconWrap: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}
