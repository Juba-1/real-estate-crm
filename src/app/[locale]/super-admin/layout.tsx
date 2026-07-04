import { redirectTo } from "@/i18n/server-redirect"
import { getTranslations } from "next-intl/server"

import { SuperAdminHeader } from "@/components/super-admin/super-admin-header"
import { SuperAdminSidebarNav } from "@/components/super-admin/super-admin-sidebar-nav"
import { ensureSuperAdminPage } from "@/lib/auth/super-admin"
import { Toaster } from "sonner"

export default async function SuperAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await ensureSuperAdminPage()
  const t = await getTranslations("superAdmin")

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar shadow-sm lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-6">
          <p className="font-heading text-sm font-semibold text-sidebar-foreground">
            {t("workspaceTitle")}
          </p>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <SuperAdminSidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <SuperAdminHeader user={user} />
        <main className="flex-1 overflow-y-auto bg-background p-4 lg:p-6">{children}</main>
        <Toaster richColors position="top-right" />
      </div>
    </div>
  )
}
