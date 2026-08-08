import { getTranslations } from "next-intl/server"

import { DictionaryAdminPanel } from "@/components/super-admin/dictionary-admin-panel"
import { getDictionaryEntriesForAdmin } from "@/lib/data/dictionary"
import type { DictionaryCategory, DictionaryStatus } from "@/types/dictionary"

type PageProps = {
  searchParams: Promise<{ status?: string; category?: string }>
}

function parseStatus(value?: string): DictionaryStatus | "all" {
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "archived"
  ) {
    return value
  }
  return "all"
}

function parseCategory(value?: string): DictionaryCategory | "all" {
  if (
    value === "property_type" ||
    value === "city" ||
    value === "district"
  ) {
    return value
  }
  return "all"
}

export default async function SuperAdminDictionaryPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const status = parseStatus(params.status)
  const category = parseCategory(params.category)
  const [entries, t] = await Promise.all([
    getDictionaryEntriesForAdmin({ status, category }),
    getTranslations("dictionary"),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("adminTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("adminDescription")}</p>
      </div>

      <DictionaryAdminPanel
        entries={entries}
        initialStatus={status}
        initialCategory={category}
      />
    </div>
  )
}
