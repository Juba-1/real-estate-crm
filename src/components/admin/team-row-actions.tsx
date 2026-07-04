"use client"

import { useState, useTransition } from "react"
import {
  KeyRoundIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { deleteCompanyUser, updateUserPassword, updateUserRole } from "@/actions/admin-users"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TeamMember } from "@/lib/data/team"
import type { UserRole } from "@/types/user"

type TeamRowActionsProps = {
  user: TeamMember
  currentUserId: string
}

export function TeamRowActions({ user, currentUserId }: TeamRowActionsProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"admin" | "agent">(
    user.role === "admin" ? "admin" : "agent"
  )
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("admin")
  const tActions = useTranslations("actions")
  const tErrors = useTranslations("errors")
  const tCommon = useTranslations("common")

  const isSelf = user.id === currentUserId
  const isSuperAdmin = user.role === "super_admin"
  const canManage = !isSelf && !isSuperAdmin
  const canChangeRole =
    canManage && (user.role === "admin" || user.role === "agent")

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">{tCommon("notAvailable")}</span>
  }

  function handlePasswordUpdate() {
    if (newPassword.length < 6) {
      toast.error(tErrors("passwordMinLength"))
      return
    }

    startTransition(async () => {
      const result = await updateUserPassword(user.id, newPassword)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastPasswordUpdated", { name: user.name }))
      setNewPassword("")
      setPasswordDialogOpen(false)
    })
  }

  function handleRoleDialogOpenChange(open: boolean) {
    setRoleDialogOpen(open)
    if (open) {
      setSelectedRole(user.role === "admin" ? "admin" : "agent")
    }
  }

  function handleRoleUpdate() {
    startTransition(async () => {
      const result = await updateUserRole(user.id, selectedRole)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastRoleUpdated", { name: user.name }))
      setRoleDialogOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCompanyUser(user.id)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastUserDeleted", { name: user.name }))
      setDeleteDialogOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="size-8">
            <MoreHorizontalIcon className="size-4" />
            <span className="sr-only">{t("openActions", { name: user.name })}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canChangeRole ? (
            <DropdownMenuItem onSelect={() => handleRoleDialogOpenChange(true)}>
              <ShieldIcon className="size-4" />
              {t("changeRole")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => setPasswordDialogOpen(true)}>
            <KeyRoundIcon className="size-4" />
            {t("changePassword")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon className="size-4" />
            {t("deleteUser")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("changePasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("changePasswordDescription", { name: user.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={`password-${user.id}`}>{t("newPassword")}</Label>
            <Input
              id={`password-${user.id}`}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={tErrors("passwordMinLength")}
              autoComplete="new-password"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handlePasswordUpdate}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("updatePassword")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={roleDialogOpen} onOpenChange={handleRoleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("changeRoleTitle")}</DialogTitle>
            <DialogDescription>
              {t("changeRoleDescription", { name: user.name })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={`role-${user.id}`}>{t("role")}</Label>
            <Select
              value={selectedRole}
              onValueChange={(value: UserRole) =>
                setSelectedRole(value as "admin" | "agent")
              }
            >
              <SelectTrigger id={`role-${user.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("officeManager")}</SelectItem>
                <SelectItem value="agent">{t("realEstateAgent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleRoleDialogOpenChange(false)}
              disabled={isPending}
            >
              {tActions("cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleRoleUpdate}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("updateRole")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { name: user.name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tActions("cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("deleteUser")
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
