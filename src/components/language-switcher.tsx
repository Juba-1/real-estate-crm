"use client"

import { LanguagesIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import { usePathname, useRouter } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("common")

  function switchLocale(nextLocale: (typeof routing.locales)[number]) {
    if (nextLocale === locale) {
      return
    }

    router.replace(pathname, { locale: nextLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LanguagesIcon className="size-4" />
          <span className="hidden sm:inline">{t("language")}</span>
          <span className="uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchLocale("ar")}>
          {t("arabic")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchLocale("en")}>
          {t("english")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
