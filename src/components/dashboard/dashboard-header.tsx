"use client"

import { useState } from "react"
import { MenuIcon } from "lucide-react"
import { useTranslations } from "next-intl"

import { logout } from "@/actions/auth"
import { DashboardBrand } from "@/components/dashboard/dashboard-brand"
import { SidebarNav } from "@/components/dashboard/sidebar-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { PushNotificationManager } from "@/components/push-notification-manager"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { getUserInitials } from "@/lib/user-utils"
import type { CurrentUserProfile } from "@/types/user"
import type { UserRole } from "@/types/user"

type DashboardHeaderProps = {
  user: CurrentUserProfile
  brandName: string
  brandLogoUrl?: string | null
}

function getRoleLabel(
  role: UserRole | null,
  t: ReturnType<typeof useTranslations<"roles">>
) {
  if (!role) {
    return t("pendingSetup")
  }

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

export function DashboardHeader({
  user,
  brandName,
  brandLogoUrl,
}: DashboardHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const tCommon = useTranslations("common")
  const tHeader = useTranslations("header")
  const tRoles = useTranslations("roles")
  const initials = getUserInitials(user.name)
  const roleLabel = getRoleLabel(user.role, tRoles)

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
              <SheetTitle className="sr-only">{brandName}</SheetTitle>
              <DashboardBrand name={brandName} logoUrl={brandLogoUrl} />
            </SheetHeader>
            <div className="p-4">
              <SidebarNav
                userRole={user.role}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>

        <DashboardBrand
          name={brandName}
          logoUrl={brandLogoUrl}
          className="h-7 w-auto max-w-[140px] object-contain lg:hidden"
        />
      </div>

      <div className="flex items-center gap-2">
        <PushNotificationManager />
        <NotificationsDropdown />
        <ThemeToggle />
        <LanguageSwitcher />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar size="sm">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
                {user.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {user.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logout} className="w-full">
                <button
                  type="submit"
                  className="w-full cursor-default text-start"
                >
                  {tCommon("logOut")}
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
