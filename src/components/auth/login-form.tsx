"use client"

import { useActionState } from "react"
import { useTranslations } from "next-intl"

import { login, type LoginState } from "@/app/[locale]/login/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: LoginState = null

type LoginFormProps = {
  inactiveCompany?: boolean
}

export function LoginForm({ inactiveCompany = false }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(login, initialState)
  const t = useTranslations("login")
  const tFields = useTranslations("fields")
  const tPlaceholders = useTranslations("placeholders")

  return (
    <main className="flex min-h-full flex-1 items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{tFields("emailOrUsername")}</Label>
              <Input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                placeholder={tPlaceholders("emailOrUsername")}
                required
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">{tFields("password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                disabled={isPending}
              />
            </div>

            {inactiveCompany ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {t("inactiveCompany")}
              </p>
            ) : null}

            {state?.error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("signingIn") : t("signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
