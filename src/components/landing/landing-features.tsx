import { BarChart3Icon, Building2Icon, PaletteIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const featureKeys = [
  { key: "smartManagement", icon: Building2Icon },
  { key: "reports", icon: BarChart3Icon },
  { key: "branding", icon: PaletteIcon },
] as const

export async function LandingFeatures() {
  const t = await getTranslations("landing.features")

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 lg:px-6">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {featureKeys.map(({ key, icon: Icon }) => (
          <Card key={key} className="border-border/80 transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <CardTitle className="text-xl">{t(`${key}.title`)}</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {t(`${key}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ))}
      </div>
    </section>
  )
}
