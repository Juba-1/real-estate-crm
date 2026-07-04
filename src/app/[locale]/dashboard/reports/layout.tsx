import { redirectTo } from "@/i18n/server-redirect"
import { isRedirectError } from "next/dist/client/components/redirect-error"

import { getCurrentUser } from "@/lib/data/user"

export default async function ReportsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== "admin") {
      await redirectTo("/dashboard")
    }

    return children
  } catch (error) {
    if (isRedirectError(error)) throw error
    await redirectTo("/dashboard")
  }
}
