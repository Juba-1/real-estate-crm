# 19 — Urgent State + Notification Reliability (Release 6B)

**Status:** Implemented  
**Scope:** Production reliability — mutable urgent anytime; Web Push / in-app notify hardening.

## Root causes addressed

### Urgent
1. Requests had **no post-create** urgent control (create-only).
2. Properties required **full edit** for urgent changes (card was badge-only).
3. Activate/clear silently no-op’d for **admins** on another agent’s row (`agent_id = auth` only).

### Notifications
1. Server **VAPID soft-fail** (log only) → push never sent when keys missing.
2. Push deep links **lacked locale** while `localePrefix: always`.
3. Opportunity **receipts upserted even when in-app notify failed**.
4. Property/request fan-out **awaited** after commit (latency).
5. Many in-app rows lacked **`link_path`**.

## Data model (unchanged semantics)

`urgent_until`: NULL = normal; future = urgent (~7 days via RPC); past = expired at read time via `isCurrentlyUrgent`.

## Manual verification (required — not automated)

| # | Check | Evidence needed |
|---|--------|-----------------|
| 1 | Mark property urgent from card | DB `urgent_until` future + badge |
| 2 | Remove urgent from card | `urgent_until` null |
| 3 | Mark/remove request urgent from card | Same |
| 4 | Admin toggles another agent’s listing | Succeeds; transfers that agent’s slot |
| 5 | Enable browser push (Chrome/Edge) | `push_subscriptions` row |
| 6 | Create property → in-app bell | Row with `link_path` |
| 7 | Create property → OS push | Tray notification |
| 8 | Click push | Lands on `/[locale]/dashboard/search` |
| 9 | Second company isolation | No cross-tenant notify/push |
| 10 | Denied / unsupported browser | Graceful UI, no crash |

**Platform notes:** Safari desktop / iOS require PWA install constraints. Do not claim universal push without device evidence.

## Ops

Confirm Vercel Production has matching `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` (+ optional `VAPID_SUBJECT`). Misconfig logs `category: "vapid_missing"`.
