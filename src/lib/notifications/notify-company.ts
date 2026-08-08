import "server-only"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type NotifyCompanyResult = { error: string } | null

/**
 * Fan-out in-app notifications to every user in a company.
 *
 * NOT a Server Action — must only be called from trusted server code
 * after the caller has authenticated and proven company membership.
 *
 * Service role is used only for insert fan-out (notifications have no
 * authenticated INSERT RLS). Authorization is mandatory here.
 */
export async function notifyCompanyUsers(params: {
  actorUserId: string
  companyId: string
  title: string
  message: string
  /** When set, only these users (same company) receive the notification. */
  recipientUserIds?: string[]
  linkPath?: string | null
  /** When true, skip inserting a row for the actor (matches push exclude). */
  excludeActor?: boolean
}): Promise<NotifyCompanyResult> {
  const {
    actorUserId,
    companyId,
    title,
    message,
    recipientUserIds,
    linkPath,
    excludeActor = false,
  } = params

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user || user.id !== actorUserId) {
      console.error("[notify] rejected: actor session mismatch")
      return { error: "Unauthorized." }
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("company_id, role")
      .eq("id", actorUserId)
      .maybeSingle()

    if (profileError || !profile) {
      return { error: "Unauthorized." }
    }

    const isSuperAdmin = profile.role === "super_admin"
    if (!isSuperAdmin && profile.company_id !== companyId) {
      console.error("[notify] rejected: company binding failed", {
        actorUserId,
        companyId,
      })
      return { error: "Unauthorized." }
    }

    const adminClient = createAdminClient()

    let userQuery = adminClient
      .from("users")
      .select("id")
      .eq("company_id", companyId)

    if (recipientUserIds && recipientUserIds.length > 0) {
      userQuery = userQuery.in("id", recipientUserIds)
    }

    if (excludeActor) {
      userQuery = userQuery.neq("id", actorUserId)
    }

    const { data: companyUsers, error: usersError } = await userQuery

    if (usersError || !companyUsers?.length) {
      console.log("[notify] dispatch skipped", {
        companyId,
        reason: usersError?.message ?? "no_recipients",
        recipientFilter: recipientUserIds?.length ?? "company",
      })
      return { error: usersError?.message ?? "no_recipients" }
    }

    const rows = companyUsers.map((companyUser) => ({
      company_id: companyId,
      user_id: companyUser.id,
      title,
      message,
      ...(linkPath ? { link_path: linkPath } : {}),
    }))

    const { error: insertError } = await adminClient
      .from("notifications")
      .insert(rows)

    if (insertError) {
      console.error("[notify] insert failed", {
        companyId,
        message: insertError.message,
        recipientCount: rows.length,
      })
      return { error: insertError.message }
    }

    console.log("[notify] dispatch ok", {
      companyId,
      recipientCount: rows.length,
      hasLink: Boolean(linkPath),
    })

    revalidatePath("/dashboard")
    return null
  } catch (error) {
    console.error("[notify] crashed", error)
    // Notifications must never block the primary business action.
    return { error: "notify_crashed" }
  }
}

/** @deprecated Use notifyCompanyUsers — kept name for call-site clarity in migrations of imports. */
export async function createCompanyNotification(
  companyId: string,
  title: string,
  message: string,
  actorUserId: string
): Promise<void> {
  await notifyCompanyUsers({
    actorUserId,
    companyId,
    title,
    message,
  })
}
