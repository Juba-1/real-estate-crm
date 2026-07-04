import { getLocale, getTranslations } from "next-intl/server"

import { CreateAgentDialog } from "@/components/admin/create-agent-dialog"
import { TeamRowActions } from "@/components/admin/team-row-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCompanyTeam } from "@/lib/data/team"
import { getCurrentUser } from "@/lib/data/user"
import type { UserRole } from "@/types/user"

function formatJoinDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    dateStyle: "medium",
  }).format(new Date(value))
}

function getRoleLabel(
  role: UserRole,
  t: (key: "superAdmin" | "admin" | "agent") => string
) {
  switch (role) {
    case "super_admin":
      return t("superAdmin")
    case "admin":
      return t("admin")
    case "agent":
      return t("agent")
    default:
      return role
  }
}

export default async function AdminPage() {
  const [team, currentUser, locale] = await Promise.all([
    getCompanyTeam(),
    getCurrentUser(),
    getLocale(),
  ])
  const t = await getTranslations("admin")
  const tRoles = await getTranslations("roles")
  const tCommon = await getTranslations("common")

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <CreateAgentDialog />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("name")}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {t("phone")}
              </TableHead>
              <TableHead>{t("role")}</TableHead>
              <TableHead className="hidden md:table-cell">
                {t("joinDate")}
              </TableHead>
              <TableHead className="w-[70px] text-end">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("emptyTeam")}
                </TableCell>
              </TableRow>
            ) : (
              team.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {member.phone ?? tCommon("notAvailable")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getRoleLabel(member.role, tRoles)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatJoinDate(member.created_at, locale)}
                  </TableCell>
                  <TableCell className="text-end">
                    <TeamRowActions
                      user={member}
                      currentUserId={currentUser?.id ?? ""}
                    />
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
