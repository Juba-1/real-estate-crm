# DEERAH — System Operator Guide

For the platform owner (`super_admin`) who runs DEERAH for one or more offices.

## Environment checklist (Vercel)

Set these on **Production** (never expose service role or VAPID private as `NEXT_PUBLIC_*`):

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes (for browser push) |
| `VAPID_PRIVATE_KEY` | Yes (for browser push) |
| `VAPID_SUBJECT` | Optional |
| `NEXT_PUBLIC_APP_URL` | Recommended (sitemap absolute URLs) |

Template: `.env.example`

## Launch sequence

1. Confirm Supabase migrations are synced (`npx supabase migration list --linked`).
2. Deploy to Vercel; confirm env vars.
3. Create at least one **Package**.
4. **Onboard agency** (company + first admin).
5. Ask the office admin to create agents and add a test property/request.
6. Verify dashboard stats, search, in-app notifications, and Chrome push.
7. Confirm inactive companies cannot sign in.

## PWA / Push notes

- Manifest: `/manifest.webmanifest`
- Service worker: `/sw.js` (must stay outside locale middleware)
- Icons: `/icons/icon-192.png`, `/icons/icon-512.png`
- iOS push requires Home Screen install (Safari PWA)
- Offline caching / background sync are **not** implemented — push + in-app only

## Ops cautions

- Company delete is permanent and cascades data.
- Agent delete cascades their listings.
- Dictionary values need your approval before they appear in dropdowns.
- Prefer Arabic-primary offices for first launch (runtime error strings are still mostly English).

## Docs map

- Engineering: `docs/engineering/`
- Production cert: `docs/engineering/16_PRODUCTION_READINESS.md`
- This launch cert: `docs/engineering/17_LAUNCH_READINESS.md`
