"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2Icon, PackageIcon, PlusIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"

import { createPackage } from "@/actions/packages"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  createPackageSchema,
  type CreatePackageInput,
} from "@/types/package"

const defaultValues: CreatePackageInput = {
  name: "",
  maxProperties: 50,
  maxAgents: 3,
}

export function CreatePackageDialog() {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("superAdmin")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")
  const tActions = useTranslations("actions")

  const form = useForm<CreatePackageInput>({
    resolver: zodResolver(createPackageSchema) as Resolver<CreatePackageInput>,
    defaultValues,
  })

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset(defaultValues)
    }
  }

  function onSubmit(values: CreatePackageInput) {
    startTransition(async () => {
      const result = await createPackage(values)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastPackageCreated", { name: values.name }))
      form.reset(defaultValues)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="size-4" />
          {t("createPackage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createPackageTitle")}</DialogTitle>
          <DialogDescription>{t("createPackageDescription")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tFields("packageName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={tPlaceholders("packageName")}
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="maxProperties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("maxProperties")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxAgents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tFields("maxAgents")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                {tActions("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {t("creatingPackage")}
                  </>
                ) : (
                  <>
                    <PackageIcon className="size-4" />
                    {t("createPackage")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
