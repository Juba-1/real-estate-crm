# 16 — Production Readiness Certification

**Date:** 2026-08-08  
**Project:** DEERAH Real Estate CRM (`ztwvufglemheaewhqkap`)  
**Scope:** Verification + production hardening only (no business features).  
**Certification:** **READY WITH RISKS**

---

## Final certification

### ⚠ READY WITH RISKS

DEERAH is safe to onboard the **first Arabic-primary real-estate office** after the operator completes the live smoke checklist below. It is **not** certified as “fully production-hardened for multi-office / multi-locale public launch” until live E2E, Vercel env confirmation, and the deferred High items are closed.

**Evidence for readiness**
- Linked remote DB: all migrations applied including `20260807220000` (dashboard RPC agent gate).
- RPC: `anon` EXECUTE = **false**, `authenticated` EXECUTE = **true**; agent self-scope gate present in live function body.
- Core tables: RLS **enabled** on all audited domain tables.
- Local production build / TypeScript / Vitest (20) / intelligence benchmarks: **PASS**.
- Service role + VAPID private keys are **not** `NEXT_PUBLIC_*`.
- Baseline security headers added; `.env.example` published for ops.

**Evidence for residual risk**
- End-to-end browser smoke was **code-path certified only** (no live office simulation this session).
- Vercel project env vars were **not** remotely verified (CLI/project MCP unavailable).
- No Content-Security-Policy yet (intentional — Next + Push need careful allowlists).
- Known High UX/ops debt remains (EN action errors, storage orphans, EN notify copy).

---

## Objective results

### 1 — Deployment audit

| Item | Status |
|------|--------|
| Required env names present in `.env.local` | Yes (values not logged) |
| `.env.example` | **Added** |
| `vercel.json` | Absent (OK for default Vercel Next deploy) |
| Security headers | **Added** (HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy) |
| CSP | Deferred (risk of breaking Next/SW/Supabase) |
| `poweredByHeader` | Disabled |
| Locale prefix `always` | Verified |
| `sw.js` matcher exclusion | Verified |
| Service role `server-only` | Verified; push sender now also `server-only` |

### 2 — Database production audit

| Check | Result |
|-------|--------|
| Migration drift | Cleared — `20260807220000` applied via `supabase db push --linked` |
| Dashboard RPC authz | Verified in `pg_get_functiondef` (agent must pass self `p_agent_id`) |
| anon EXECUTE on dashboard RPC | **false** |
| RLS on core tables | Enabled (companies, users, properties, owners, requests, notifications, push, dictionary, identities, receipts, intelligence_events, system_settings) |
| `packages` | RLS on, **0 policies** — app uses service role (intentional; brittle if policies added carelessly) |

### 3 — Smoke test

All 18 launch steps have wired Server Actions / pages. Status: **UNTESTED_LIVE** (no running app URL in session). Cleanup path **PARTIAL** (hard deletes; media orphans).

### 4 — Notification certification

| Area | Verdict |
|------|---------|
| In-app create/read/mark | Certified (code + authz) |
| Opportunity anti-spam | Certified (fail-closed on receipt load; unit tests) |
| Web Push Chrome/Edge | Certified architecture; **device test required** |
| Firefox | Expected OK |
| Safari / iOS PWA | Supported only with constraints; **device test required** |
| Permission denied / unsupported | Graceful (i18n toasts / hidden control) |
| Deep links | In-app `link_path` wired; SW URLs locale-less (middleware fallback) |
| VAPID misconfig | Soft-fail (log only) — ops must verify keys |

### 5 — Performance

Budgets from `13_PERFORMANCE.md` unchanged. Benchmarks: identity / opportunity / dictionary **PASS**. No premature optimization this sprint.

### 6 — UX

Polish 2 empty states / form sections retained. Tiny a11y: notifications `aria-label` includes unread count. No redesigns.

### 7 — Accessibility

Radix dialogs: Escape + focus trap OK. Gaps deferred: skip link, Zod EN messages, 24px icon remove buttons.

### 8 — Logging / failure recovery

Prefixed `console.error` on critical paths; notify/push non-blocking. Noisy success `console.log` remains (debt).

### 9 — Release validation

| Gate | Status |
|------|--------|
| `npx tsc --noEmit` | Pass |
| `npm test` | Pass (20/20) |
| `npm run benchmark` | Pass |
| `npm run build` | Pass |
| i18n key parity | 635 / 635 |

---

## Changes made this sprint (confidence only)

1. Applied remote migration `20260807220000_harden_dashboard_stats_rpc.sql`
2. `next.config.ts` — production security headers + `poweredByHeader: false`
3. `.env.example` + `.gitignore` exception `!.env.example`
4. `import "server-only"` on `send-company-push.ts`
5. Notifications bell `aria-label` includes unread count

---

## Remaining technical debt (next sprint candidates)

1. Live browser E2E smoke on staging/production URL  
2. Confirm Vercel Production env matches `.env.example` matrix  
3. Localized action/login/Zod errors (AR-first)  
4. Property delete / failed-upload storage cleanup  
5. Content-Security-Policy (carefully)  
6. PWA manifest + icons for iOS push install path  
7. Locale-prefixed push URLs  
8. Edit-request product path (if office needs it)

---

## Operator checklist (promote to ✅ PRODUCTION READY)

1. Deploy latest commit to Vercel; verify all env keys from `.env.example` on **Production**.  
2. Live smoke: company → admin → agent → property (maps/images/urgent) → request → opportunity notify → search → dashboard → reports → logout → login.  
3. Chrome: enable push → background notification → click deep link.  
4. Confirm dashboard metrics non-zero for a seeded company (proves RPC).  
5. Confirm inactive company cannot log in.

When 1–5 pass, update this doc to **✅ PRODUCTION READY**.
