"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { BellIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  getUserNotifications,
  markAllAsRead,
  markNotificationAsRead,
} from "@/actions/notifications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { NotificationRow } from "@/types/notification"

const POLL_INTERVAL_MS = 60_000

function formatNotificationTime(
  createdAt: string,
  locale: string
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(createdAt))
}

export function NotificationsDropdown() {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("notifications")
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [isPending, startTransition] = useTransition()

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const loadNotifications = useCallback(async () => {
    const result = await getUserNotifications()

    if ("error" in result) {
      return
    }

    setNotifications(result.notifications)
  }, [])

  useEffect(() => {
    void loadNotifications()

    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(intervalId)
  }, [loadNotifications])

  useEffect(() => {
    if (open) {
      void loadNotifications()
    }
  }, [open, loadNotifications])

  function handleMarkAllAsRead() {
    startTransition(async () => {
      const result = await markAllAsRead()

      if (result?.error) {
        toast.error(result.error)
        return
      }

      setNotifications((current) =>
        current.map((item) => ({ ...item, is_read: true }))
      )
    })
  }

  function handleNotificationClick(notification: NotificationRow) {
    startTransition(async () => {
      if (!notification.is_read) {
        const result = await markNotificationAsRead(notification.id)

        if (result?.error) {
          toast.error(result.error)
          return
        }

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        )
      }

      if (notification.link_path) {
        setOpen(false)
        router.push(notification.link_path)
      }
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-9"
          aria-label={
            unreadCount > 0
              ? `${t("title")} (${unreadCount})`
              : t("title")
          }
        >
          <BellIcon className="size-4" />
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              className="absolute -end-1 -top-1 flex size-5 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            {t("title")}
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleMarkAllAsRead}
            >
              {t("markAllAsRead")}
            </Button>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="space-y-1 px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <p className="text-xs text-muted-foreground/80">{t("emptyHint")}</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                disabled={isPending}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex w-full flex-col gap-1 border-b border-border/60 px-3 py-3 text-start transition-colors last:border-b-0 hover:bg-muted/50",
                  !notification.is_read && "bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm leading-snug",
                      !notification.is_read
                        ? "font-semibold text-foreground"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {notification.title}
                  </p>
                  {!notification.is_read ? (
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {notification.message}
                </p>
                <p className="text-[11px] text-muted-foreground/80">
                  {formatNotificationTime(notification.created_at, locale)}
                </p>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
