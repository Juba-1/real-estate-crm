import {
  Building2Icon,
  LayoutDashboardIcon,
  PackageIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react"

export type SuperAdminNavItemKey =
  | "overview"
  | "companies"
  | "packages"
  | "globalSettings"

export type SuperAdminNavItem = {
  titleKey: SuperAdminNavItemKey
  href: string
  icon: LucideIcon
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  {
    titleKey: "overview",
    href: "/super-admin",
    icon: LayoutDashboardIcon,
  },
  {
    titleKey: "companies",
    href: "/super-admin/companies",
    icon: Building2Icon,
  },
  {
    titleKey: "packages",
    href: "/super-admin/packages",
    icon: PackageIcon,
  },
  {
    titleKey: "globalSettings",
    href: "/super-admin/settings",
    icon: SettingsIcon,
  },
]
