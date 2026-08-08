# 17 — Launch Readiness (Release 6)

**Date:** 2026-08-08  
**Scope:** Launch preparation only — no business features, no engine changes.  
**Certification:** **READY WITH RISKS**

---

## Final certification

### ⚠ READY WITH RISKS

DEERAH can onboard its **first real office** once the system operator confirms Vercel Production env vars and completes a 15-minute live smoke. Remaining risks are operational (not architectural).

**Not** ❌ — migrations synced, PWA/SEO assets present, quality gates green, friction copy fixed.  
**Not** ✅ — Vercel Production env not CLI-verified this session; live browser smoke / device PWA matrix not executed here.

---

## What shipped (Release 6)

### Production / PWA / SEO
- `public/manifest.webmanifest` + `/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- Metadata: manifest, appleWebApp, icons (`src/app/[locale]/layout.tsx`)
- `src/app/robots.ts`, `src/app/sitemap.ts`
- `public/sw.js` updated (icons, default `/ar/dashboard` deep link, install/activate)
- `.env.example` includes optional `NEXT_PUBLIC_APP_URL`

### Operator friction (copy/UX only)
- Admin create-user: username (not email) wording + username hint
- Role labels aligned (Admin / Agent)
- Softer push failure toasts (no VAPID jargon)
- Confidential owner copy without DB table name
- Empty-state CTAs: Search, Requests, Packages; companies/packages hints
- Onboard button explains missing packages
- Notifications empty hint
- Reports export label → CSV

### Documentation
- `docs/operator/OFFICE_ADMIN.md`
- `docs/operator/AGENT.md`
- `docs/operator/SYSTEM_OPERATOR.md`

---

## Verification evidence

| Gate | Result |
|------|--------|
| Remote migrations (incl. `20260807220000`) | Synced |
| Local env names (Supabase + VAPID) | Present |
| i18n parity | 645 / 645 |
| `tsc --noEmit` | Pass |
| Vitest | 20 / 20 |
| Benchmarks | Pass |
| `next build` | Pass |
| Vercel Production env (CLI) | **Not verified** (login required) |
| Live office smoke | **Not run this session** |

---

## PWA audit summary

| Surface | Status |
|---------|--------|
| Manifest + icons | Present |
| Install (Chrome/Edge/Android) | Ready to test on HTTPS deploy |
| Safari / iPhone PWA | Installable; push only after Home Screen add |
| Offline / background sync | **Not implemented** (document honestly) |
| Push | Architecture certified; device test required |
| Deep links | SW defaults to `/ar/dashboard`; payloads may omit locale |

---

## Operator go-live checklist

1. `vercel login` → confirm Production env matches `.env.example`
2. Deploy latest commit
3. Create package → onboard company → admin creates agent
4. Agent: property (maps/images/urgent) → request → search → dashboard
5. Chrome: enable push → background notification
6. Hand office admin: `docs/operator/OFFICE_ADMIN.md`

When 1–5 pass, upgrade this file to **✅ READY FOR CUSTOMER LAUNCH**.
