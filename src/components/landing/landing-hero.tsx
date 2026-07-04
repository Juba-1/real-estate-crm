import { ArrowRightIcon, LogInIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

type LandingHeroProps = {
  dashboardHref: string | null
}

export async function LandingHero({ dashboardHref }: LandingHeroProps) {
  const t = await getTranslations("landing.hero")

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background dark:from-primary/15" />
      <div className="pointer-events-none absolute -top-24 start-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl dark:bg-primary/20" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center lg:px-6 lg:py-28">
        <p className="mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-sm font-medium text-primary">
          {t("badge")}
        </p>

        <h1 className="font-heading mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {t("headline")}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {t("subheadline")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-40 gap-2">
            <a href="#pricing">
              {t("ctaStart")}
              <ArrowRightIcon className="size-4 rtl:rotate-180" />
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-40 gap-2">
            <Link href={dashboardHref ?? "/login"}>
              <LogInIcon className="size-4" />
              {t("ctaLogin")}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
