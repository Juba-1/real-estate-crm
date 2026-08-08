# 13 — Performance Budgets & Beta Polish 1

**Status:** Active  
**Release:** Beta Polish 1 — Enterprise Performance Sprint  
**Related:** PROJECT_CONSTITUTION Article IV, ADR-023/024

---

## Before profile (measured bottlenecks)

| # | Bottleneck | Evidence | Impact |
|---|------------|----------|--------|
| 1 | Middleware 3 DB roundtrips per `/dashboard/*` | `users` + `companies` + `users.role` | High |
| 2 | Uncached `getCurrentUser` / branding duplicated layout→page→action | No `React.cache` | High |
| 3 | No `loading.tsx` — soft nav looked frozen | Zero loading files under `src/app` | High (perceived) |
| 4 | Sidebar Link default prefetch × N routes | Re-ran middleware+layout in background | Med |
| 5 | Notifications poll 30s + `revalidatePath("/dashboard")` on mark-read | Full RSC refresh for badge | Med |
| 6 | Heavy recharts + push/notifications on initial header JS | Always-on client shell | Med |
| 7 | Sequential awaits in layout / my-properties | Waterfall | Med |

---

## Optimizations applied (no business-logic change)

1. **`React.cache`** on `getCurrentUser` and `getCompanyBranding`
2. **Middleware gate collapse** — one `users` profile + optional `companies.is_active` (was 3 queries)
3. **`dashboard/loading.tsx`** skeleton for instant transition chrome
4. **`prefetch={false}`** on sidebar Links
5. **Parallel** `Promise.all` in dashboard layout, home, my-properties
6. **Dynamic import** notifications/push (ssr:false) and analytics charts
7. **Removed** `revalidatePath("/dashboard")` from mark-read (client state updates)
8. **Poll interval** 30s → 60s
9. **Request-dedupe** `getApprovedDictionaryValues` via `React.cache`

---

## Performance budgets (targets)

| Workload | Target (perceived) | Notes |
|----------|-------------------|--------|
| Soft route transition (chrome) | **< 100ms** to skeleton | `loading.tsx` |
| Soft route transition (content) | **< 800ms** typical | After cache + middleware cut |
| Dashboard home (stats) | **< 1.0s** TTFB content | RPC already aggregate |
| Property / request lists | **< 1.0s** page size 24 | Indexed + paginated |
| Property form open | **< 1.2s** interactive | Large client form remains |
| Opportunity scoring (CPU) | **< 0.5ms avg** | Benchmark suite |
| Dictionary catalog (in-request) | Deduped / once | React.cache |

If a page exceeds budget after this sprint, profile middleware + network to Supabase first — remote RTT often dominates.

---

## Remaining bottlenecks (not fixed this sprint)

- Soft navigations still re-run middleware `auth.getUser()` (required for session refresh)
- Reports still load all company properties for aggregation
- Mega `add-property-form` client bundle
- Exact `count` on list pages (correctness vs speed trade-off)
- Cross-request dictionary cache (`unstable_cache`) deferred — cookies/auth coupling

---

## How to re-measure

```bash
npm run build
npm test
npm run benchmark
```

Browser: DevTools Network + Performance while soft-navigating sidebar routes; confirm skeleton paints immediately and middleware DB calls drop from 3→1–2.
