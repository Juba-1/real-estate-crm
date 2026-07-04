"use client"

import { useTranslations } from "next-intl"

import { superAdminNavItems } from "@/lib/super-admin-nav"
import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type SuperAdminSidebarNavProps = {
  onNavigate?: () => void
  className?: string
}

export function SuperAdminSidebarNav({
  onNavigate,
  className,
}: SuperAdminSidebarNavProps) {
  const pathname = usePathname()
  const t = useTranslations("superAdmin.nav")

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {superAdminNavItems.map((item) => {
        const isActive =
          item.href === "/super-admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 font-semibold text-primary shadow-sm"
                : "text-sidebar-foreground/70 hover:bg-primary/5 hover:text-primary"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(item.titleKey)}
          </Link>
        )
      })}
    </nav>
  )
}
