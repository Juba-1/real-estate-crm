import { getLocale, getTranslations } from "next-intl/server"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CompanyRow } from "@/types/company"

type RecentCompaniesCardProps = {
  companies: CompanyRow[]
}

function formatCreatedAt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(value))
}

export async function RecentCompaniesCard({
  companies,
}: RecentCompaniesCardProps) {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("superAdmin"),
  ])

  return (
    <Card className="h-full border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>{t("recentTenantsTitle")}</CardTitle>
        <CardDescription>{t("recentTenantsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {companies.length === 0 ? (
          <p className="px-6 pb-6 text-center text-sm text-muted-foreground">
            {t("emptyCompanies")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("companyName")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("createdAt")}
                </TableHead>
                <TableHead className="text-end">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="max-w-[140px] truncate font-medium sm:max-w-none">
                    {company.name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatCreatedAt(company.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
