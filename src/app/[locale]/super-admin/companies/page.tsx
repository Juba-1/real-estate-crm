import { getLocale, getTranslations } from "next-intl/server"

import { AddCompanyDialog } from "@/components/super-admin/add-company-dialog"
import { CompanyActiveToggle } from "@/components/super-admin/company-active-toggle"
import { CompanyRowActions } from "@/components/super-admin/company-row-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAllCompanies } from "@/lib/data/super-admin"
import { getAllPackages } from "@/lib/data/packages"

function formatCreatedAt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default async function SuperAdminCompaniesPage() {
  const [companies, packages, locale, t] = await Promise.all([
    getAllCompanies(),
    getAllPackages(),
    getLocale(),
    getTranslations("superAdmin"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("companiesTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("companiesDescription")}
          </p>
        </div>
        <AddCompanyDialog packages={packages} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("companyName")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("createdAt")}
              </TableHead>
              <TableHead className="w-[90px] text-end">{t("active")}</TableHead>
              <TableHead className="w-[70px] text-end">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-28 space-y-1 py-8 text-center text-muted-foreground"
                >
                  <p>{t("emptyCompanies")}</p>
                  <p className="text-sm">{t("emptyCompaniesHint")}</p>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? t("active") : t("inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatCreatedAt(company.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-end">
                    <CompanyActiveToggle
                      companyId={company.id}
                      companyName={company.name}
                      isActive={company.is_active}
                    />
                  </TableCell>
                  <TableCell className="text-end">
                    <CompanyRowActions company={company} packages={packages} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
