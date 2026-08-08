# 15 — Beta Readiness (Final System Validation)

**Date:** 2026-08-07  
**Scope:** Validation only — no new business features. Critical/High launch blockers fixed in-repo.  
**Verdict:** **Ready for Closed Beta** (with explicit caveats below).

---

## Executive score: **7.8 / 10**

| Area | Score | Notes |
|------|------:|-------|
| Security / tenant isolation | 8.5 | App-layer authz solid; dashboard RPC harden migration must be applied remotely |
| Core workflows | 7.5 | CRUD works; no edit-request; teammate delete cascades inventory |
| Permissions / roles | 8.5 | Route + action gates verified |
| UI / UX polish | 8.0 | Empty states + form sections from Polish 2 |
| Mobile | 7.5 | Responsive grids; dialogs scroll; RTL sheet side debt |
| Localization | 6.5 | en/ar catalogs 100% parity; action/notify runtime strings still mixed |
| Notifications / Push | 7.5 | Chrome/Edge strong; iOS PWA caveats; anti-spam fail-closed fixed |
| Error handling | 6.0 | Validation OK; many toasts still raw English |
| Build / tests | 9.5 | Green |

---

## Critical bugs fixed

1. **Last office admin could be deleted** → `deleteCompanyUser` now blocks when only one admin remains (`src/actions/admin-users.ts`).
2. **Opportunity anti-spam fail-open** → receipt load failure skips notify (`loadOpportunityReceipts` + `dispatch.ts`).
3. **Inactive company gate fail-open** → unknown/error company status denies access (`middleware-gate.ts`, `company-access.ts`).
4. **Dashboard stats RPC missing agent role gate** → migration `20260807220000_harden_dashboard_stats_rpc.sql` (agents must pass `p_agent_id = auth.uid()`). **Apply to remote before production traffic.**

---

## High bugs fixed

1. Search filters reset `page` so filter changes never land on empty page N.
2. List cards select + render `custom_property_type`.
3. `ListPagination` uses i18n (`common.previous` / `next` / `pageOfTotal`).
4. In-app notifications navigate via `link_path` when present.

---

## Medium / Low deferred (post-Beta)

| Severity | Item |
|----------|------|
| High→deferred* | Localized Server Action / login errors (EN strings → toasts) |
| High→deferred* | EN locale still receives Arabic notify/push copy (AR-first product OK for first SA office) |
| High→deferred* | `deleteProperty` leaves storage objects; upload batch orphans |
| High→deferred* | Dashboard RPC soft-fails to zeros |
| High→deferred* | Server VAPID misconfig silent for delivery |
| Medium | No edit-request UI/action |
| Medium | Push/deep-link URLs lack locale prefix |
| Medium | RTL mobile nav sheet uses physical `left` |
| Medium | Teammate delete cascades listings (disclosed in copy) |
| Medium | Self-noise on in-app company broadcasts |
| Low | Orphan dashboards, MetricCard dupes, smell-doc drift |

\*Still High impact for broader EN beta / multi-office; acceptable for **first Arabic-primary Closed Beta** if operators are briefed.

---

## Screens / pages audited (code + architecture)

Landing · Login · Dashboard · My Properties · Add/Edit Property · Search · Requests · Admin team · Company settings · Reports · Notifications dropdown · Push manager · Super-admin home / companies / packages / dictionary / settings

---

## Browser / mobile / localization summaries

- **Browsers:** Chrome/Edge best for Push; Firefox OK; Safari macOS needs device test; iOS Push only as installed PWA.
- **Mobile:** List grids 1→2→3 cols; request dialog `max-h-[90vh]`; no systematic horizontal scroll found in primary shells.
- **i18n:** 631/631 key parity; `dir`/`lang` correct; dates/prices locale-aware; pagination fixed; action/notify runtime gaps remain.

---

## Verification

| Check | Status |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm test` | Pass (20/20) |
| `npm run build` | Pass |
| Apply `20260807220000_harden_dashboard_stats_rpc.sql` | **Applied** on linked project (2026-08-08) |

---

## Closed Beta operator checklist

1. Apply dashboard stats migration on the linked Supabase project.
2. Confirm VAPID public + private keys in deploy env; send one test push.
3. Confirm opportunity receipts migration already applied (5B).
4. Brief office: no edit-request yet; deleting an agent deletes their listings; prefer Arabic UI for clearest copy.
5. Smoke: onboard company → admin → agent → property → request → urgent → search → notify.
