/**
 * Authorization predicate mirrored by activate_urgent_* RPCs
 * (20260808150000_fix_urgent_activate_no_private_schema.sql).
 *
 * Kept pure for unit tests — the live path is the SECURITY INVOKER SQL RPC
 * plus assertCanManage* in src/actions/urgent.ts.
 */
export function canActivateUrgentForTarget(params: {
  callerUserId: string
  callerCompanyId: string
  callerRole: string
  targetAgentId: string
  targetCompanyId: string
}): boolean {
  if (params.callerCompanyId !== params.targetCompanyId) {
    return false
  }

  if (params.callerUserId === params.targetAgentId) {
    return true
  }

  return (
    params.callerRole === "admin" || params.callerRole === "super_admin"
  )
}
