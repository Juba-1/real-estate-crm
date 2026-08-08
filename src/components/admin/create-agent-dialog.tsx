"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, UserPlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { createCompanyUser } from "@/actions/admin-users"
import { isQuotaExceededResult } from "@/lib/quota"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createCompanyUserSchema,
  type CreateCompanyUserInput,
} from "@/types/admin-user"

const defaultValues: CreateCompanyUserInput = {
  name: "",
  username: "",
  password: "",
  phone: "",
  role: "agent",
}

export function CreateAgentDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("admin")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tRoles = useTranslations("roles")
  const tErrors = useTranslations("errors")

  const form = useForm<CreateCompanyUserInput>({
    resolver: zodResolver(createCompanyUserSchema),
    defaultValues,
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset(defaultValues)
    }
  }

  function onSubmit(values: CreateCompanyUserInput) {
    startTransition(async () => {
      const result = await createCompanyUser(values)

      if (result?.error) {
        if (isQuotaExceededResult(result)) {
          toast.error(tErrors("quotaExceeded"))
          return
        }

        toast.error(result.error)
        return
      }

      toast.success(t("toastUserAdded", { name: values.name }))
      form.reset(defaultValues)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full gap-2 sm:w-auto">
          <UserPlusIcon className="size-4" />
          {t("addTeamMember")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addDialogTitle")}</DialogTitle>
          <DialogDescription>{t("addDialogDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={tPlaceholders("agentName")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("username")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tPlaceholders("username")}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      {...field}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^a-zA-Z0-9]/g, "")
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>{t("usernameHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("password")}</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={tPlaceholders("password")}
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("phoneOptional")}</FormLabel>
                  <FormControl>
                    <Input placeholder={tPlaceholders("phone")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("role")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={tPlaceholders("selectRole")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="agent">{tRoles("agent")}</SelectItem>
                      <SelectItem value="admin">{tRoles("admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {t("creatingAccount")}
                </>
              ) : (
                t("createAccount")
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
