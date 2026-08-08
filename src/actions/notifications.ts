"use server"

import { createClient } from "@/lib/supabase/server"
import type { NotificationRow } from "@/types/notification"

export type NotificationActionResult = { error: string } | null

export type GetUserNotificationsResult =
  | { error: string }
  | { notifications: NotificationRow[] }

const NOTIFICATION_SELECT =
  "id, title, message, is_read, created_at, link_path" as const
const NOTIFICATION_LIMIT = 30

async function requireAuthenticatedUserId(): Promise<
  { error: string } | { userId: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to view notifications." }
  }

  return { userId: user.id }
}

export async function getUserNotifications(): Promise<GetUserNotificationsResult> {
  const auth = await requireAuthenticatedUserId()
  if ("error" in auth) {
    return auth
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LIMIT)

  if (error) {
    return { error: error.message }
  }

  return { notifications: data ?? [] }
}

export async function markNotificationAsRead(
  id: string
): Promise<NotificationActionResult> {
  const auth = await requireAuthenticatedUserId()
  if ("error" in auth) {
    return auth
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", auth.userId)

  if (error) {
    return { error: error.message }
  }

  // Client dropdown updates local state — avoid full /dashboard RSC refresh.
  return null
}

export async function markAllAsRead(): Promise<NotificationActionResult> {
  const auth = await requireAuthenticatedUserId()
  if ("error" in auth) {
    return auth
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", auth.userId)
    .eq("is_read", false)

  if (error) {
    return { error: error.message }
  }

  // Client dropdown updates local state — avoid full /dashboard RSC refresh.
  return null
}

// createCompanyNotification removed from this Server Actions module.
// Use `@/lib/notifications/notify-company` from trusted server code only.
