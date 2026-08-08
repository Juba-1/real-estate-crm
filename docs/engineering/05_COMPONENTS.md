# 05 — Components

Domain and shell components only. `src/components/ui/*` are shadcn/Radix primitives — treat as presentational design-system; do not put business rules there.

Legend: **R** = reusable across features · **P** = should stay presentational · **Used** = primary consumers.

---

## Shell / global

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `dashboard/dashboard-header.tsx` | Dashboard layout | No | Mostly | Composes notifications, push, theme, language |
| `dashboard/dashboard-brand.tsx` | Sidebar/header | Yes | Yes | Logo/name |
| `dashboard/sidebar-nav.tsx` | Dashboard layout | No | Yes | Uses `getDashboardNavItems` |
| `theme-provider.tsx` | Locale layout | Yes | Yes | next-themes |
| `theme-toggle.tsx` | Headers | Yes | Yes | Lint: setState-in-effect debt |
| `language-switcher.tsx` | Headers / landing | Yes | Yes | |
| `notifications-dropdown.tsx` | Dashboard header | No | No | Calls notification actions |
| `push-notification-manager.tsx` | Dashboard header | No | No | Push subscribe UX |

---

## Auth / landing

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `auth/login-form.tsx` | Login page | No | Mostly | Calls `login` action |
| `landing/landing-header.tsx` | Landing | No | Yes | |
| `landing/landing-hero.tsx` | Landing | No | Yes | |
| `landing/landing-features.tsx` | Landing | No | Yes | |
| `landing/landing-pricing.tsx` | Landing | No | Yes | Uses public packages data |
| `landing/landing-footer.tsx` | Landing | No | Yes | |

---

## Dashboard analytics

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `dashboard/tenant-analytics-dashboard.tsx` | `/dashboard` | No | Mixed | **Canonical** home dashboard; local `MetricCard` |
| `dashboard/admin-dashboard.tsx` | **None** | — | — | **Orphan / dead** — superseded |
| `dashboard/agent-dashboard.tsx` | **None** | — | — | **Orphan / dead** — superseded |
| `dashboard/agent-reports-panel.tsx` | Reports page | No | Mixed | CSV/print client-side |
| `dashboard/company-settings-form.tsx` | Settings page | No | Mixed | Logo upload + action |

**Simplify:** Delete or archive orphan admin/agent dashboards; extract shared `MetricCard`.

---

## Properties

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `dashboard/add-property-form.tsx` | Add + Edit pages | Partial | No | **Shell ~479 lines** — orchestration only (Beta Polish 2) |
| `properties/form/property-*-section.tsx` | Add-property form | Yes | Mostly | Basic / location / details / maps / media / owner |
| `properties/form/normalize-property-payload.ts` | Add-property form | Yes | Yes | Payload shaping (no UI) |
| `properties/property-card.tsx` | My properties | Partial | Mixed | Confidential owner block; status actions |
| `properties/public-property-card.tsx` | Search | Partial | Mostly | No owners; shared badge helpers |
| `properties/search-filters.tsx` | Search page | Yes | Mostly | URL search params |

**Simplify:** Further split `property-details-section` if it grows; keep owner section confidential (ADR-001).

---

## Requests

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `requests/add-request-dialog.tsx` | Requests page | No | Mixed | **Shell ~212 lines** — dialog + submit (Beta Polish 2) |
| `requests/form/request-*-fields.tsx` | Add-request dialog | Yes | Mostly | Basic / location / budget / details |
| `requests/request-card.tsx` | Requests page | Yes | Mixed | Calls `manageRequest` |
| `forms/mark-urgent-field.tsx` | Property + request forms | Yes | Yes | Shared urgent switch |
| `forms/urgent-transfer-dialog.tsx` | Property + request forms | Yes | Yes | Shared transfer confirm |
| `ui/empty-state.tsx` | List pages | Yes | Yes | Dashed empty shell |
| `lib/ui/badge-styles.ts` | Cards / urgent | Yes | Yes | Status / urgent / expiry classes |

---

## Tenant admin

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `admin/create-agent-dialog.tsx` | Admin page | No | Mixed | |
| `admin/team-row-actions.tsx` | Admin page | No | Mixed | Password/role/delete |

---

## Super admin

| Component | Used by | R | P | Notes |
|-----------|---------|---|---|-------|
| `super-admin/super-admin-header.tsx` | SA layout | No | Yes | |
| `super-admin/super-admin-sidebar-nav.tsx` | SA layout | No | Yes | |
| `super-admin/super-admin-metric-cards.tsx` | SA home | Partial | Yes | Another MetricCard variant |
| `super-admin/platform-growth-chart.tsx` | SA home | No | Yes | Recharts |
| `super-admin/recent-companies-card.tsx` | SA home | No | Yes | |
| `super-admin/add-company-dialog.tsx` | Companies | No | Mixed | Onboarding |
| `super-admin/company-row-actions.tsx` | Companies | No | Mixed | Large (~334 lines) |
| `super-admin/company-active-toggle.tsx` | Companies | Yes | Mixed | |
| `super-admin/company-quota-fields.tsx` | Dialogs | Yes | Yes | Shared fields |
| `super-admin/package-select-field.tsx` | Dialogs | Yes | Yes | |
| `super-admin/package-pricing-card.tsx` | Packages | Yes | Yes | |
| `super-admin/create-package-dialog.tsx` | Packages | No | Mixed | |
| `super-admin/package-row-actions.tsx` | Packages | No | Mixed | |
| `super-admin/system-settings-form.tsx` | SA settings | No | Mixed | |

---

## `ui/` primitives

button, input, label, textarea, select, checkbox patterns via radio-group, switch, dialog, alert-dialog, sheet, dropdown-menu, popover, command, table, card, badge, avatar, separator, form, chart, input-group, sonner wrapper.

| Note | Detail |
|------|--------|
| **Stay presentational** | Yes — always |
| **`ui/sonner.tsx`** | Likely unused; layouts import `sonner` package directly |
| **Reusable** | Yes, project-wide |

---

## Presentational vs interactive rules

1. Cards that only display listing data should remain presentational except explicit action menus.
2. Forms/dialogs may call Server Actions; keep Zod schemas in `src/types`, not inline.
3. Do not reintroduce orphan dashboard variants — extend `TenantAnalyticsDashboard` instead.
4. Prefer extracting shared status badges and metric tiles before copying UI.

Usage maps → `07_DEPENDENCY_MAP.md`. Debt → `08_CODE_SMELLS.md`.
