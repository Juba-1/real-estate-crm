"use client"

import { useTranslations } from "next-intl"

import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

type LandingHeaderProps = {
  appName: string
  dashboardHref: string | null
}

export function LandingHeader({ appName, dashboardHref }: LandingHeaderProps) {
  const t = useTranslations("landing")
  const tCommon = useTranslations("common")

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link href="/" className="font-heading text-lg font-bold tracking-tight text-foreground">
          {appName}
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          {dashboardHref ? (
            <Button asChild size="sm">
              <Link href={dashboardHref}>{tCommon("dashboard")}</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/login">{t("login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
