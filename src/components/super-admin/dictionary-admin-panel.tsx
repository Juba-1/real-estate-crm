"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { reviewDictionaryEntry } from "@/actions/dictionary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  DictionaryCategory,
  DictionaryEntryRow,
  DictionaryStatus,
} from "@/types/dictionary"

type DictionaryAdminPanelProps = {
  entries: DictionaryEntryRow[]
  initialStatus: DictionaryStatus | "all"
  initialCategory: DictionaryCategory | "all"
}

export function DictionaryAdminPanel({
  entries,
  initialStatus,
  initialCategory,
}: DictionaryAdminPanelProps) {
  const t = useTranslations("dictionary")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [categoryFilter, setCategoryFilter] = useState(initialCategory)
  const [editOpen, setEditOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [active, setActive] = useState<DictionaryEntryRow | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editParent, setEditParent] = useState("")
  const [mergeTargetId, setMergeTargetId] = useState("")

  const approvedTargets = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.status === "approved" &&
          (!active || entry.category === active.category) &&
          entry.id !== active?.id
      ),
    [entries, active]
  )

  function pushFilters(nextStatus: string, nextCategory: string) {
    const params = new URLSearchParams()
    if (nextStatus !== "all") params.set("status", nextStatus)
    if (nextCategory !== "all") params.set("category", nextCategory)
    const query = params.toString()
    router.push(
      query ? `/super-admin/dictionary?${query}` : "/super-admin/dictionary"
    )
  }

  function runAction(
    entry: DictionaryEntryRow,
    action: "approve" | "reject" | "archive" | "delete",
    extra?: { value?: string; parent_value?: string | null }
  ) {
    startTransition(async () => {
      const result = await reviewDictionaryEntry({
        id: entry.id,
        action,
        value: extra?.value,
        parent_value: extra?.parent_value,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(t("toastSuccess"))
      router.refresh()
    })
  }

  function openEdit(entry: DictionaryEntryRow) {
    setActive(entry)
    setEditValue(entry.value)
    setEditParent(entry.parent_value ?? "")
    setEditOpen(true)
  }

  function openMerge(entry: DictionaryEntryRow) {
    setActive(entry)
    setMergeTargetId("")
    setMergeOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            const next = value as DictionaryStatus | "all"
            setStatusFilter(next)
            pushFilters(next, categoryFilter)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("filterStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusAll")}</SelectItem>
            <SelectItem value="pending">{t("statusPending")}</SelectItem>
            <SelectItem value="approved">{t("statusApproved")}</SelectItem>
            <SelectItem value="rejected">{t("statusRejected")}</SelectItem>
            <SelectItem value="archived">{t("statusArchived")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            const next = value as DictionaryCategory | "all"
            setCategoryFilter(next)
            pushFilters(statusFilter, next)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t("filterCategory")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("categoryAll")}</SelectItem>
            <SelectItem value="property_type">{t("categoryPropertyType")}</SelectItem>
            <SelectItem value="city">{t("categoryCity")}</SelectItem>
            <SelectItem value="district">{t("categoryDistrict")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colCategory")}</TableHead>
              <TableHead>{t("colValue")}</TableHead>
              <TableHead>{t("colNormalized")}</TableHead>
              <TableHead>{t("colUsage")}</TableHead>
              <TableHead>{t("colEmployee")}</TableHead>
              <TableHead>{t("colCompany")}</TableHead>
              <TableHead>{t("colCreated")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="text-end">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{t(`category_${entry.category}` as "category_city")}</TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.value}</div>
                    {entry.parent_value ? (
                      <div className="text-xs text-muted-foreground">
                        {t("parentCity")}: {entry.parent_value}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.normalized_value}
                  </TableCell>
                  <TableCell className="tabular-nums">{entry.usage_count}</TableCell>
                  <TableCell>{entry.submitter_name ?? "—"}</TableCell>
                  <TableCell>{entry.company_name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`status_${entry.status}` as "status_pending")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {entry.status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => openEdit(entry)}
                          >
                            {t("actionEdit")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() => runAction(entry, "approve")}
                          >
                            {t("actionApprove")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => openMerge(entry)}
                          >
                            {t("actionMerge")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isPending}
                            onClick={() => runAction(entry, "reject")}
                          >
                            {t("actionReject")}
                          </Button>
                        </>
                      ) : null}
                      {entry.status === "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => runAction(entry, "archive")}
                        >
                          {t("actionArchive")}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => runAction(entry, "delete")}
                      >
                        {t("actionDelete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTitle")}</DialogTitle>
            <DialogDescription>{t("editDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} />
            {active?.category === "district" ? (
              <Input
                value={editParent}
                onChange={(e) => setEditParent(e.target.value)}
                placeholder={t("parentCity")}
              />
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={isPending || !active}
              onClick={() => {
                if (!active) return
                startTransition(async () => {
                  const save = await reviewDictionaryEntry({
                    id: active.id,
                    action: "edit",
                    value: editValue,
                    parent_value: editParent || null,
                  })
                  if (save?.error) {
                    toast.error(save.error)
                    return
                  }
                  const approve = await reviewDictionaryEntry({
                    id: active.id,
                    action: "approve",
                    value: editValue,
                    parent_value: editParent || null,
                  })
                  if (approve?.error) {
                    toast.error(approve.error)
                    return
                  }
                  toast.success(t("toastApproved"))
                  setEditOpen(false)
                  router.refresh()
                })
              }}
            >
              {t("saveAndApprove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mergeTitle")}</DialogTitle>
            <DialogDescription>{t("mergeDescription")}</DialogDescription>
          </DialogHeader>
          <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
            <SelectTrigger>
              <SelectValue placeholder={t("mergeSelect")} />
            </SelectTrigger>
            <SelectContent>
              {approvedTargets.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {target.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              disabled={isPending || !active || !mergeTargetId}
              onClick={() => {
                if (!active || !mergeTargetId) return
                startTransition(async () => {
                  const result = await reviewDictionaryEntry({
                    id: active.id,
                    action: "merge",
                    merge_into_id: mergeTargetId,
                  })
                  if (result?.error) {
                    toast.error(result.error)
                    return
                  }
                  toast.success(t("toastMerged"))
                  setMergeOpen(false)
                  router.refresh()
                })
              }}
            >
              {t("actionMerge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
