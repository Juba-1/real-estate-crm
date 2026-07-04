import { getTranslations } from "next-intl/server"

type LandingFooterProps = {
  appName: string
}

export async function LandingFooter({ appName }: LandingFooterProps) {
  const t = await getTranslations("landing.footer")
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center lg:px-6">
        <p className="font-heading text-lg font-semibold text-foreground">{appName}</p>
        <p className="max-w-xl text-sm text-muted-foreground">{t("tagline")}</p>
        <p className="text-xs text-muted-foreground">
          {t("rights", { year, appName })}
        </p>
      </div>
    </footer>
  )
}
