import { CheckIcon } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { PackageRow } from "@/types/package"

type LandingPricingProps = {
  packages: PackageRow[]
}

function formatLimit(
  value: number,
  unlimitedThreshold: number,
  limitedLabel: string,
  unlimitedLabel: string
) {
  if (value >= unlimitedThreshold) {
    return unlimitedLabel
  }

  return limitedLabel
}

export async function LandingPricing({ packages }: LandingPricingProps) {
  const t = await getTranslations("landing.pricing")
  const popularIndex =
    packages.length >= 2 ? Math.floor(packages.length / 2) : -1

  return (
    <section id="pricing" className="border-t border-border/40 bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
        </div>

        {packages.length === 0 ? (
          <p className="text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <div
            className={cn(
              "grid gap-6",
              packages.length === 1 && "mx-auto max-w-md",
              packages.length === 2 && "md:grid-cols-2",
              packages.length >= 3 && "md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {packages.map((pkg, index) => {
              const isPopular = index === popularIndex

              return (
                <Card
                  key={pkg.id}
                  className={cn(
                    "relative flex flex-col border-border/80",
                    isPopular &&
                      "border-primary/40 shadow-lg ring-2 ring-primary/20 dark:border-primary/50"
                  )}
                >
                  {isPopular ? (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                      {t("popular")}
                    </span>
                  ) : null}

                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    <CardDescription>{t("perMonth")}</CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-3">
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>
                          {formatLimit(
                            pkg.max_properties,
                            9999,
                            t("properties", { count: pkg.max_properties }),
                            t("unlimitedProperties")
                          )}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>
                          {formatLimit(
                            pkg.max_agents,
                            99,
                            t("agents", { count: pkg.max_agents }),
                            t("unlimitedAgents")
                          )}
                        </span>
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      asChild
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                    >
                      <Link href="/login">{t("getStarted")}</Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
