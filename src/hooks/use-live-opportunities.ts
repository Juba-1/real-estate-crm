"use client"

import { useEffect, useRef, useState } from "react"

import { discoverOpportunities } from "@/actions/intelligence/opportunities"
import type {
  DiscoverOpportunitiesInput,
  DiscoverOpportunitiesResult,
} from "@/types/intelligence/opportunities"

type CacheEntry = {
  key: string
  result: DiscoverOpportunitiesResult
  at: number
}

const CACHE_TTL_MS = 20_000

export function useLiveOpportunities(
  input: DiscoverOpportunitiesInput | null,
  enabled: boolean
) {
  const [result, setResult] = useState<DiscoverOpportunitiesResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const cacheRef = useRef<CacheEntry | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !input) {
      setResult(null)
      return
    }

    const key = JSON.stringify(input)
    const cached = cacheRef.current
    if (cached && cached.key === key && Date.now() - cached.at < CACHE_TTL_MS) {
      setResult(cached.result)
      return
    }

    // Client-side readiness: avoid network when city/type missing
    if (!input.city?.trim() || !input.type?.trim()) {
      setResult({
        opportunities: [],
        grouped: {},
        readiness: {
          ready: false,
          missing: [
            ...(!input.city?.trim() ? ["city"] : []),
            ...(!input.type?.trim() ? ["type"] : []),
          ],
          strength: "none",
          debounceMs: 600,
        },
        empty: {
          code: "insufficient_input",
          missing: [
            ...(!input.city?.trim() ? ["city"] : []),
            ...(!input.type?.trim() ? ["type"] : []),
          ],
          nextStep: !input.city?.trim() ? "enter_city" : "enter_type",
        },
        algorithm_version: 1,
      })
      return
    }

    const strengthFields =
      Boolean(input.neighborhood) ||
      Boolean(input.area) ||
      Boolean(input.price) ||
      Boolean(input.budget_min) ||
      Boolean(input.budget_max) ||
      Boolean(input.area_min) ||
      Boolean(input.area_max)

    const debounceMs = strengthFields ? 240 : 420

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)

      void discoverOpportunities(input)
        .then((next) => {
          if (controller.signal.aborted) {
            return
          }
          cacheRef.current = { key, result: next, at: Date.now() }
          setResult(next)
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setResult(null)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        })
    }, debounceMs)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      abortRef.current?.abort()
    }
  }, [enabled, input])

  return { result, isLoading }
}
