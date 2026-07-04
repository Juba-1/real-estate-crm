"use client"

import { Building2Icon, UsersIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { PackageRowActions } from "@/components/super-admin/package-row-actions"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { PackageRow } from "@/types/package"

type PackagePricingCardProps = {
  pkg: PackageRow
}

export function PackagePricingCard({ pkg }: PackagePricingCardProps) {
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")

  return (
    <Card className="flex flex-col border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-4">
        <CardTitle className="font-heading text-xl">{pkg.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
          <Building2Icon className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">
              {tFields("maxProperties")}
            </p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {pkg.max_properties.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
          <UsersIcon className="size-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">{tFields("maxAgents")}</p>
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {pkg.max_agents.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 pt-4">
        <PackageRowActions pkg={pkg} variant="inline" />
      </CardFooter>
    </Card>
  )
}
