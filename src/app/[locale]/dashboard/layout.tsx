import { redirectTo } from "@/i18n/server-redirect"
import { getTranslations } from "next-intl/server"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { DashboardBrand } from "@/components/dashboard/dashboard-brand"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { getCompanyBranding } from "@/lib/data/company"
import { getCurrentUser } from "@/lib/data/user"
import { Toaster } from "sonner"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [user, t] = await Promise.all([
    getCurrentUser(),
    getTranslations("common"),
  ])

  if (!user) {
    return redirectTo("/login")
  }

  if (user.role === "super_admin") {
    return redirectTo("/super-admin")
  }

  const company = user.company_id
    ? await getCompanyBranding(user.company_id)
    : null
  const brandName = company?.name ?? t("appName")

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-sidebar-border bg-sidebar shadow-sm print:hidden lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-6">
          <DashboardBrand name={brandName} logoUrl={company?.logo_url} />
        </div>
        <div className="flex flex-1 flex-col p-4">
          <SidebarNav userRole={user.role} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <DashboardHeader
            user={user}
            brandName={brandName}
            brandLogoUrl={company?.logo_url}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-4 print:overflow-visible print:bg-white print:p-0 lg:p-6">
          {children}
        </main>
        <Toaster richColors position="top-right" className="print:hidden" />
      </div>
    </div>
  )
}
