# 18 — Property Removal Approval (Release 6A)

**Status:** Implemented  
**Scope:** Operational hardening — manager approval before permanent property removal.

## Architecture decision

Prefer a **lightweight `property_removal_requests` table** over soft-delete columns on `properties` or engine changes.

| Decision | Why |
|----------|-----|
| Separate request rows | Clear audit trail (`reason`, `decided_by`, `decided_at`) without changing Identity/Opportunity |
| Property stays active while `pending` | Inventory + search + KPIs unchanged until decision |
| Approve = hard delete | Reuses existing delete semantics; request row kept (`property_id` SET NULL) |
| Archive instead = `status = archived` | Keeps row for reports without inventing a second inventory system |
| Agents cannot call `deleteProperty` | App-layer gate; UI uses Request Removal |
| Admins retain optional hard-delete on My Properties | Escape hatch; primary path is Pending Removals |
| Notify via `notifyCompanyUsers` | No new notification engine; selective recipients |

## Workflow

1. Agent opens **Request Removal** → mandatory reason → insert `pending` request.  
2. Company admins get in-app notification → `/dashboard/removals`.  
3. Admin **Approve** (delete) / **Reject** (notify agent) / **Archive instead** (status archived).  
4. Dashboard shows **Archived** + **Pending removals** counts (app-layer; RPC unchanged).

## Security

- RLS: company-scoped SELECT; INSERT only as self + pending; UPDATE admin + company.  
- Actions: `assertCanManageProperty` on request; admin-only on decide; hard delete admin-only.  
- No service-role for this workflow (notify fan-out still uses existing trusted helper after session binding).

## Migration

`supabase/migrations/20260808120000_property_removal_requests.sql`
