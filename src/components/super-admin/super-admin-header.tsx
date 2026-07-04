"use client"

import { useState } from "react"
import { MenuIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { logout } from "@/actions/auth"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { SuperAdminSidebarNav } from "@/components/super-admin/super-admin-sidebar-nav"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { CurrentUserProfile } from "@/types/user"

type SuperAdminHeaderProps = {
  user: CurrentUserProfile
}

export function SuperAdminHeader({ user }: SuperAdminHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const tCommon = useTranslations("common")
  const tHeader = useTranslations("header")
  const tSuperAdmin = useTranslations("superAdmin")

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <MenuIcon className="size-4" />
              <span className="sr-only">{tHeader("openNav")}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b px-4 py-4 text-start">
              <SheetTitle>{tSuperAdmin("workspaceTitle")}</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <SuperAdminSidebarNav
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <p className="text-sm font-medium text-muted-foreground lg:hidden">
          {tSuperAdmin("workspaceTitle")}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {user.name}
        </span>
        <ThemeToggle />
        <LanguageSwitcher />
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            {tCommon("logOut")}
          </Button>
        </form>
      </div>
    </header>
  )
}
