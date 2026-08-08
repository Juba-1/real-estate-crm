import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  PlusCircle,
  Search,
  SettingsIcon,
  ShieldIcon,
  Trash2,
  type LucideIcon,
} from "lucide-react"

import type { UserRole } from "@/types/user"

export type DashboardNavItemKey =
  | "home"
  | "myProperties"
  | "addProperty"
  | "search"
  | "internalRequests"
  | "pendingRemovals"
  | "adminPanel"
  | "reports"
  | "companySettings"

export type DashboardNavItem = {
  titleKey: DashboardNavItemKey
  href: string
  icon: LucideIcon
}

const homeNavItem: DashboardNavItem = {
  titleKey: "home",
  href: "/dashboard",
  icon: LayoutDashboard,
}

const baseDashboardNavItems: DashboardNavItem[] = [
  {
    titleKey: "myProperties",
    href: "/dashboard/my-properties",
    icon: Building2,
  },
  {
    titleKey: "addProperty",
    href: "/dashboard/add",
    icon: PlusCircle,
  },
  {
    titleKey: "search",
    href: "/dashboard/search",
    icon: Search,
  },
  {
    titleKey: "internalRequests",
    href: "/dashboard/requests",
    icon: ClipboardList,
  },
]

export function getDashboardNavItems(
  role: UserRole | null | undefined
): DashboardNavItem[] {
  const items: DashboardNavItem[] = [homeNavItem, ...baseDashboardNavItems]

  if (role === "admin") {
    items.push({
      titleKey: "pendingRemovals",
      href: "/dashboard/removals",
      icon: Trash2,
    })
    items.push({
      titleKey: "reports",
      href: "/dashboard/reports",
      icon: FileText,
    })
    items.push({
      titleKey: "adminPanel",
      href: "/dashboard/admin",
      icon: ShieldIcon,
    })
    items.push({
      titleKey: "companySettings",
      href: "/dashboard/settings",
      icon: SettingsIcon,
    })
  }

  return items
}
