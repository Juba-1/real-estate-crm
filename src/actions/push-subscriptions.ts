"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export type PushSubscriptionActionResult = { error: string } | null

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export async function savePushSubscription(
  subscription: unknown
): Promise<PushSubscriptionActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(subscription)

  if (!parsed.success) {
    return { error: "Invalid push subscription payload." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in to enable push notifications." }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile?.company_id) {
    return {
      error:
        "Your user profile is not set up yet. Contact your office admin.",
    }
  }

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      company_id: profile.company_id,
      endpoint: parsed.data.endpoint,
      subscription: parsed.data,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  )

  if (upsertError) {
    return { error: upsertError.message }
  }

  revalidatePath("/dashboard")
  return null
}

export async function removePushSubscription(
  endpoint: string
): Promise<PushSubscriptionActionResult> {
  if (!endpoint) {
    return { error: "Missing subscription endpoint." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: "You must be signed in." }
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/dashboard")
  return null
}
