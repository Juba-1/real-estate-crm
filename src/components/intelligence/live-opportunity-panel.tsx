"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { ExternalLinkIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLiveOpportunities } from "@/hooks/use-live-opportunities"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type {
  DiscoverOpportunitiesInput,
  OpportunityCard,
  OpportunityLevel,
} from "@/types/intelligence/opportunities"
import { OPPORTUNITY_LEVELS } from "@/types/intelligence/opportunities"

type LiveOpportunityPanelProps = {
  input: DiscoverOpportunitiesInput | null
  enabled?: boolean
  className?: string
}

const LEVEL_ORDER: OpportunityLevel[] = [...OPPORTUNITY_LEVELS]

export function LiveOpportunityPanel({
  input,
  enabled = true,
  className,
}: LiveOpportunityPanelProps) {
  const t = useTranslations("opportunities")
  const inputKey = JSON.stringify(input)
  const stableInput = useMemo(() => input, [inputKey])
  const { result, isLoading } = useLiveOpportunities(stableInput, enabled)

  return (
    <aside
      className={cn(
        "rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <SparklesIcon className="size-4 text-primary" />
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          {t("panelTitle")}
        </h2>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">{t("scanning")}</span>
        ) : null}
      </div>

      {!result || result.empty?.code === "insufficient_input" ? (
        <EmptyState
          code={result?.empty?.code ?? "insufficient_input"}
          missing={result?.empty?.missing}
          nextStep={result?.empty?.nextStep}
        />
      ) : result.opportunities.length === 0 ? (
        <EmptyState
          code={result.empty?.code ?? "no_fit"}
          nextStep={result.empty?.nextStep}
          nearestHint={result.empty?.nearestHint}
        />
      ) : (
        <div className="space-y-4">
          {LEVEL_ORDER.map((level) => {
            const items = result.grouped[level]
            if (!items?.length) return null
            return (
              <section key={level} className="space-y-2">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`level_${level}`)}
                </h3>
                <div className="space-y-2">
                  {items.slice(0, 4).map((card) => (
                    <OpportunityCardView key={card.id} card={card} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </aside>
  )
}

function EmptyState({
  code,
  missing,
  nextStep,
  nearestHint,
}: {
  code: string
  missing?: string[]
  nextStep?: string
  nearestHint?: string
}) {
  const t = useTranslations("opportunities")
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>{t(`empty_${code}`)}</p>
      {missing?.length ? (
        <p>{t("missingFields", { fields: missing.join(", ") })}</p>
      ) : null}
      {nearestHint ? <p>{t(`hint_${nearestHint}`)}</p> : null}
      {nextStep ? (
        <p className="font-medium text-foreground">{t(`next_${nextStep}`)}</p>
      ) : null}
    </div>
  )
}

function OpportunityCardView({ card }: { card: OpportunityCard }) {
  const t = useTranslations("opportunities")

  return (
    <article className="rounded-lg border bg-background/80 p-3 transition hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">{card.title}</p>
          <p className="text-xs text-muted-foreground">{card.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">
            {card.confidence}%
          </p>
          <p className="text-[10px] uppercase text-muted-foreground">
            {t(`level_${card.level}`)}
          </p>
        </div>
      </div>

      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {card.reasons.slice(0, 4).map((reason) => (
          <li key={`${reason.key}-${reason.detail ?? ""}`}>
            {reason.matched ? "✓ " : "• "}
            {t.has(`reason_${reason.key}`)
              ? t(`reason_${reason.key}`, { detail: reason.detail ?? "" })
              : reason.key}
          </li>
        ))}
      </ul>

      {(card.meta.price != null || card.meta.area != null) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {card.meta.price != null
            ? t("metaPrice", { price: card.meta.price })
            : null}
          {card.meta.price != null && card.meta.area != null ? " · " : null}
          {card.meta.area != null
            ? t("metaArea", { area: card.meta.area })
            : null}
        </p>
      )}

      <div className="mt-3">
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href={card.href}>
            <ExternalLinkIcon className="size-3.5" />
            {card.direction === "property_to_requests"
              ? t("openRequest")
              : t("openProperty")}
          </Link>
        </Button>
      </div>
    </article>
  )
}
